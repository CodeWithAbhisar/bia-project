from fastapi import FastAPI, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional
import os
import re
import gzip
import shutil
import time
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
            process_document(file_location, user_id=user_id, file_id=file_id)
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


def _cleanup_stale_part_files():
    """Removes abandoned chunked upload staging files/dirs older than 2 hours."""
    now = time.time()
    try:
        for entry in os.listdir("."):
            if entry.startswith("temp_upload_") and now - os.path.getmtime(entry) > 7200:
                if os.path.isdir(entry):
                    shutil.rmtree(entry, ignore_errors=True)
                else:
                    os.remove(entry)
    except Exception:
        pass


def _enqueue_uploaded_file(file_location: str, filename: str, user_id: int, background_tasks: BackgroundTasks, db: Session):
    if not os.path.exists(file_location) or os.path.getsize(file_location) == 0:
        if os.path.exists(file_location):
            os.remove(file_location)
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    sha256_hash = hashlib.sha256()
    with open(file_location, "rb") as f:
        for byte_block in iter(lambda: f.read(65536), b""):
            sha256_hash.update(byte_block)
    file_hash = sha256_hash.hexdigest()

    existing_file = db.query(FileRecord).filter(
        FileRecord.user_id == user_id,
        FileRecord.file_hash == file_hash,
        FileRecord.status != "failed",
    ).first()

    if existing_file:
        os.remove(file_location)
        raise HTTPException(status_code=400, detail="This exact file has already been uploaded.")

    db.query(FileRecord).filter(
        FileRecord.user_id == user_id,
        FileRecord.file_hash == file_hash,
        FileRecord.status == "failed",
    ).delete()

    new_record = FileRecord(user_id=user_id, file_hash=file_hash, filename=filename, status="processing", rows_loaded=0)
    db.add(new_record)
    db.commit()
    db.refresh(new_record)

    background_tasks.add_task(background_process_file, file_location, user_id, new_record.id, filename)
    return {"status": "Processing", "message": "File is successfully queued in the background.", "file_id": new_record.id}


@app.post("/api/upload/init")
def init_chunked_upload(req: dict, user_id: int = Depends(get_current_user_id)):
    _cleanup_stale_part_files()
    filename = str(req.get("filename") or "").strip()
    total_size = int(req.get("total_size") or 0)
    if not filename or not filename.lower().endswith(('.csv', '.pdf', '.txt')):
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload a .csv, .pdf, or .txt file.")
    if total_size <= 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    upload_id = uuid.uuid4().hex
    stage_dir = f"temp_upload_{user_id}_{upload_id}"
    os.makedirs(stage_dir, exist_ok=True)
    return {"upload_id": upload_id}


@app.post("/api/upload/chunk")
def upload_file_chunk(
    upload_id: str = Form(...),
    chunk_index: int = Form(...),
    chunk: UploadFile = File(...),
    user_id: int = Depends(get_current_user_id),
):
    if not re.fullmatch(r"[a-fA-F0-9]{16,64}", upload_id) or chunk_index < 0:
        raise HTTPException(status_code=400, detail="Invalid upload session.")
    stage_dir = f"temp_upload_{user_id}_{upload_id}"
    if not os.path.isdir(stage_dir):
        raise HTTPException(status_code=404, detail="Upload session expired or not found.")

    # Idempotent per-chunk write: retries overwrite the exact chunk slot safely
    chunk_path = os.path.join(stage_dir, f"chunk_{chunk_index:06d}.part")
    tmp_chunk_path = f"{chunk_path}.tmp"
    with open(tmp_chunk_path, "wb") as dest:
        shutil.copyfileobj(chunk.file, dest, length=65536)
    os.replace(tmp_chunk_path, chunk_path)

    return {"status": "received", "chunk_index": chunk_index}


@app.post("/api/upload/complete")
def complete_chunked_upload(
    req: dict,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    upload_id = str(req.get("upload_id") or "")
    filename = str(req.get("filename") or "dataset.csv").strip()
    is_gzip = bool(req.get("is_gzip", False))
    expected_chunks = req.get("total_chunks")

    if not re.fullmatch(r"[a-fA-F0-9]{16,64}", upload_id):
        raise HTTPException(status_code=400, detail="Invalid upload session.")
    if not filename.lower().endswith(('.csv', '.pdf', '.txt')):
        raise HTTPException(status_code=400, detail="Unsupported file format.")

    stage_dir = f"temp_upload_{user_id}_{upload_id}"
    if not os.path.isdir(stage_dir):
        raise HTTPException(status_code=404, detail="Upload staging directory not found.")

    part_files = sorted(f for f in os.listdir(stage_dir) if f.startswith("chunk_") and f.endswith(".part"))
    if not part_files or (expected_chunks is not None and len(part_files) != int(expected_chunks)):
        shutil.rmtree(stage_dir, ignore_errors=True)
        raise HTTPException(status_code=400, detail="Upload incomplete: missing one or more file chunks.")

    safe_filename = "".join(c for c in filename if c.isalnum() or c in "._-")
    final_path = f"temp_{uuid.uuid4().hex}_{safe_filename}"

    try:
        if is_gzip:
            gz_path = f"{final_path}.gz"
            with open(gz_path, "wb") as gz_out:
                for pf in part_files:
                    with open(os.path.join(stage_dir, pf), "rb") as src:
                        shutil.copyfileobj(src, gz_out, length=65536)
            shutil.rmtree(stage_dir, ignore_errors=True)

            with gzip.open(gz_path, "rb") as gz_in, open(final_path, "wb") as raw_out:
                shutil.copyfileobj(gz_in, raw_out, length=65536)
            os.remove(gz_path)
        else:
            with open(final_path, "wb") as raw_out:
                for pf in part_files:
                    with open(os.path.join(stage_dir, pf), "rb") as src:
                        shutil.copyfileobj(src, raw_out, length=65536)
            shutil.rmtree(stage_dir, ignore_errors=True)
    except Exception as exc:
        shutil.rmtree(stage_dir, ignore_errors=True)
        for p in (final_path, f"{final_path}.gz"):
            if os.path.exists(p):
                os.remove(p)
        raise HTTPException(status_code=400, detail=f"Failed to assemble uploaded file: {exc}")

    return _enqueue_uploaded_file(final_path, filename, user_id, background_tasks, db)


@app.post("/api/upload")
def upload_data(file: UploadFile = File(...), background_tasks: BackgroundTasks = BackgroundTasks(), user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    filename = file.filename or "dataset.csv"
    if not filename.lower().endswith(('.csv', '.pdf', '.txt')):
        raise HTTPException(status_code=400, detail="Unsupported file format. Please upload a .csv, .pdf, or .txt file.")

    safe_filename = "".join(c for c in filename if c.isalnum() or c in "._-")
    file_location = f"temp_{uuid.uuid4().hex}_{safe_filename}"
    with open(file_location, "wb+") as file_object:
        shutil.copyfileobj(file.file, file_object, length=65536)

    return _enqueue_uploaded_file(file_location, filename, user_id, background_tasks, db)

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
                    "error_message": getattr(f, "error_message", None),
                    "rows_loaded": getattr(f, "rows_loaded", 0) or 0,
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