import json, os
from ..lib.database import SessionLocal
from services.analytics_engine import get_cashflow_data

def handler(event, context):
    """Return cashflow analytics for a given user.
    Expected query parameters: `user_id` (int).
    """
    try:
        query = event.get('queryStringParameters') or {}
        if isinstance(query, str):
            # Vercel may give raw query string
            from urllib.parse import parse_qs
            query = parse_qs(query)
        user_id = int(query.get('user_id')[0] if isinstance(query.get('user_id'), list) else query.get('user_id'))
        db = SessionLocal()
        try:
            result = get_cashflow_data(db, user_id)
            return {
                "statusCode": 200,
                "body": json.dumps(result),
                "headers": {"Content-Type": "application/json"},
            }
        finally:
            db.close()
    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)}),
            "headers": {"Content-Type": "application/json"},
        }
