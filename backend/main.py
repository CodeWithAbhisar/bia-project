from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os
import shutil
from dotenv import load_dotenv
import hashlib

load_dotenv()

from models.database import get_db, FileRecord
from services.etl_service import process_and_load_csv
from services.analytics_engine import get_overview_data, get_cashflow_data

# 1. Import your secure token decoder
from api.auth import router as auth_router, get_current_user_id 
from api.chat import router as chat_router
from api.inventory import router as inventory_router
from api.insights import router as insights_router

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# 2. Lock the upload route to require a token, and use the real user ID
import uuid

def background_process_file(file_location: str, user_id: int, file_id: int, filename: str):
    from models.database import SessionLocal, FileRecord
    db = SessionLocal()
    try:
        if filename.lower().endswith('.csv'):
            from services.etl_service import process_and_load_csv
            process_and_load_csv(file_location, user_id=user_id, file_id=file_id)
        elif filename.lower().endswith(('.pdf', '.txt')):
            from services.vector_service import process_document
            process_document(file_location, user_id=user_id)
        else:
            raise ValueError("Unsupported file type")
        
        # update status
        record = db.query(FileRecord).filter(FileRecord.id == file_id).first()
        if record:
            record.status = "completed"
            db.commit()
    except Exception as e:
        record = db.query(FileRecord).filter(FileRecord.id == file_id).first()
        if record:
            record.status = "failed"
            db.commit()
    finally:
        if os.path.exists(file_location):
            os.remove(file_location)
        db.close()

@app.post("/api/upload")
def upload_data(file: UploadFile = File(...), background_tasks: BackgroundTasks = BackgroundTasks(), user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    # Generate unique and safe filename to prevent traversal and race conditions
    safe_filename = "".join(c for c in file.filename if c.isalnum() or c in "._-")
    file_location = f"temp_{uuid.uuid4().hex}_{safe_filename}"
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)
    
    # Calculate file hash to prevent duplicates
    sha256_hash = hashlib.sha256()
    with open(file_location, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    file_hash = sha256_hash.hexdigest()
    
    # Check if this exact file was already successfully uploaded by this user
    existing_file = db.query(FileRecord).filter(
        FileRecord.user_id == user_id, 
        FileRecord.file_hash == file_hash,
        FileRecord.status != "failed"
    ).first()
    
    if existing_file:
        os.remove(file_location)
        raise HTTPException(status_code=400, detail="This exact file has already been uploaded.")
    
    # Save the record in "processing" state
    new_record = FileRecord(user_id=user_id, file_hash=file_hash, filename=file.filename, status="processing")
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    
    # Queue the background processing!
    background_tasks.add_task(background_process_file, file_location, user_id, new_record.id, file.filename)
    
    return {"status": "Processing", "message": "File is successfully queued in the background.", "file_id": new_record.id}

@app.get("/api/user/profile")
def get_user_profile(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    from models.database import User
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    files = db.query(FileRecord).filter(FileRecord.user_id == user_id).all()
    return {
        "email": user.email,
        "files": [{"id": f.id, "filename": f.filename, "status": f.status} for f in files]
    }

@app.delete("/api/user/files/{file_id}")
def delete_user_file(file_id: int, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    from models.database import Transaction
    file_record = db.query(FileRecord).filter(FileRecord.id == file_id, FileRecord.user_id == user_id).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Delete associated transactions
    db.query(Transaction).filter(Transaction.file_id == file_id).delete()
    
    # Delete the file record
    db.delete(file_record)
    db.commit()
    return {"status": "Success", "message": "File and its data deleted."}

# 3. Lock the data routes
@app.get("/api/analytics/overview")
def overview(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    return get_overview_data(db, user_id=user_id)

@app.get("/api/analytics/cashflow")
def cashflow(db: Session = Depends(get_db), user_id: int = Depends(get_current_user_id)):
    return get_cashflow_data(db, user_id=user_id)

app.include_router(chat_router)
app.include_router(inventory_router)
app.include_router(insights_router)
app.include_router(auth_router)