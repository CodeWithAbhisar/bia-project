import json, os, bcrypt
from jose import jwt
from datetime import datetime, timedelta, timezone
from ..lib.database import SessionLocal, User

SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-bi-key")
ALGORITHM = "HS256"

def handler(event, context):
    try:
        body = json.loads(event.get('body', '{}'))
        email = body.get('email')
        password = body.get('password')
        full_name = body.get('full_name')
        company = body.get('company')
        if not email or not password:
            raise ValueError('email and password required')
        db = SessionLocal()
        try:
            # check existing
            if db.query(User).filter(User.email == email).first():
                return {"statusCode": 400, "body": json.dumps({"detail": "Email already registered"})}
            # hash password
            salt = bcrypt.gensalt()
            hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
            new_user = User(email=email, hashed_password=hashed_password, full_name=full_name, company=company)
            db.add(new_user)
            db.commit()
            return {"statusCode": 200, "body": json.dumps({"message": "Account created successfully"})}
        finally:
            db.close()
    except Exception as e:
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}
