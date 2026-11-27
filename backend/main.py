from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, BackgroundTasks, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional
import os
import shutil
from dotenv import load_dotenv
import hashlib

load_dotenv()

from models.database import get_db, FileRecord, ArchivedFile
from services.etl_service import process_and_load_csv
from services.analytics_engine import get_overview_data, get_cashflow_data

# 1. Import your secure token decoder
from api.auth import router as auth_router, get_current_user_id 
from api.chat import router as chat_router
from api.inventory import router as inventory_router
from api.insights import router as insights_router
from api.bam import router as bam_router

app = FastAPI()

# Allow all origins and any vercel preview/production domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r".*",
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# 2. Lock the upload route to require a token, and use the real user ID
import uuid

def background_process_file(file_location: str, user_id: int, file_id: int, filename: str):
    from models.database import SessionLocal, FileRecord, Transaction
    db = SessionLocal()
    try:
        lower_name = filename.lower()
        if lower_name.endswith('.csv'):
            from services.etl_service import process_and_load_csv
            process_and_load_csv(file_location, user_id=user_id, file_id=file_id)
        elif lower_name.endswith(('.pdf', '.txt')):
            from services.vector_service import process_document
            process_document(file_location, user_id=user_id)
        else:
            raise ValueError("Unsupported file type. Please upload .csv, .pdf, or .txt.")
        
        # update status
        record = db.query(FileRecord).filter(FileRecord.id == file_id).first()
        if record:
            record.status = "completed"
            record.error_message = None
            db.commit()
    except Exception as e:
        import traceback
        traceback.print_exc()
        db.rollback()
        try:
            # Remove any partially committed transactions from this failed file
            db.query(Transaction).filter(Transaction.file_id == file_id).delete()
            record = db.query(FileRecord).filter(FileRecord.id == file_id).first()
            if record:
                record.status = "failed"
                record.error_message = str(e)[:500]
            db.commit()
        except Exception:
            db.rollback()
    finally:
        if os.path.exists(file_location):
            try:
                os.remove(file_location)
            except Exception:
                pass
        db.close()

@app.post("/api/upload")
def upload_data(file: UploadFile = File(...), background_tasks: BackgroundTasks = BackgroundTasks(), user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    filename = file.filename or "dataset.csv"
    if not filename.lower().endswith(('.csv', '.pdf', '.txt')):
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload a .csv, .pdf, or .txt file.")

    # Generate unique and safe filename to prevent traversal and race conditions
    safe_filename = "".join(c for c in filename if c.isalnum() or c in "._-")
    file_location = f"temp_{uuid.uuid4().hex}_{safe_filename}"
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object)

    if os.path.getsize(file_location) == 0:
        os.remove(file_location)
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    
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

    # Clean up any stale failed record with the same hash/filename so retries start fresh
    db.query(FileRecord).filter(
        FileRecord.user_id == user_id,
        FileRecord.file_hash == file_hash,
        FileRecord.status == "failed"
    ).delete()
    
    # Save the record in "processing" state
    new_record = FileRecord(user_id=user_id, file_hash=file_hash, filename=filename, status="processing")
    db.add(new_record)
    db.commit()
    db.refresh(new_record)
    
    # Queue the background processing!
    background_tasks.add_task(background_process_file, file_location, user_id, new_record.id, filename)
    
    return {"status": "Processing", "message": "File is successfully queued in the background.", "file_id": new_record.id}

