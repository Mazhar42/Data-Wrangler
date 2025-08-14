
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean
from sqlalchemy.sql import func
from .database import Base

class UploadedFile(Base):
    __tablename__ = "uploaded_files"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, unique=True, index=True)
    stored_path = Column(String, unique=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

class ColumnRule(Base):
    __tablename__ = "column_rules"
    id = Column(Integer, primary_key=True, index=True)
    column_name = Column(String, index=True)
    rule_type = Column(String)  # e.g., 'abbreviation', 'date_format', 'currency'
    payload = Column(Text)      # JSON string with rule details
    active = Column(Boolean, default=True)
