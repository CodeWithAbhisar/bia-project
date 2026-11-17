import json, os, bcrypt
from jose import jwt
from datetime import datetime, timezone, timedelta
from ..lib.database import SessionLocal, User

SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-bi-key")
ALGORITHM = "HS256"

def handler(event, context):
    try:
        body = json.loads(event.get('body', '{}'))
        email = body.get('email')
        password = body.get('password')
        if not email or not password:
            raise ValueError('email and password required')
        db = SessionLocal()
        try:
            db_user = db.query(User).filter(User.email == email).first()
            if not db_user or not bcrypt.checkpw(password.encode('utf-8'), db_user.hashed_password.encode('utf-8')):
                return {"statusCode": 401, "body": json.dumps({"detail": "Invalid credentials"})}
            token = jwt.encode({
                "sub": str(db_user.id),
                "exp": datetime.now(timezone.utc) + timedelta(days=1)
            }, SECRET_KEY, algorithm=ALGORITHM)
            return {"statusCode": 200, "body": json.dumps({"access_token": token, "user_id": db_user.id})}
        finally:
            db.close()
    except Exception as e:
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}
