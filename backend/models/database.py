from sqlalchemy import create_engine, Column, Integer, String, Float, JSON, DateTime, Index, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timezone
import os

# Reads DATABASE_URL from environment variable.
# Local dev: sqlite:///./sql_app.db  (auto-fallback)
# Production (Supabase): postgresql://user:pass@host/db
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sql_app.db")

# Fix URL prefixes so SQLAlchemy + psycopg3 works correctly:
# "postgres://"       → "postgresql+psycopg://"  (Supabase/Heroku style)
# "postgresql://"     → "postgresql+psycopg://"  (standard style)
# "postgresql+psycopg://" → keep as-is (already correct)
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace(
        "postgres://", "postgresql+psycopg://", 1
    )
elif SQLALCHEMY_DATABASE_URL.startswith("postgresql://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace(
        "postgresql://", "postgresql+psycopg://", 1
    )

is_sqlite = "sqlite" in SQLALCHEMY_DATABASE_URL

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False} if is_sqlite else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String, nullable=True)
    company = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (
        Index("ix_transactions_user_date", "user_id", "date"),
        Index("ix_transactions_user_cat", "user_id", "category"),
        Index("ix_transactions_user_file", "user_id", "file_id"),
    )
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    file_id = Column(Integer, nullable=True, index=True)
    
    # Core Dashboard Columns
    date = Column(String)
    amount = Column(Float, default=0.0)
    category = Column(String, default="Uncategorized")
    product_sku = Column(String, default="UNKNOWN")
    customer_id = Column(String, default="1")

    # Scalable Numeric Columns (enable instant SQL aggregation on 1M+ rows without JSON scans)
    cost_amount = Column(Float, nullable=True)
    net_profit_amount = Column(Float, nullable=True)
    units_sold = Column(Integer, nullable=True)
    stock_remaining = Column(Integer, nullable=True)
    
    # The Schemaless Hybrid Column (populated for smaller datasets; compact/null for bulk 1M+ uploads)
    raw_data = Column(JSON, nullable=True) 

class FileRecord(Base):
    __tablename__ = "file_records"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    file_hash = Column(String, index=True)
    filename = Column(String)
    status = Column(String, default="completed")
    error_message = Column(String, nullable=True)
    rows_loaded = Column(Integer, default=0)

class EmailOTP(Base):
    __tablename__ = "email_otps"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True)
    otp = Column(String)
    expires_at = Column(DateTime)

class AlertNotification(Base):
    __tablename__ = "alert_notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    title = Column(String)
    message = Column(String)
    severity = Column(String, default="info") # "critical", "warning", "success", "info"
    metric_type = Column(String, nullable=True) # "inventory", "revenue", "integration", "target"
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_read = Column(Integer, default=0) # 0 = unread, 1 = read

class IntegrationSetting(Base):
    __tablename__ = "integration_settings"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    platform = Column(String, index=True) # "shopify", "stripe", "square"
    is_connected = Column(Integer, default=0) # 0 = disconnected, 1 = connected
    config = Column(JSON, nullable=True) # {"store_domain": "...", "api_key": "...", ...}
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class ArchivedFile(Base):
    """Developer-only hidden archive. When a user deletes a file (or resets the
    workspace), the file's transaction payload is preserved here so the developer
    can inspect it later. Users never see this table or anything from it."""
    __tablename__ = "archived_files"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    original_file_id = Column(Integer, nullable=True, index=True)
    filename = Column(String)
    file_hash = Column(String, nullable=True, index=True)
    transaction_count = Column(Integer, default=0)
    transactions_payload = Column(JSON, nullable=True)  # full snapshot of rows
    deleted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

Base.metadata.create_all(bind=engine)

# Lightweight auto-migration: add created_at, full_name, company columns if missing
try:
    with engine.begin() as conn:
        if "sqlite" in str(engine.url):
            cols = [r[1] for r in conn.exec_driver_sql("PRAGMA table_info(users)").fetchall()]
            if "created_at" not in cols:
                conn.exec_driver_sql("ALTER TABLE users ADD COLUMN created_at DATETIME")
            if "full_name" not in cols:
                conn.exec_driver_sql("ALTER TABLE users ADD COLUMN full_name TEXT")
            if "company" not in cols:
                conn.exec_driver_sql("ALTER TABLE users ADD COLUMN company TEXT")
            file_cols = [r[1] for r in conn.exec_driver_sql("PRAGMA table_info(file_records)").fetchall()]
            if "error_message" not in file_cols:
                conn.exec_driver_sql("ALTER TABLE file_records ADD COLUMN error_message TEXT")
            if "rows_loaded" not in file_cols:
                conn.exec_driver_sql("ALTER TABLE file_records ADD COLUMN rows_loaded INTEGER DEFAULT 0")
            tx_cols = [r[1] for r in conn.exec_driver_sql("PRAGMA table_info(transactions)").fetchall()]
            if "cost_amount" not in tx_cols:
                conn.exec_driver_sql("ALTER TABLE transactions ADD COLUMN cost_amount FLOAT")
            if "net_profit_amount" not in tx_cols:
                conn.exec_driver_sql("ALTER TABLE transactions ADD COLUMN net_profit_amount FLOAT")
            if "units_sold" not in tx_cols:
                conn.exec_driver_sql("ALTER TABLE transactions ADD COLUMN units_sold INTEGER")
            if "stock_remaining" not in tx_cols:
                conn.exec_driver_sql("ALTER TABLE transactions ADD COLUMN stock_remaining INTEGER")
        else:
            conn.exec_driver_sql("ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()")
            conn.exec_driver_sql("ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR")
            conn.exec_driver_sql("ALTER TABLE users ADD COLUMN IF NOT EXISTS company VARCHAR")
            conn.exec_driver_sql("ALTER TABLE file_records ADD COLUMN IF NOT EXISTS error_message VARCHAR")
            conn.exec_driver_sql("ALTER TABLE file_records ADD COLUMN IF NOT EXISTS rows_loaded INTEGER DEFAULT 0")
            conn.exec_driver_sql("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS cost_amount DOUBLE PRECISION")
            conn.exec_driver_sql("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS net_profit_amount DOUBLE PRECISION")
            conn.exec_driver_sql("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS units_sold INTEGER")
            conn.exec_driver_sql("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS stock_remaining INTEGER")
        conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS ix_transactions_user_date ON transactions (user_id, date)")
        conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS ix_transactions_user_cat ON transactions (user_id, category)")
        conn.exec_driver_sql("CREATE INDEX IF NOT EXISTS ix_transactions_user_file ON transactions (user_id, file_id)")
except Exception as e:
    print(f"Auto-migration notice: {e}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()