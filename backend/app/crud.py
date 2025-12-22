import os
from sqlalchemy.orm import Session, joinedload
from . import models, schemas
from datetime import datetime
import json

# POTENTIALLY UNUSED: This function is defined but never used.
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

def create_formula(db: Session, formula: schemas.FormulaBase, project_id: int):
    db_formula = models.Formula(**formula.dict(), project_id=project_id)
    db.add(db_formula)
    db.commit()
    db.refresh(db_formula)
    return db_formula

def get_formulas(db: Session, project_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Formula).filter(models.Formula.project_id == project_id).offset(skip).limit(limit).all()

def get_formula(db: Session, formula_id: int, project_id: int):
    return db.query(models.Formula).filter(models.Formula.id == formula_id, models.Formula.project_id == project_id).first()

def delete_formula(db: Session, formula_id: int, project_id: int):
    db_formula = db.query(models.Formula).filter(models.Formula.id == formula_id, models.Formula.project_id == project_id).first()
    if db_formula:
        db.delete(db_formula)
        db.commit()
    return db_formula

# User CRUD operations
def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

# REMOVED: get_user_by_microsoft_id

def get_user_by_google_id(db: Session, google_id: str):
    return db.query(models.User).filter(models.User.google_id == google_id).first()

def create_user(db: Session, user: schemas.UserCreate):
    user_data = user.dict()
    # Remove password from dict if it's None or if we are creating an OAuth user who doesn't need a password hash stored directly like this
    # Actually, User model has 'password_hash', but UserCreate has 'password'. 
    # We need to handle this mismatch.
    
    password = user_data.pop("password", None)
    
    if password:
        # If a password is provided (e.g. email registration), we should hash it.
        # But this function seems to be used for OAuth too where password is None.
        # And for email registration, we have 'create_user_with_password' below.
        # So 'create_user' is likely used for OAuth or where we don't set a password.
        pass

    db_user = models.User(**user_data)
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

def update_user_refresh_token(db: Session, user_id: int, refresh_token: str, expires_at: datetime):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user:
        db_user.refresh_token = refresh_token
        db_user.refresh_token_expires_at = expires_at
        db.commit()
        db.refresh(db_user)
    return db_user

# Project CRUD operations
def get_project(db: Session, project_id: int):
    return db.query(models.Project).filter(models.Project.id == project_id).first()

def get_user_projects(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Project).options(joinedload(models.Project.owner)).filter(models.Project.owner_id == user_id).offset(skip).limit(limit).all()

def get_all_projects(db: Session, skip: int = 0, limit: int = 100):
    """Return all projects regardless of owner (includes owner relationship)."""
    return db.query(models.Project).options(joinedload(models.Project.owner)).order_by(models.Project.created_at.desc()).offset(skip).limit(limit).all()

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
        # Manually delete associated files from the filesystem
        for file in project.files:
            if os.path.exists(file.stored_path):
                os.remove(file.stored_path)
        
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

# Redo History CRUD operations
def create_redo_entry(db: Session, file_id: int, modifications: str):
    db_redo = models.RedoHistory(file_id=file_id, modifications=modifications)
    db.add(db_redo)
    db.commit()
    db.refresh(db_redo)
    return db_redo

def get_last_redo_entry(db: Session, file_id: int):
    return db.query(models.RedoHistory).filter(models.RedoHistory.file_id == file_id).order_by(models.RedoHistory.created_at.desc()).first()

def delete_last_redo_entry(db: Session, file_id: int):
    last_redo = get_last_redo_entry(db, file_id)
    if last_redo:
        db.delete(last_redo)
        db.commit()
    return last_redo

# Conversation CRUD operations
def create_conversation(db: Session, user_id: int, project_id: int, file_id: int) -> models.Conversation:
    conversation = models.Conversation(user_id=user_id, project_id=project_id, file_id=file_id)
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation

def get_conversations_for_user(db: Session, user_id: int, project_id: int, file_id: int) -> list[models.Conversation]:
    return db.query(models.Conversation).options(joinedload(models.Conversation.messages)).filter(
        models.Conversation.user_id == user_id,
        models.Conversation.project_id == project_id,
        models.Conversation.file_id == file_id
    ).order_by(models.Conversation.created_at.desc()).all()

def add_message_to_conversation(db: Session, conversation_id: int, role: str, content: str, sender: str) -> models.ConversationMessage:
    message = models.ConversationMessage(conversation_id=conversation_id, role=role, content=content, sender=sender)
    db.add(message)
    db.commit()
    db.refresh(message)
    return message

# === Admin: Roles and Groups ===
def list_users(db: Session):
    return db.query(models.User).order_by(models.User.created_at.desc()).all()

def create_role(db: Session, role_in: schemas.RoleCreate):
    role = models.Role(name=role_in.name, description=role_in.description)
    db.add(role)
    db.commit()
    db.refresh(role)
    return role

def list_roles(db: Session):
    return db.query(models.Role).order_by(models.Role.name.asc()).all()

def delete_role(db: Session, role_id: int):
    role = db.query(models.Role).filter(models.Role.id == role_id).first()
    if role:
        db.delete(role)
        db.commit()
    return role

def create_group(db: Session, group_in: schemas.GroupCreate):
    group = models.Group(name=group_in.name, description=group_in.description)
    db.add(group)
    db.commit()
    db.refresh(group)
    return group

def list_groups(db: Session):
    return db.query(models.Group).order_by(models.Group.name.asc()).all()

def delete_group(db: Session, group_id: int):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if group:
        db.delete(group)
        db.commit()
    return group

# Retrieval helpers for assignments
def get_roles_for_user(db: Session, user_id: int):
    return (
        db.query(models.Role)
        .join(models.UserRole, models.Role.id == models.UserRole.role_id)
        .filter(models.UserRole.user_id == user_id)
        .order_by(models.Role.name.asc())
        .all()
    )

def get_groups_for_user(db: Session, user_id: int):
    return (
        db.query(models.Group)
        .join(models.UserGroup, models.Group.id == models.UserGroup.group_id)
        .filter(models.UserGroup.user_id == user_id)
        .order_by(models.Group.name.asc())
        .all()
    )

def get_users_for_group(db: Session, group_id: int):
    return (
        db.query(models.User)
        .join(models.UserGroup, models.User.id == models.UserGroup.user_id)
        .filter(models.UserGroup.group_id == group_id)
        .order_by(models.User.created_at.desc())
        .all()
    )

def assign_role_to_user(db: Session, user_id: int, role_id: int):
    assoc = models.UserRole(user_id=user_id, role_id=role_id)
    db.add(assoc)
    db.commit()
    db.refresh(assoc)
    return assoc

def remove_role_from_user(db: Session, user_id: int, role_id: int):
    assoc = db.query(models.UserRole).filter(models.UserRole.user_id == user_id, models.UserRole.role_id == role_id).first()
    if assoc:
        db.delete(assoc)
        db.commit()
    return assoc

def assign_user_to_group(db: Session, user_id: int, group_id: int):
    assoc = models.UserGroup(user_id=user_id, group_id=group_id)
    db.add(assoc)
    db.commit()
    db.refresh(assoc)
    return assoc

def remove_user_from_group(db: Session, user_id: int, group_id: int):
    assoc = db.query(models.UserGroup).filter(models.UserGroup.user_id == user_id, models.UserGroup.group_id == group_id).first()
    if assoc:
        db.delete(assoc)
        db.commit()
    return assoc