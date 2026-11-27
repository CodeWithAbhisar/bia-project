"""Developer-only data archive.

When a user deletes a file or resets their workspace, the raw transaction
snapshot is preserved here so the developer can recover/inspect it later.
Users never see this data — it is fully invisible to the product surface
and only reachable through the developer endpoint with a secret key.
"""
import os
import json
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from models.database import ArchivedFile, Transaction

# Set this in backend/.env (never committed) to unlock the developer endpoint.
DEVELOPER_KEY = os.getenv("DEVELOPER_KEY", "")


MAX_ARCHIVE_ROWS = 20000


def _stream_snapshot(query):
    total_count = 0
    payload = []
    for tx in query.execution_options(stream_results=True).yield_per(2000):
        total_count += 1
        if len(payload) < MAX_ARCHIVE_ROWS:
            payload.append({
                "date": tx.date,
                "amount": tx.amount,
                "category": tx.category,
                "product_sku": tx.product_sku,
                "customer_id": tx.customer_id,
                "raw_data": tx.raw_data,
            })
    return total_count, payload


def archive_file_transactions(db: Session, file_record, user_id: int):
    """Snapshot transactions belonging to a deleted file in constant memory."""
    q = db.query(Transaction).filter(
        Transaction.file_id == file_record.id,
        Transaction.user_id == user_id,
    )
    total_count, payload = _stream_snapshot(q)
    if total_count == 0:
        return

    db.add(ArchivedFile(
        user_id=user_id,
        original_file_id=file_record.id,
        filename=file_record.filename,
        file_hash=file_record.file_hash,
        transaction_count=total_count,
        transactions_payload=payload,
        deleted_at=datetime.now(timezone.utc),
    ))


def archive_all_user_transactions(db: Session, user_id: int, reason: str = "workspace-reset"):
    """Snapshot user transactions in constant memory on workspace reset."""
    q = db.query(Transaction).filter(Transaction.user_id == user_id)
    total_count, payload = _stream_snapshot(q)
    if total_count == 0:
        return

    db.add(ArchivedFile(
        user_id=user_id,
        original_file_id=None,
        filename=reason,
        file_hash=None,
        transaction_count=total_count,
        transactions_payload=payload,
        deleted_at=datetime.now(timezone.utc),
    ))


def is_developer_authorized(header_key: str) -> bool:
    """True only if the caller supplied the developer secret key."""
    if not DEVELOPER_KEY:
        # No key configured → developer access disabled for safety.
        return False
    return header_key == DEVELOPER_KEY


def archive_to_dict(arch: ArchivedFile):
    return {
        "id": arch.id,
        "user_id": arch.user_id,
        "original_file_id": arch.original_file_id,
        "filename": arch.filename,
        "file_hash": arch.file_hash,
        "transaction_count": arch.transaction_count,
        "deleted_at": arch.deleted_at.isoformat() if arch.deleted_at else None,
        "transactions": arch.transactions_payload or [],
    }
