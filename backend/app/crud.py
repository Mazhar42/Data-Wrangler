import os
from sqlalchemy.orm import Session, joinedload
from . import models, schemas
from datetime import datetime
import json

def get_uploaded_file_by_filename(db: Session, filename: str):
    return db.query(models.UploadedFile).filter(models.UploadedFile.filename == filename).first()

def create_uploaded_file(db: Session, filename: str, stored_path: str, project_id: int):
    """Create uploaded file within a project"""
    f = models.UploadedFile(filename=filename, stored_path=stored_path, project_id=project_id)
    db.add(f)
    db.commit()
    db.refresh(f)
    return f

def get_uploaded_file(db: Session, file_id: int):
    return db.query(models.UploadedFile).filter(models.UploadedFile.id == file_id).first()

def delete_file(db: Session, file_id: int):
    db_file = db.query(models.UploadedFile).filter(models.UploadedFile.id == file_id).first()
    if db_file:
        # Delete the actual file from the filesystem
        if os.path.exists(db_file.stored_path):
            os.remove(db_file.stored_path)
        db.delete(db_file)
        db.commit()
    return db_file

def list_rules(db: Session):
    return db.query(models.ColumnRule).all()

def create_or_update_rule(db: Session, rule_in: schemas.ColumnRuleIn):
    # simplistic: try to find existing
    existing = db.query(models.ColumnRule).filter(models.ColumnRule.column_name==rule_in.column_name, models.ColumnRule.rule_type==rule_in.rule_type).first()
    payload = json.dumps(rule_in.payload)
    if existing:
        existing.payload = payload
        existing.active = rule_in.active
        db.commit()
        db.refresh(existing)
        return existing
    r = models.ColumnRule(column_name=rule_in.column_name, rule_type=rule_in.rule_type, payload=payload, active=rule_in.active)
    db.add(r)
    db.commit()
    db.refresh(r)
    return r

def create_formula(db: Session, formula: schemas.FormulaBase):
    db_formula = models.Formula(**formula.dict())
    db.add(db_formula)
    db.commit()
    db.refresh(db_formula)
    return db_formula

def get_formulas(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Formula).offset(skip).limit(limit).all()

def get_formula(db: Session, formula_id: int):
    return db.query(models.Formula).filter(models.Formula.id == formula_id).first()

def delete_formula(db: Session, formula_id: int):
    db_formula = db.query(models.Formula).filter(models.Formula.id == formula_id).first()
    if db_formula:
        db.delete(db_formula)
        db.commit()
    return db_formula

# User CRUD operations
def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_user_by_microsoft_id(db: Session, microsoft_id: str):
    return db.query(models.User).filter(models.User.microsoft_id == microsoft_id).first()

def get_user_by_google_id(db: Session, google_id: str):
    return db.query(models.User).filter(models.User.google_id == google_id).first()

def create_user(db: Session, user: schemas.UserCreate):
    db_user = models.User(**user.dict())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def create_user_with_password(db: Session, user: schemas.UserRegister, password_hash: str):
    db_user = models.User(
        email=user.email,
        name=user.name,
        password_hash=password_hash,
        provider="email",
        is_verified=False
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user_last_login(db: Session, user_id: int):
    user = get_user(db, user_id)
    if user:
        user.last_login = datetime.utcnow()
        db.commit()
        db.refresh(user)
    return user

# Project CRUD operations
def get_project(db: Session, project_id: int):
    return db.query(models.Project).filter(models.Project.id == project_id).first()

def get_user_projects(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Project).options(joinedload(models.Project.owner)).filter(models.Project.owner_id == user_id).offset(skip).limit(limit).all()

def create_project(db: Session, project: schemas.ProjectCreate, owner_id: int):
    db_project = models.Project(**project.dict(), owner_id=owner_id)
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    # Load the owner relationship for the response
    return db.query(models.Project).options(joinedload(models.Project.owner)).filter(models.Project.id == db_project.id).first()

def update_project(db: Session, project_id: int, project_update: schemas.ProjectUpdate):
    project = get_project(db, project_id)
    if project:
        update_data = project_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(project, field, value)
        project.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(project)
    return project

def delete_project(db: Session, project_id: int):
    project = get_project(db, project_id)
    if project:
        db.delete(project)
        db.commit()
    return project

def get_project_files(db: Session, project_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.UploadedFile).filter(models.UploadedFile.project_id == project_id).offset(skip).limit(limit).all()

# History CRUD operations
def create_history_entry(db: Session, history: schemas.HistoryCreate) -> models.History:
    db_history = models.History(**history.dict())
    db.add(db_history)
    db.commit()
    db.refresh(db_history)
    return db_history

def get_project_history(db: Session, project_id: int, skip: int = 0, limit: int = 100) -> list[models.History]:
    return db.query(models.History).options(joinedload(models.History.user)).filter(models.History.project_id == project_id).order_by(models.History.timestamp.desc()).offset(skip).limit(limit).all()