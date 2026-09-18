from sqlalchemy import create_engine, Column, Integer, String, Float, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Adjust this URL if you are using PostgreSQL directly
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sql_app.db") 

# connect_args is needed for SQLite, ignored by Postgres
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False} if "sqlite" in SQLALCHEMY_DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    file_id = Column(Integer, nullable=True, index=True)
    
    # Core Dashboard Columns
    date = Column(String)
    amount = Column(Float, default=0.0)
    category = Column(String, default="Uncategorized")
    product_sku = Column(String, default="UNKNOWN")
    customer_id = Column(String, default="1")
    
    # The Schemaless Hybrid Column
    raw_data = Column(JSON, nullable=True) 

class FileRecord(Base):
    __tablename__ = "file_records"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    file_hash = Column(String, index=True)
    filename = Column(String)
    status = Column(String, default="completed")

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()