@app.get("/api/user/profile")
def get_user_profile(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    try:
        from models.database import User, FileRecord
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        files = []
        try:
            files = db.query(FileRecord).filter(FileRecord.user_id == user_id).all()
        except Exception:
            db.rollback()

        transaction_count = 0
        try:
            from models.database import Transaction
            transaction_count = db.query(Transaction).filter(Transaction.user_id == user_id).count()
        except Exception:
            db.rollback()

        connected_integrations = 0
        try:
            from models.database import IntegrationSetting
            connected_integrations = db.query(IntegrationSetting).filter(
                IntegrationSetting.user_id == user_id,
                IntegrationSetting.is_connected == 1
            ).count()
        except Exception:
            db.rollback()

        created_at_val = None
        try:
            if hasattr(user, "created_at") and user.created_at:
                created_at_val = user.created_at.isoformat()
        except Exception:
            pass

        return {
            "email": user.email,
            "full_name": getattr(user, "full_name", None),
            "company": getattr(user, "company", None),
            "created_at": created_at_val,
            "transaction_count": transaction_count,
            "connected_integrations": connected_integrations,
            "files": [
                {
                    "id": f.id,
                    "filename": f.filename,
                    "status": f.status,
                    "error_message": getattr(f, "error_message", None)
                }
                for f in files
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to fetch profile: {str(e)}")

@app.patch("/api/user/profile")
def update_user_profile(req: dict, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    from models.database import User
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if "full_name" in req:
        user.full_name = (req["full_name"] or "").strip() or None
    if "company" in req:
        user.company = (req["company"] or "").strip() or None
    db.commit()
    return {"status": "updated", "full_name": user.full_name, "company": user.company}

@app.delete("/api/user/files/{file_id}")
def delete_user_file(file_id: int, user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    from models.database import Transaction, IntegrationSetting
    from services.archive_service import archive_file_transactions
    file_record = db.query(FileRecord).filter(FileRecord.id == file_id, FileRecord.user_id == user_id).first()
    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")
    
    # 1. Preserve the file's transaction snapshot in the hidden developer archive
    try:
        archive_file_transactions(db, file_record, user_id)
    except Exception as e:
        print(f"Archive notice: {e}")
    
    # 2. Delete associated transactions
    db.query(Transaction).filter(Transaction.file_id == file_id).delete()
    
    # 3. Delete the file record
    db.delete(file_record)
    db.commit()

    # If no files remain and no integrations connected, purge any unlinked transactions
    remaining_files = db.query(FileRecord).filter(FileRecord.user_id == user_id).count()
    connected_integrations = db.query(IntegrationSetting).filter(
        IntegrationSetting.user_id == user_id,
        IntegrationSetting.is_connected == 1
    ).count()
    if remaining_files == 0 and connected_integrations == 0:
        db.query(Transaction).filter(Transaction.user_id == user_id).delete()
        db.commit()

    return {"status": "Success", "message": "File and its data deleted."}

@app.post("/api/user/reset-workspace")
def reset_user_workspace(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    """Purges all transactions, file records, and alerts for the user so workspace is a fresh clean slate."""
    from models.database import Transaction, AlertNotification, IntegrationSetting
    from services.archive_service import archive_all_user_transactions
    
    # Preserve everything the user is about to lose into the hidden developer archive
    try:
        archive_all_user_transactions(db, user_id, reason="workspace-reset")
    except Exception as e:
        print(f"Archive notice: {e}")
    
    db.query(Transaction).filter(Transaction.user_id == user_id).delete()
    db.query(FileRecord).filter(FileRecord.user_id == user_id).delete()
    db.query(AlertNotification).filter(AlertNotification.user_id == user_id).delete()
    db.query(IntegrationSetting).filter(IntegrationSetting.user_id == user_id).update({"is_connected": 0})
    db.commit()
    return {"status": "Success", "message": "All workspace data and transactions purged."}

# Developer-only: view hidden archive of deleted files / workspace resets.
# Requires header: X-Developer-Key: <your DEVELOPER_KEY from backend/.env>
@app.get("/api/developer/archive")
def developer_view_archive(
    x_developer_key: str = Header(default="", alias="X-Developer-Key"),
    user_id: Optional[int] = Query(None, description="Filter by user id"),
    db: Session = Depends(get_db),
):
    from services.archive_service import is_developer_authorized, archive_to_dict

    if not is_developer_authorized(x_developer_key):
        raise HTTPException(status_code=403, detail="Developer key required")

    query = db.query(ArchivedFile)
    if user_id is not None:
        query = query.filter(ArchivedFile.user_id == user_id)
    records = query.order_by(ArchivedFile.deleted_at.desc()).all()
    return {"count": len(records), "archives": [archive_to_dict(r) for r in records]}

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
app.include_router(bam_router)