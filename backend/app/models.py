from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    password_hash = Column(String, nullable=True)  # For email/password auth
    microsoft_id = Column(String, unique=True, nullable=True, index=True)  # Microsoft Graph user ID
    google_id = Column(String, unique=True, nullable=True, index=True)  # Google user ID
    provider = Column(String, default="email")  # "email", "microsoft", "google"
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    
    # Relationship
    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")

class Project(Base):
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    owner = relationship("User", back_populates="projects")
    files = relationship("UploadedFile", back_populates="project", cascade="all, delete-orphan")
    history = relationship("History", back_populates="project", cascade="all, delete-orphan")


class UploadedFile(Base):
    __tablename__ = "uploaded_files"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)  # Removed unique constraint since files can have same name in different projects
    stored_path = Column(String, unique=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    project = relationship("Project", back_populates="files")

class ColumnRule(Base):
    __tablename__ = "column_rules"
    id = Column(Integer, primary_key=True, index=True)
    column_name = Column(String, index=True)
    rule_type = Column(String)  # e.g., 'abbreviation', 'date_format', 'currency'
    payload = Column(Text)      # JSON string with rule details
    active = Column(Boolean, default=True)

class Formula(Base):
    __tablename__ = "formulas"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    expression = Column(String)

class History(Base):
    __tablename__ = "history"
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    file_id = Column(Integer, ForeignKey("uploaded_files.id"), nullable=True)
    operation = Column(String, nullable=False)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="history")
    user = relationship("User")
    file = relationship("UploadedFile")