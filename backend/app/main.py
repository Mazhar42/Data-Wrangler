import os
import re
from asteval import Interpreter
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import models, schemas, crud, ai, utils, auth
from .database import engine, Base, get_db
import pandas as pd
import numpy as np
import uuid
import json
from typing import List


Base.metadata.create_all(bind=engine)

app = FastAPI(title='Data Cleansing Backend (Starter)')


# CORS origins - include both production and local development
origins = [
    "https://cleansing-app.netlify.app",
    "http://localhost:3000",  # For local development
    "http://localhost:5173",  # For Vite dev server
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

# For development, allow all origins
if os.getenv("ENV") != "production":
    origins.append("*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if os.getenv("ENV") == "production" else ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"]
)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/")
def read_root():
    return {"message": "Data Cleansing API is running", "status": "healthy"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "cors_origins": origins}

@app.get("/test-cors")
def test_cors():
    """Simple endpoint to test CORS"""
    return {"message": "CORS is working!", "timestamp": "2025-08-28"}

@app.post('/projects/{project_id}/upload', response_model=schemas.UploadResponse)
async def upload_file(
    project_id: int,
    file: UploadFile = File(...), 
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    # Check if project exists and user owns it
    project = crud.get_project(db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not auth.user_owns_project(current_user, project):
        raise HTTPException(status_code=403, detail="Not authorized to upload to this project")
    
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ('.csv', '.xls', '.xlsx'):
        raise HTTPException(status_code=400, detail='Unsupported file type. Use CSV or Excel.')

    stored_name = f"{uuid.uuid4().hex}_{file.filename}"
    stored_path = os.path.join(UPLOAD_DIR, stored_name)

    # Save file to disk
    with open(stored_path, 'wb') as f:
        content = await file.read()
        f.write(content)

    # Create DB record with project association
    db_obj = crud.create_uploaded_file(db, filename=file.filename, stored_path=stored_path, project_id=project_id)

    # Create history entry
    crud.create_history_entry(db, schemas.HistoryCreate(
        project_id=project_id,
        user_id=current_user.id,
        file_id=db_obj.id,
        operation="upload_file",
        details=json.dumps({"filename": file.filename})
    ))

    # Process file in chunks
    chunk_size = 10000
    preview_chunk_size = 100
    df_preview = None
    total_rows = 0

    try:
        if ext == '.csv':
            # Get total rows for CSV without loading the whole file
            with open(stored_path, 'r', encoding='utf-8', errors='ignore') as f:
                total_rows = sum(1 for line in f) - 1  # Exclude header

            # Read the first chunk for preview
            df_preview = pd.read_csv(stored_path, nrows=preview_chunk_size)
        else: # .xls, .xlsx
            # For Excel, we need to read at least the sheet to get the row count
            # This is still more efficient than loading all data
            xls = pd.ExcelFile(stored_path)
            # Assuming we're interested in the first sheet
            sheet_name = xls.sheet_names[0]
            df_full = pd.read_excel(xls, sheet_name=sheet_name)
            total_rows = len(df_full)
            df_preview = df_full.head(preview_chunk_size)


        df_preview = df_preview.replace([np.inf, -np.inf], np.nan)
        df_preview = df_preview.where(pd.notna(df_preview), None)

        return {
            'file_id': db_obj.id,
            'filename': file.filename,
            'data': df_preview.to_dict(orient='records'),
            'total_rows': total_rows
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {e}")




@app.get('/unique-columns/{file_id}')
def unique_columns(file_id: int, db: Session = Depends(get_db)):
    dbf = crud.get_uploaded_file(db, file_id)
    if not dbf:
        raise HTTPException(status_code=404, detail='File not found')
    df = utils.read_tabular(dbf.stored_path)
    all_cols, candidates = utils.detect_unique_columns(df)
    return {'all_columns': all_cols, 'candidates': candidates}

@app.get('/files/{file_id}')
def get_file_content(file_id: int, page: int = 1, per_page: int = 50, db: Session = Depends(get_db)):
    dbf = crud.get_uploaded_file(db, file_id)
    if not dbf:
        raise HTTPException(status_code=404, detail='File not found')
    df = utils.read_tabular(dbf.stored_path)
    
    # Pagination
    start = (page - 1) * per_page
    end = start + per_page
    df_page = df.iloc[start:end].replace([np.inf, -np.inf], np.nan)
    df_page = df_page.where(pd.notna(df_page), None)
    
    return {
        'total_rows': len(df),
        'data': df_page.to_dict(orient='records')
    }

@app.get('/files/{file_id}/status')
def file_status(file_id: int, db: Session = Depends(get_db)):
    dbf = crud.get_uploaded_file(db, file_id)
    if not dbf:
        raise HTTPException(status_code=404, detail='File not found')
    return {'status': 'complete'}

@app.delete("/files/{file_id}")
def delete_file(file_id: int, current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(get_db)):
    db_file = crud.get_uploaded_file(db, file_id=file_id)
    if db_file is None:
        raise HTTPException(status_code=404, detail="File not found")

    if not auth.user_owns_project(current_user, db_file.project):
        raise HTTPException(status_code=403, detail="Not authorized to delete this file")

    crud.create_history_entry(db, schemas.HistoryCreate(
        project_id=db_file.project_id,
        user_id=current_user.id,
        file_id=file_id,
        operation="delete_file",
        details=json.dumps({"filename": db_file.filename})
    ))

    crud.delete_file(db, file_id=file_id)
    return {"message": f"File {db_file.filename} deleted successfully"}

@app.post('/keep-unique-columns/{file_id}')
def keep_unique_columns(file_id: int, columns: list, keep: bool = True, db: Session = Depends(get_db)):
    dbf = crud.get_uploaded_file(db, file_id)
    if not dbf:
        raise HTTPException(status_code=404, detail='File not found')
    # apply choice by dropping columns if keep=False
    df = utils.read_tabular(dbf.stored_path)
    if not keep:
        df = df.drop(columns=columns)
        base, ext = os.path.splitext(dbf.stored_path)
        new_path = f"{base}_cleaned{ext}"
        if ext.lower() == '.xlsx':
            df.to_excel(new_path, index=False)
        else:
            df.to_csv(new_path, index=False)
        crud.create_uploaded_file(db, filename=f"{os.path.basename(base)}_cleaned{ext}", stored_path=new_path)
    return {'ok': True, 'kept': keep, 'columns': columns}

@app.get('/column-rules')
def list_rules(db: Session = Depends(get_db)):
    rows = crud.list_rules(db)
    out = []
    for r in rows:
        try:
            payload = json.loads(r.payload)
        except:
            payload = r.payload
        out.append({'id': r.id, 'column_name': r.column_name, 'rule_type': r.rule_type, 'payload': payload, 'active': r.active})
    return out

@app.post('/column-rules')
def upsert_rule(rule: schemas.ColumnRuleIn, db: Session = Depends(get_db)):
    r = crud.create_or_update_rule(db, rule)
    return {'id': r.id, 'column_name': r.column_name, 'rule_type': r.rule_type}

@app.post('/waterfall/{file_id}')
def waterfall_validate(file_id: int, body: schemas.WaterfallIn, db: Session = Depends(get_db)):
    dbf = crud.get_uploaded_file(db, file_id)
    if not dbf:
        raise HTTPException(status_code=404, detail='File not found')
    df = utils.read_tabular(dbf.stored_path)
    res = utils.validate_waterfall(df, body.equation, tolerance=body.tolerance)
    return res

@app.get('/suggestions/{file_id}')
def get_suggestions(file_id: int, db: Session = Depends(get_db), sample_size: int = 10):
    dbf = crud.get_uploaded_file(db, file_id)
    if not dbf:
        raise HTTPException(status_code=404, detail='File not found')
    df = utils.read_tabular(dbf.stored_path)
    df_sample = df.head(sample_size).replace([np.inf, -np.inf], np.nan).where(pd.notna(df.head(sample_size)), None)
    sample = df_sample.to_dict(orient='records')
    suggestions = ai.call_ollama_for_suggestions(sample, list(df.columns))
    return {'suggestions': suggestions}

@app.post('/apply-suggestions/{file_id}')
def apply_suggestions(file_id: int, payload: dict, db: Session = Depends(get_db)):
    """Payload example:
    {
      'actions': [
         {'type': 'replace_abbrev', 'column': 'country', 'from': 'BD', 'to': 'Bangladesh'}
      ]
    }
    """
    dbf = crud.get_uploaded_file(db, file_id)
    if not dbf:
        raise HTTPException(status_code=404, detail='File not found')
    df = utils.read_tabular(dbf.stored_path)
    actions = payload.get('actions', [])
    for a in actions:
        if a.get('type') == 'replace_abbrev':
            col = a['column']
            df[col] = df[col].replace(a['from'], a['to'])
    base, ext = os.path.splitext(dbf.stored_path)
    cleaned_path = f"{base}_cleaned{ext}"
    if ext.lower() == '.xlsx':
        df.to_excel(cleaned_path, index=False)
    else:
        df.to_csv(cleaned_path, index=False)
    crud.create_uploaded_file(db, filename=f"{os.path.basename(base)}_cleaned{ext}", stored_path=cleaned_path)
    return {'ok': True, 'cleaned_path': cleaned_path}


def sanitize_formula(formula: str, columns: list) -> str:
    aeval = Interpreter()
    for col in columns:
        aeval.symtable[col] = 0 # Add column names to the symbol table
    try:
        aeval.parse(formula)
    except Exception as e:
        raise ValueError(f"Invalid formula: {e}")
    return formula

def apply_modifications(df: pd.DataFrame, modifications: list) -> pd.DataFrame:
    for mod in modifications:
        try:
            if mod.type == 'filter' and mod.criteria is not None:
                df = utils.apply_filter(df, mod.criteria)
            elif mod.type == 'rule' and mod.rule is not None:
                rule = mod.rule
                if rule.get('rule_type') == 'correct_date':
                    df = utils.correct_date_format(df, rule.get('column_name'), **rule.get('payload', {}))
                elif rule.get('rule_type') == 'correct_country':
                    df = utils.correct_country_spelling(df, rule.get('column_name'), **rule.get('payload', {}))
            elif mod.type == 'formula' and mod.formula is not None:
                formula = mod.formula
                sanitized_expression = sanitize_formula(formula.get('formula_expression'), df.columns)
                df[formula.get('formula_name')] = df.eval(sanitized_expression)
            elif mod.type == 'cell_edit' and mod.edit is not None:
                df = utils.apply_cell_edit(df, mod.edit)
            elif mod.type == 'column_search' and mod.search is not None:
                df = utils.apply_column_search(df, mod.search)
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))
    return df

@app.post("/preview-modifications/{file_id}")
async def preview_modifications(file_id: int, request: schemas.PreviewModificationRequest, db: Session = Depends(get_db)):
    dbf = crud.get_uploaded_file(db, file_id)
    if not dbf:
        raise HTTPException(status_code=404, detail="File not found")

    df = utils.read_tabular(dbf.stored_path)
    df = apply_modifications(df, request.modifications)

    # Pagination
    start = (request.page - 1) * request.per_page
    end = start + request.per_page
    df_page = df.iloc[start:end].replace([np.inf, -np.inf], np.nan)
    df_page = df_page.where(pd.notna(df_page), None)
    
    return {
        'total_rows': len(df),
        'data': df_page.to_dict(orient='records')
    }

@app.post("/download-modified-file/{file_id}")
async def download_modified_file(file_id: int, request: schemas.ModificationRequest, current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(get_db)):
    dbf = crud.get_uploaded_file(db, file_id)
    if not dbf:
        raise HTTPException(status_code=404, detail="File not found")

    df = utils.read_tabular(dbf.stored_path)
    df = apply_modifications(df, request.modifications)

    crud.create_history_entry(db, schemas.HistoryCreate(
        project_id=dbf.project_id,
        user_id=current_user.id,
        file_id=file_id,
        operation="download_modified_file",
        details=json.dumps({"format": request.format, "modifications": [mod.dict() for mod in request.modifications]})
    ))

    base, _ = os.path.splitext(dbf.stored_path)
    
    if request.format == 'csv':
        temp_path = f"{base}.csv"
        df.to_csv(temp_path, index=False)
        response = FileResponse(temp_path, media_type='text/csv', filename=f"{os.path.basename(base)}.csv")
    elif request.format == 'xlsx':
        temp_path = f"{base}.xlsx"
        df.to_excel(temp_path, index=False)
        response = FileResponse(temp_path, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', filename=f"{os.path.basename(base)}.xlsx")
    else:
        raise HTTPException(status_code=400, detail="Unsupported format")

    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Expose-Headers"] = "Content-Disposition"
    return response

@app.post("/formulas/", response_model=schemas.Formula)
def create_formula(formula: schemas.FormulaBase, db: Session = Depends(get_db)):
    return crud.create_formula(db=db, formula=formula)

@app.get("/formulas/", response_model=List[schemas.Formula])
def read_formulas(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    formulas = crud.get_formulas(db, skip=skip, limit=limit)
    return formulas

@app.get("/formulas/{formula_id}", response_model=schemas.Formula)
def read_formula(formula_id: int, db: Session = Depends(get_db)):
    db_formula = crud.get_formula(db, formula_id=formula_id)
    if db_formula is None:
        raise HTTPException(status_code=404, detail="Formula not found")
    return db_formula

@app.delete("/formulas/{formula_id}", response_model=schemas.Formula)
def delete_formula(formula_id: int, db: Session = Depends(get_db)):
    db_formula = crud.delete_formula(db, formula_id=formula_id)
    if db_formula is None:
        raise HTTPException(status_code=404, detail="Formula not found")
    return db_formula

@app.post('/compare_columns/')
async def compare_columns(request: schemas.CompareRequest, db: Session = Depends(get_db)):
    dbf = crud.get_uploaded_file(db, request.file_id)
    if not dbf:
        raise HTTPException(status_code=404, detail='File not found')

    df = utils.read_tabular(dbf.stored_path)

    # Validate columns
    if request.column1 not in df.columns or request.column2 not in df.columns:
        raise HTTPException(status_code=400, detail='Invalid column names')

    # Ensure columns are numeric
    try:
        df[request.column1] = pd.to_numeric(df[request.column1])
        df[request.column2] = pd.to_numeric(df[request.column2])
    except ValueError:
        raise HTTPException(status_code=400, detail='Columns must be numeric for comparison')

    # Perform comparison
    try:
        if request.operator == '>':
            result = df[df[request.column1] > df[request.column2]]
        elif request.operator == '<':
            result = df[df[request.column1] < df[request.column2]]
        elif request.operator == '==':
            result = df[df[request.column1] == df[request.column2]]
        elif request.operator == '!=':
            result = df[df[request.column1] != df[request.column2]]
        elif request.operator == '>=':
            result = df[df[request.column1] >= df[request.column2]]
        elif request.operator == '<=':
            result = df[df[request.column1] <= df[request.column2]]
        else:
            raise HTTPException(status_code=400, detail='Invalid operator')
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error during comparison: {e}")

    return {'result': f'There are {len(result)} rows where {request.column1} {request.operator} {request.column2}'}

@app.post("/stats/{file_id}")
async def get_stats(file_id: int, request: schemas.StatsRequest, db: Session = Depends(get_db)):
    dbf = crud.get_uploaded_file(db, file_id)
    if not dbf:
        raise HTTPException(status_code=404, detail="File not found")

    df = utils.read_tabular(dbf.stored_path)
    stats = {}
    for col in request.column_names:
        if col in df.columns and pd.api.types.is_numeric_dtype(df[col]):
            stats[col] = {
                'sum': round(df[col].sum(), 2),
                'avg': round(df[col].mean(), 2)
            }
    return stats

# ============== AUTHENTICATION ENDPOINTS ==============

# Normal email/password authentication
@app.post("/auth/register", response_model=schemas.TokenResponse)
async def register_user(user: schemas.UserRegister, db: Session = Depends(get_db)):
    """Register a new user with email and password"""
    # Check if user already exists
    existing_user = crud.get_user_by_email(db, email=user.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password and create user
    password_hash = auth.get_password_hash(user.password)
    db_user = crud.create_user_with_password(db=db, user=user, password_hash=password_hash)
    
    # Create JWT token
    access_token_expires = auth.timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    jwt_token = auth.create_access_token(
        data={"sub": str(db_user.id)}, expires_delta=access_token_expires
    )
    
    return schemas.TokenResponse(
        access_token=jwt_token,
        token_type="bearer",
        user=db_user
    )

@app.post("/auth/login", response_model=schemas.TokenResponse)
async def login_user(user: schemas.UserLogin, db: Session = Depends(get_db)):
    """Login user with email and password"""
    # Authenticate user
    authenticated_user = auth.authenticate_user(db, user.email, user.password)
    if not authenticated_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update last login
    crud.update_user_last_login(db, authenticated_user.id)
    
    # Create JWT token
    access_token_expires = auth.timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    jwt_token = auth.create_access_token(
        data={"sub": str(authenticated_user.id)}, expires_delta=access_token_expires
    )
    
    return schemas.TokenResponse(
        access_token=jwt_token,
        token_type="bearer",
        user=authenticated_user
    )

# Microsoft OAuth
@app.get("/auth/microsoft/url")
def get_microsoft_auth_url():
    """Get Microsoft OAuth login URL"""
    return {"auth_url": auth.get_microsoft_auth_url()}

@app.post("/auth/microsoft/callback")
async def microsoft_auth_callback(code: str, db: Session = Depends(get_db)):
    """Handle Microsoft OAuth callback"""
    # Exchange code for access token
    access_token = await auth.exchange_code_for_token(code)
    if not access_token:
        raise HTTPException(status_code=400, detail="Failed to exchange code for token")
    
    # Get user info from Microsoft Graph
    microsoft_user = await auth.get_microsoft_user_info(access_token)
    if not microsoft_user:
        raise HTTPException(status_code=400, detail="Failed to get user info from Microsoft")
    
    # Check if user exists, create if not
    user = crud.get_user_by_microsoft_id(db, microsoft_user.id)
    if not user:
        user_create = schemas.UserCreate(
            microsoft_id=microsoft_user.id,
            email=microsoft_user.mail,
            name=microsoft_user.displayName
        )
        user = crud.create_user(db, user_create)
    
    # Update last login
    crud.update_user_last_login(db, user.id)
    
    # Create JWT token
    access_token_expires = auth.timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    jwt_token = auth.create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    
    return schemas.TokenResponse(
        access_token=jwt_token,
        token_type="bearer",
        user=user
    )

# Google OAuth
@app.get("/auth/google/url")
def get_google_auth_url():
    """Get Google OAuth login URL"""
    return {"auth_url": auth.get_google_auth_url()}

@app.post("/auth/google/callback")
async def google_auth_callback(code: str, db: Session = Depends(get_db)):
    """Handle Google OAuth callback"""
    # Exchange code for access token
    access_token = await auth.exchange_google_code_for_token(code)
    if not access_token:
        raise HTTPException(status_code=400, detail="Failed to exchange code for token")
    
    # Get user info from Google API
    google_user = await auth.get_google_user_info(access_token)
    if not google_user:
        raise HTTPException(status_code=400, detail="Failed to get user info from Google")
    
    # Check if user exists, create if not
    user = crud.get_user_by_google_id(db, google_user.id)
    if not user:
        # Check if user exists with same email but different provider
        existing_user = crud.get_user_by_email(db, google_user.email)
        if existing_user:
            # Update existing user to add Google ID
            existing_user.google_id = google_user.id
            db.commit()
            user = existing_user
        else:
            # Create new user
            user_create = schemas.UserCreate(
                google_id=google_user.id,
                email=google_user.email,
                name=google_user.name,
                provider="google"
            )
            user = crud.create_user(db, user_create)
    
    # Update last login
    crud.update_user_last_login(db, user.id)
    
    # Create JWT token
    access_token_expires = auth.timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    jwt_token = auth.create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    
    return schemas.TokenResponse(
        access_token=jwt_token,
        token_type="bearer",
        user=user
    )

@app.get("/auth/me", response_model=schemas.User)
def get_current_user_info(current_user: models.User = Depends(auth.get_current_active_user)):
    """Get current user information"""
    return current_user

# ============== PROJECT MANAGEMENT ENDPOINTS ==============

@app.get("/projects", response_model=List[schemas.Project])
def get_user_projects(
    skip: int = 0, 
    limit: int = 100, 
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all projects for the current user"""
    projects = crud.get_user_projects(db, user_id=current_user.id, skip=skip, limit=limit)
    return projects

@app.post("/projects", response_model=schemas.Project)
def create_project(
    project: schemas.ProjectCreate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new project"""
    db_project = crud.create_project(db=db, project=project, owner_id=current_user.id)
    crud.create_history_entry(db, schemas.HistoryCreate(
        project_id=db_project.id,
        user_id=current_user.id,
        operation="create_project",
        details=json.dumps({"name": project.name})
    ))
    return db_project

@app.get("/projects/{project_id}", response_model=schemas.ProjectWithFiles)
def get_project(
    project_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get project details with files"""
    project = crud.get_project(db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not auth.user_owns_project(current_user, project):
        raise HTTPException(status_code=403, detail="Not authorized to access this project")
    
    # Get project files
    files = crud.get_project_files(db, project_id=project_id)
    
    # Manually construct the dictionary to ensure all fields are included
    project_dict = {
        "id": project.id,
        "name": project.name,
        "description": project.description,
        "owner_id": project.owner_id,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
        "owner": project.owner,  # Explicitly include the owner relationship
        "files": [{
            "id": f.id,
            "filename": f.filename,
            "uploaded_at": f.uploaded_at
        } for f in files]
    }
    
    return project_dict

@app.put("/projects/{project_id}", response_model=schemas.Project)
def update_project(
    project_id: int,
    project_update: schemas.ProjectUpdate,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update project"""
    project = crud.get_project(db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not auth.user_owns_project(current_user, project):
        raise HTTPException(status_code=403, detail="Not authorized to update this project")
    
    updated_project = crud.update_project(db, project_id=project_id, project_update=project_update)
    crud.create_history_entry(db, schemas.HistoryCreate(
        project_id=project_id,
        user_id=current_user.id,
        operation="update_project",
        details=json.dumps(project_update.dict(exclude_unset=True))
    ))
    return updated_project

@app.delete("/projects/{project_id}")
def delete_project(
    project_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete project and all associated files"""
    project = crud.get_project(db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if not auth.user_owns_project(current_user, project):
        raise HTTPException(status_code=403, detail="Not authorized to delete this project")
    
    crud.delete_project(db, project_id=project_id)
    crud.create_history_entry(db, schemas.HistoryCreate(
        project_id=project_id,
        user_id=current_user.id,
        operation="delete_project",
        details=json.dumps({"name": project.name})
    ))
    return {"message": "Project deleted successfully"}

@app.get("/projects/{project_id}/history", response_model=List[schemas.History])
def get_project_history(
    project_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get project history"""
    project = crud.get_project(db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not auth.user_owns_project(current_user, project):
        raise HTTPException(status_code=403, detail="Not authorized to access this project")

    return crud.get_project_history(db, project_id=project_id)