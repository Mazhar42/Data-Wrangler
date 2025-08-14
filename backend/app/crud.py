
from sqlalchemy.orm import Session
from . import models, schemas
import json

def get_uploaded_file_by_filename(db: Session, filename: str):
    return db.query(models.UploadedFile).filter(models.UploadedFile.filename == filename).first()

def create_uploaded_file(db: Session, filename: str, stored_path: str):
    # Check if a file with the same name already exists
    db_file = get_uploaded_file_by_filename(db, filename=filename)
    if db_file:
        # If it exists, update the stored_path
        db_file.stored_path = stored_path
        db.commit()
        db.refresh(db_file)
        return db_file
    
    # If it doesn't exist, create a new record
    f = models.UploadedFile(filename=filename, stored_path=stored_path)
    db.add(f)
    db.commit()
    db.refresh(f)
    return f

def get_uploaded_file(db: Session, file_id: int):
    return db.query(models.UploadedFile).filter(models.UploadedFile.id == file_id).first()

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
