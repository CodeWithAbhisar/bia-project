import json, os, base64
from jose import jwt, JWTError
from datetime import timezone
from ..lib.database import SessionLocal, Transaction, User
from services.sarvam_client import generate_response_stream

SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-bi-key")
ALGORITHM = "HS256"

def _get_user_id(event):
    # Vercel provides headers in lower-case keys
    headers = event.get('headers', {})
    auth = headers.get('authorization') or headers.get('Authorization')
    if not auth or not auth.startswith('Bearer '):
        raise Exception('Missing or malformed Authorization header')
    token = auth.split(' ', 1)[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return int(payload.get('sub'))
    except JWTError:
        raise Exception('Invalid token')

def handler(event, context):
    """Chat endpoint compatible with Vercel.
    Expects JSON body with `message` (str) and optional `history` (list of {role, text}).
    Returns a streaming response (text/event-stream) via Vercel's Serverless Functions.
    """
    try:
        body = json.loads(event.get('body') or '{}')
        message = body.get('message')
        history = body.get('history', [])
        if not message:
            return {"statusCode": 400, "body": json.dumps({"error": "Missing message"})}
        user_id = _get_user_id(event)
        db = SessionLocal()
        try:
            # Gather transaction data similar to original backend
            transactions = db.query(Transaction).filter(Transaction.user_id == user_id).all()
            if not transactions:
                data_context = "No transaction data has been uploaded yet."
            else:
                total_rev = sum(t.amount or 0 for t in transactions)
                total_rows = len(transactions)
                categories = {}
                for t in transactions:
                    cat = t.category or "Uncategorized"
                    categories[cat] = categories.get(cat, 0) + (t.amount or 0)
                cat_summary = ", ".join([f"{k}: ${round(v,2)}" for k,v in categories.items()])
                raw_metrics = {}
                original_columns = []
                if transactions[0].raw_data:
                    original_columns = list(transactions[0].raw_data.keys())
                    for t in transactions:
                        if t.raw_data:
                            for k,v in t.raw_data.items():
                                if isinstance(v, (int,float)):
                                    raw_metrics[k] = raw_metrics.get(k,0)+v
                raw_summary = ", ".join([f"Total {k}: {round(v,2)}" for k,v in raw_metrics.items()])
                # Simple context string (could be expanded with analytics, inventory, etc.)
                data_context = (f"Current Dataset Summary:\n"
                                f"- Total Records: {total_rows}\n"
                                f"- Revenue by Category: {cat_summary}\n"
                                f"- Original Columns: {', '.join(original_columns)}\n"
                                f"- Raw Data Totals: {raw_summary}\n")
            # Build prompt
            system_prompt = f"""You are an executive Business Intelligence assistant. Answer the user based on the following data context.\n\n{data_context}\nUser question: {message}\n"""
            # Vercel streaming response expects an iterator of strings
            def stream():
                for chunk in generate_response_stream(system_prompt):
                    yield chunk
            return {
                "statusCode": 200,
                "body": "",  # body ignored for streaming
                "isBase64Encoded": False,
                "headers": {"Content-Type": "text/event-stream"},
                "streamingResponse": stream()
            }
        finally:
            db.close()
    except Exception as e:
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}
