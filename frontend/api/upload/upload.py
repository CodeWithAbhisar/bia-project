import json, base64, os
from ..lib.database import SessionLocal, FileRecord

def handler(event, context):
    """Accept a JSON payload with base64‑encoded file content.
    Expected keys: `file_name`, `file_content` (base64 string), `user_id`.
    Saves the file to a temporary `uploads/` folder and records it in the DB.
    """
    try:
        body = json.loads(event.get('body', '{}'))
        file_name = body.get('file_name')
        file_content = body.get('file_content')
        user_id = body.get('user_id')
        if not all([file_name, file_content, user_id]):
            return {"statusCode": 400, "body": json.dumps({"error": "Missing required fields"})}

        # Decode and write the file
        data = base64.b64decode(file_content)
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, file_name)
        with open(file_path, "wb") as f:
            f.write(data)

        # Insert a record into the database (hash placeholder for now)
        db = SessionLocal()
        try:
            record = FileRecord(user_id=int(user_id), file_hash="placeholder", filename=file_name, status="completed")
            db.add(record)
            db.commit()
        finally:
            db.close()

        return {"statusCode": 200, "body": json.dumps({"message": "File uploaded successfully"})}
    except Exception as e:
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}
