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
import random
import re

from models.database import get_db, User, EmailOTP
from services.email_service import send_otp_email

# Security Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-bi-key")
ALGORITHM = "HS256"
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "686074278877-g6gnoercim8pevjs4mqtkdn3pplhuhbb.apps.googleusercontent.com")

security = HTTPBearer()
router = APIRouter()

from typing import Optional

def validate_password_strength(password: str) -> None:
    if not password or len(password) < 8:
        raise HTTPException(
            status_code=400, 
            detail="Password must be at least 8 characters long."
        )
    if not re.search(r"[A-Z]", password):
        raise HTTPException(
            status_code=400, 
            detail="Password must contain at least one uppercase letter (A-Z)."
        )
    if not re.search(r"[a-z]", password):
        raise HTTPException(
            status_code=400, 
            detail="Password must contain at least one lowercase letter (a-z)."
        )
    if not re.search(r"\d", password):
        raise HTTPException(
            status_code=400, 
            detail="Password must contain at least one number (0-9)."
        )
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>\-_=+[\];/~`]", password):
        raise HTTPException(
            status_code=400, 
            detail="Password must contain at least one special character (!@#$%^&*...)."
        )

class UserAuth(BaseModel):
    email: str = Field(..., pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", description="Valid email address")
    password: str

class UserRegister(UserAuth):
    full_name: Optional[str] = None
    company: Optional[str] = None

class GoogleAuthRequest(BaseModel):
    credential: str

class SendOTPRequest(BaseModel):
    email: str = Field(..., pattern=r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$", description="Valid email address")

class VerifyOTPRequest(BaseModel):
    email: str
    otp: str
    password: str
    full_name: Optional[str] = None
    company: Optional[str] = None

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
    # 0. Validate strong password requirements
    validate_password_strength(user.password)

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

@router.post("/api/auth/create-otp")
def create_otp(req: SendOTPRequest, db: Session = Depends(get_db)):
    email = req.email.lower().strip()
    
    # 1. Check if user already exists
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    
    # 2. Generate 6-digit random code
    otp = f"{random.randint(100000, 999999)}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    # 3. Clean up older OTPs for this email and save new one
    db.query(EmailOTP).filter(EmailOTP.email == email).delete()
    new_otp = EmailOTP(email=email, otp=otp, expires_at=expires_at)
    db.add(new_otp)
    db.commit()
    
    return {"otp": otp}

@router.post("/api/auth/send-otp")
def send_otp(req: SendOTPRequest, db: Session = Depends(get_db)):
    email = req.email.lower().strip()
    
    # 1. Check if user already exists
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    
    # 2. Generate 6-digit random code
    otp = f"{random.randint(100000, 999999)}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    # 3. Clean up older OTPs for this email and save new one
    db.query(EmailOTP).filter(EmailOTP.email == email).delete()
    new_otp = EmailOTP(email=email, otp=otp, expires_at=expires_at)
    db.add(new_otp)
    db.commit()
    
    # 4. Send the verification email via Gmail SMTP
    success, err_msg = send_otp_email(email, otp)
    if not success:
        raise HTTPException(status_code=500, detail=f"Failed to deliver verification code: {err_msg}")
        
    return {"message": "Verification code sent to your email."}

@router.post("/api/auth/verify-otp")
def verify_otp(req: VerifyOTPRequest, db: Session = Depends(get_db)):
    email = req.email.lower().strip()
    otp_code = req.otp.strip()
    
    # 0. Validate strong password requirements
    validate_password_strength(req.password)
    
    # 1. Check if user already exists
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered.")
        
    # 2. Find and validate OTP
    record = db.query(EmailOTP).filter(EmailOTP.email == email, EmailOTP.otp == otp_code).first()
    if not record:
        raise HTTPException(status_code=400, detail="Invalid verification code. Please double-check the code sent to your email.")
        
    # 3. Check expiration
    exp = record.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        db.delete(record)
        db.commit()
        raise HTTPException(status_code=400, detail="Verification code has expired. Please request a new one.")
        
    # 4. Delete used OTP
    db.delete(record)
    
    # 5. Create new user
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(req.password.encode('utf-8'), salt).decode('utf-8')
    new_user = User(
        email=email,
        hashed_password=hashed_password,
        full_name=req.full_name,
        company=req.company
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    token = jwt.encode(
        {"sub": str(new_user.id), "exp": datetime.now(timezone.utc) + timedelta(days=1)}, 
        SECRET_KEY, 
        algorithm=ALGORITHM
    )
    return {"access_token": token, "user_id": new_user.id}
