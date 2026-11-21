from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import func
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel, Field
import bcrypt
import os
import requests
import uuid

from models.database import get_db, User

# Security Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-bi-key")
ALGORITHM = "HS256"
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "686074278877-g6gnoercim8pevjs4mqtkdn3pplhuhbb.apps.googleusercontent.com")

security = HTTPBearer()
router = APIRouter()

from typing import Optional

class UserAuth(BaseModel):
    email: str = Field(..., pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", description="Valid email address")
    password: str

class UserRegister(UserAuth):
    full_name: Optional[str] = None
    company: Optional[str] = None

class GoogleAuthRequest(BaseModel):
    credential: str

def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return int(user_id)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/api/auth/register")
def register(user: UserRegister, db: Session = Depends(get_db)):
    # 1. Check if user already exists
    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # 2. Hash the password
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(user.password.encode('utf-8'), salt).decode('utf-8')
    
    # 3. Save to database
    new_user = User(email=user.email, hashed_password=hashed_password, full_name=user.full_name, company=user.company)
    db.add(new_user)
    db.commit()
    return {"message": "Account created successfully"}

@router.post("/api/auth/login")
def login(user: UserAuth, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    
    if not db_user or not bcrypt.checkpw(user.password.encode('utf-8'), db_user.hashed_password.encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = jwt.encode(
        {"sub": str(db_user.id), "exp": datetime.now(timezone.utc) + timedelta(days=1)}, 
        SECRET_KEY, 
        algorithm=ALGORITHM
    )
    return {"access_token": token, "user_id": db_user.id}

@router.post("/api/auth/google")
def google_auth(req: GoogleAuthRequest, db: Session = Depends(get_db)):
    try:
        # Verify token directly with Google's public endpoint
        res = requests.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={req.credential}", timeout=10)
        if res.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid Google token")
        
        payload = res.json()
        
        # Verify audience matches our Client ID
        if payload.get("aud") != GOOGLE_CLIENT_ID:
            raise HTTPException(status_code=401, detail="Google Client ID mismatch")
            
        email = payload.get("email")
        if not email:
            raise HTTPException(status_code=400, detail="Google token does not contain an email")
            
        full_name = payload.get("name")
        
        # Check if user already exists
        db_user = db.query(User).filter(User.email == email).first()
        if not db_user:
            # Create user for first-time Google sign-in
            salt = bcrypt.gensalt()
            random_pw = bcrypt.hashpw(str(uuid.uuid4()).encode('utf-8'), salt).decode('utf-8')
            db_user = User(
                email=email,
                hashed_password=random_pw,
                full_name=full_name,
                company=None
            )
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
            
        token = jwt.encode(
            {"sub": str(db_user.id), "exp": datetime.now(timezone.utc) + timedelta(days=1)}, 
            SECRET_KEY, 
            algorithm=ALGORITHM
        )
        return {"access_token": token, "user_id": db_user.id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Google sign-in error: {str(e)}")
