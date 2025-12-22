import os
from dotenv import load_dotenv

# Load environment variables from .env files for local development
try:
    env_name = os.getenv("ENVIRONMENT", "development")
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env_path = os.path.join(project_root, f".env.{env_name}")
    if os.path.exists(env_path):
        load_dotenv(env_path)
except Exception:
    # Fail silently in case dotenv is unavailable in some runtime environments
    pass

import re
from asteval import Interpreter
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status, Body
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import models, schemas, crud, utils, auth, chat
from .database import engine, Base, get_db
from .json_encoder import CustomJSONResponse
import pandas as pd
import numpy as np
import uuid
import json
from typing import List


Base.metadata.create_all(bind=engine)

app = FastAPI(
    title='Data Cleansing Backend (Starter)',
    default_response_class=CustomJSONResponse
)




# CORS origins - loaded from environment variable
origins_str = os.getenv("CORS_ORIGINS", "")
origins = [origin.strip() for origin in origins_str.split(",") if origin.strip()]

# Fallback for local development if not set
if not origins:
    origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

# For development, allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allow_headers=["*"],
    expose_headers=["*"]
)

app.include_router(chat.router, prefix="/api/v1", tags=["chat"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/")
def read_root():
    return {"message": "Data Cleansing API is running", "status": "healthy"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "cors_origins": origins}

# ============== ADMIN: Users, Roles, Groups ==============
@app.get("/admin/users", response_model=List[schemas.User])
def admin_list_users(current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(get_db)):
    # TODO: add admin-only guard
    return crud.list_users(db)

@app.get("/admin/roles", response_model=List[schemas.Role])
def admin_list_roles(current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(get_db)):
    return crud.list_roles(db)

@app.post("/admin/roles", response_model=schemas.Role)
def admin_create_role(role: schemas.RoleCreate, current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(get_db)):
    return crud.create_role(db, role)

@app.delete("/admin/roles/{role_id}", response_model=schemas.Role)
def admin_delete_role(role_id: int, current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(get_db)):
    role = crud.delete_role(db, role_id)
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    return role

@app.get("/admin/groups", response_model=List[schemas.Group])
def admin_list_groups(current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(get_db)):
    return crud.list_groups(db)

@app.post("/admin/groups", response_model=schemas.Group)
def admin_create_group(group: schemas.GroupCreate, current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(get_db)):
    return crud.create_group(db, group)

@app.delete("/admin/groups/{group_id}", response_model=schemas.Group)
def admin_delete_group(group_id: int, current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(get_db)):
    group = crud.delete_group(db, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group

@app.post("/admin/users/{user_id}/roles/{role_id}")
def admin_assign_role(user_id: int, role_id: int, current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(get_db)):
    assoc = crud.assign_role_to_user(db, user_id, role_id)
    return {"status": "assigned", "id": assoc.id}

@app.delete("/admin/users/{user_id}/roles/{role_id}")
def admin_remove_role(user_id: int, role_id: int, current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(get_db)):
    assoc = crud.remove_role_from_user(db, user_id, role_id)
    if not assoc:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return {"status": "removed"}

@app.get("/admin/users/{user_id}/roles", response_model=List[schemas.Role])
def admin_list_user_roles(user_id: int, current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(get_db)):
    return crud.get_roles_for_user(db, user_id)

@app.post("/admin/users/{user_id}/groups/{group_id}")
def admin_assign_group(user_id: int, group_id: int, current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(get_db)):
    assoc = crud.assign_user_to_group(db, user_id, group_id)
    return {"status": "assigned", "id": assoc.id}

@app.delete("/admin/users/{user_id}/groups/{group_id}")
def admin_remove_group(user_id: int, group_id: int, current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(get_db)):
    assoc = crud.remove_user_from_group(db, user_id, group_id)
    if not assoc:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return {"status": "removed"}

@app.get("/admin/users/{user_id}/groups", response_model=List[schemas.Group])
def admin_list_user_groups(user_id: int, current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(get_db)):
    return crud.get_groups_for_user(db, user_id)

@app.get("/admin/groups/{group_id}/users", response_model=List[schemas.User])
def admin_list_group_users(group_id: int, current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(get_db)):
    return crud.get_users_for_group(db, group_id)

# POTENTIALLY UNUSED: This endpoint is likely for development and not needed in production.
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
            df_preview = df_preview.astype(object).where(pd.notnull(df_preview), None)
        else: # .xls, .xlsx
            # For Excel, we need to read at least the sheet to get the row count
            # This is still more efficient than loading all data
            xls = pd.ExcelFile(stored_path)
            # Assuming we're interested in the first sheet
            sheet_name = xls.sheet_names[0]
            df_full = pd.read_excel(xls, sheet_name=sheet_name)
            total_rows = len(df_full)
            df_preview = df_full.head(preview_chunk_size)

        return {
            'file_id': db_obj.id,
            'filename': file.filename,
            'data': utils.clean_data(df_preview.to_dict(orient='records')),
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
    return {'all_columns': all_cols, 'candidates': utils.clean_data(candidates)}

@app.get('/files/{file_id}')
def get_file_content(file_id: int, page: int = 1, per_page: int = 50, db: Session = Depends(get_db)):
    dbf = crud.get_uploaded_file(db, file_id)
    if not dbf:
        raise HTTPException(status_code=404, detail='File not found')
    df = utils.read_tabular(dbf.stored_path)
    
    # Pagination
    start = (page - 1) * per_page
    end = start + per_page
    df_page = df.iloc[start:end]
    
    return {
        'total_rows': len(df),
        'data': utils.clean_data(df_page.to_dict(orient='records'))
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

# POTENTIALLY UNUSED: This endpoint is part of an unfinished feature.
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

# POTENTIALLY UNUSED: This endpoint is part of an unfinished feature.
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




def sanitize_formula(formula: str, columns: list) -> str:
    # Sort columns by length descending to ensure we match longest names first
    sorted_columns = sorted(columns, key=len, reverse=True)
    
    execution_formula = formula
    
    # 1. Wrap non-identifier columns in backticks for pd.eval
    for col in sorted_columns:
        if not col.isidentifier():
            # Regex to replace column name with backticked version, if not already backticked
            # We use (?<!`) and (?!`) to ensure we don't double backtick
            pattern = f"(?<!`){re.escape(col)}(?!`)"
            execution_formula = re.sub(pattern, f"`{col}`", execution_formula)

    # 2. Create a validation version where columns are replaced by safe placeholders
    validation_formula = execution_formula
    
    # Map column names to safe placeholders
    col_placeholders = {col: f"__col_{i}__" for i, col in enumerate(sorted_columns)}
    
    for col in sorted_columns:
        safe_placeholder = col_placeholders[col]
        if not col.isidentifier():
            # Replace `col` with placeholder
            pattern = f"`{re.escape(col)}`"
            validation_formula = re.sub(pattern, safe_placeholder, validation_formula)
        else:
            # Replace col identifier with placeholder (use word boundaries)
            pattern = f"\\b{re.escape(col)}\\b"
            validation_formula = re.sub(pattern, safe_placeholder, validation_formula)

    # 3. Validate using asteval
    aeval = Interpreter()
    for placeholder in col_placeholders.values():
        aeval.symtable[placeholder] = 1 # Dummy numeric value
        
    try:
        aeval.parse(validation_formula)
    except Exception as e:
        print(f"Formula validation failed. Original: {formula}, Validation: {validation_formula}, Error: {e}")
        raise ValueError(f"Invalid formula: {e}")
        
    return execution_formula

def apply_modifications(df: pd.DataFrame, modifications: list, db: Session, file_id: int) -> pd.DataFrame:
    print("Applying modifications...")
    print(f"Number of modifications: {len(modifications)}")
    # Save the current state of the DataFrame before applying modifications
    mod_history = models.ModificationHistory(
        file_id=file_id,
        modifications=df.to_json(orient='split')
    )
    db.add(mod_history)
    db.commit()

    for i, mod in enumerate(modifications):
        print(f"Applying modification {i+1}: {mod.dict()}")
        try:
            print(f"Applying modification {i+1}: {mod.dict()}") # Added print statement
            if mod.type == 'filter' and mod.criteria is not None:
                mask = utils.apply_filter(df, mod.criteria)
                df = df[mask]
            elif mod.type == 'rule' and mod.rule is not None:
                rule = mod.rule
                if rule.get('rule_type') == 'correct_date':
                    df = utils.correct_date_format(df, rule.get('column_name'), **rule.get('payload', {}))
                elif rule.get('rule_type') == 'correct_country':
                    df = utils.correct_country_spelling(df, rule.get('column_name'), **rule.get('payload', {}))
                elif rule.get('rule_type') == 'correct_spelling':
                    payload = rule.get('payload', {})
                    if 'mapping' in payload:
                        df = utils.correct_spelling(df, rule.get('column_name'), mapping=payload['mapping'])
                    else:
                        df = utils.correct_spelling(df, rule.get('column_name'), mapping=payload)
            elif mod.type == 'formula' and mod.formula is not None:
                formula = mod.formula
                sanitized_expression = sanitize_formula(formula.get('formula_expression'), df.columns)
                df[formula.get('formula_name')] = df.eval(sanitized_expression)
            elif mod.type == 'cell_edit' and mod.edit is not None:
                df = utils.apply_cell_edit(df, mod.edit)
            elif mod.type == 'column_search' and mod.search is not None:
                df = utils.apply_column_search(df, mod.search)
            elif mod.type == 'remove_duplicates' and mod.remove_duplicates:
                df = df.drop_duplicates()
            elif mod.type == 'search' and mod.search_query is not None:
                search_query = mod.search_query.strip()
                df = df[df.apply(lambda row: row.astype(str).str.strip().str.contains(search_query, case=False, regex=False).any(), axis=1)]
        except Exception as e:
            print(f"Error applying modification {i+1}: {e}") # Added print statement
            raise HTTPException(status_code=400, detail=str(e))
    print("Finished applying modifications.")
    return df

@app.post("/preview-modifications/{file_id}")
async def preview_modifications(file_id: int, request: schemas.PreviewModificationRequest, page: int = 1, per_page: int = 50, db: Session = Depends(get_db)):
    dbf = crud.get_uploaded_file(db, file_id)
    if not dbf:
        raise HTTPException(status_code=404, detail="File not found")

    df = utils.read_tabular(dbf.stored_path)
    df = apply_modifications(df, request.modifications, db, file_id)

    # Pagination
    start = (page - 1) * per_page
    end = start + per_page
    df_page = df.iloc[start:end]
    
    return {
        'total_rows': len(df),
        'data': utils.clean_data(df_page.to_dict(orient='records'))
    }

@app.post("/undo/{file_id}")
async def undo_modification(file_id: int, db: Session = Depends(get_db)):
    last_mod = db.query(models.ModificationHistory).filter(models.ModificationHistory.file_id == file_id).order_by(models.ModificationHistory.created_at.desc()).first()
    if not last_mod:
        raise HTTPException(status_code=404, detail="No modifications to undo")

    dbf = crud.get_uploaded_file(db, file_id)
    if not dbf:
        raise HTTPException(status_code=404, detail="File not found")

    # Save current state to redo history
    current_df = utils.read_tabular(dbf.stored_path)
    crud.create_redo_entry(db, file_id=file_id, modifications=current_df.to_json(orient='split'))

    # Restore from undo history
    df = pd.read_json(last_mod.modifications, orient='split')
    
    # Save the reverted DataFrame to the file
    if dbf.stored_path.lower().endswith('.xlsx'):
        df.to_excel(dbf.stored_path, index=False)
    else:
        df.to_csv(dbf.stored_path, index=False)

    # Delete the last modification from the history
    db.delete(last_mod)
    db.commit()

    return {
        'total_rows': len(df),
        'data': utils.clean_data(df.to_dict(orient='records'))
    }

@app.post("/redo/{file_id}")
async def redo_modification(file_id: int, db: Session = Depends(get_db)):
    last_redo = crud.get_last_redo_entry(db, file_id)
    if not last_redo:
        raise HTTPException(status_code=404, detail="No modifications to redo")

    dbf = crud.get_uploaded_file(db, file_id)
    if not dbf:
        raise HTTPException(status_code=404, detail="File not found")

    # Save current state to undo history
    current_df = utils.read_tabular(dbf.stored_path)
    mod_history = models.ModificationHistory(
        file_id=file_id,
        modifications=current_df.to_json(orient='split')
    )
    db.add(mod_history)
    db.commit()

    # Restore from redo history
    df = pd.read_json(last_redo.modifications, orient='split')
    
    # Save the reverted DataFrame to the file
    if dbf.stored_path.lower().endswith('.xlsx'):
        df.to_excel(dbf.stored_path, index=False)
    else:
        df.to_csv(dbf.stored_path, index=False)

    # Delete the last redo from the history
    crud.delete_last_redo_entry(db, file_id)

    return {
        'total_rows': len(df),
        'data': utils.clean_data(df.to_dict(orient='records'))
    }

@app.post("/reset/{file_id}")
async def reset_file(file_id: int, db: Session = Depends(get_db)):
    # Get all modification history ordered by id ASC (oldest first)
    first_mod = db.query(models.ModificationHistory).filter(models.ModificationHistory.file_id == file_id).order_by(models.ModificationHistory.id.asc()).first()
    
    if not first_mod:
        # Check if we have any RedoHistory (which means we undid something)
        # If we undid everything, we are effectively at original state, 
        # but let's clear redo history to be clean.
        db.query(models.RedoHistory).filter(models.RedoHistory.file_id == file_id).delete()
        db.commit()
        return {"message": "File is already in original state."}

    dbf = crud.get_uploaded_file(db, file_id)
    if not dbf:
        raise HTTPException(status_code=404, detail="File not found")

    # Restore from the oldest modification history
    # mod_history stores the state *before* the modification.
    try:
        df = pd.read_json(first_mod.modifications, orient='split')
        
        # Save to file
        if dbf.stored_path.lower().endswith('.xlsx'):
            df.to_excel(dbf.stored_path, index=False)
        else:
            df.to_csv(dbf.stored_path, index=False)
            
        # Clear ALL history for this file
        db.query(models.ModificationHistory).filter(models.ModificationHistory.file_id == file_id).delete()
        db.query(models.RedoHistory).filter(models.RedoHistory.file_id == file_id).delete()
        db.commit()
        
        return {
            'total_rows': len(df),
            'data': utils.clean_data(df.to_dict(orient='records'))
        }
    except Exception as e:
        print(f"Error resetting file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to reset file: {str(e)}")

@app.post("/download-modified-file/{file_id}")
async def download_modified_file(file_id: int, request: schemas.ModificationRequest, current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(get_db)):
    if current_user.provider == "demo":
        raise HTTPException(status_code=403, detail="Download feature is not available in demo mode.")

    dbf = crud.get_uploaded_file(db, file_id)
    if not dbf:
        raise HTTPException(status_code=404, detail="File not found")

    df = utils.read_tabular(dbf.stored_path)
    df = apply_modifications(df, request.modifications, db, file_id)

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

@app.post("/apply-modifications/{file_id}")
async def apply_modifications_to_file(file_id: int, request: schemas.ApplyModificationRequest, current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(get_db)):
    print("Received request to apply modifications.")
    print(f"File ID: {file_id}")
    print(f"Request body: {request.dict()}")
    dbf = crud.get_uploaded_file(db, file_id)
    if not dbf:
        raise HTTPException(status_code=404, detail="File not found")

    if not auth.user_owns_project(current_user, dbf.project):
        raise HTTPException(status_code=403, detail="Not authorized to modify this file")

    df = utils.read_tabular(dbf.stored_path)
    df = apply_modifications(df, request.modifications, db, file_id)

    # Save the modified DataFrame back to the original file
    print("Saving modified dataframe...")
    if dbf.stored_path.lower().endswith('.xlsx'):
        df.to_excel(dbf.stored_path, index=False)
    else:
        df.to_csv(dbf.stored_path, index=False)
    print("Dataframe saved.")

    print("Creating history entry...")
    crud.create_history_entry(db, schemas.HistoryCreate(
        project_id=dbf.project_id,
        user_id=current_user.id,
        file_id=file_id,
        operation="apply_modifications",
        details=json.dumps({"modifications": [mod.dict() for mod in request.modifications]})
    ))
    print("History entry created.")

    return {"message": "Modifications applied and file saved successfully."}
@app.post("/projects/{project_id}/formulas/", response_model=schemas.Formula)
def create_formula(project_id: int, formula: schemas.FormulaBase, db: Session = Depends(get_db)):
    return crud.create_formula(db=db, formula=formula, project_id=project_id)

@app.get("/projects/{project_id}/formulas/", response_model=List[schemas.Formula])
def read_formulas(project_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    formulas = crud.get_formulas(db, project_id=project_id, skip=skip, limit=limit)
    return formulas

@app.get("/projects/{project_id}/formulas/{formula_id}", response_model=schemas.Formula)
def read_formula(project_id: int, formula_id: int, db: Session = Depends(get_db)):
    db_formula = crud.get_formula(db, formula_id=formula_id, project_id=project_id)
    if db_formula is None:
        raise HTTPException(status_code=404, detail="Formula not found")
    return db_formula

@app.delete("/projects/{project_id}/formulas/{formula_id}", response_model=schemas.Formula)
def delete_formula(project_id: int, formula_id: int, db: Session = Depends(get_db)):
    db_formula = crud.delete_formula(db, formula_id=formula_id, project_id=project_id)
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
    return utils.clean_data(stats)

# ============== AUTHENTICATION ENDPOINTS ==============

# Normal email/password authentication
@app.post("/auth/register", response_model=schemas.TokenResponse)
async def register_user(user: schemas.UserRegister, db: Session = Depends(get_db)):
    """Register a new user with email and password"""
    print("Attempting to register user:", user.email)
    try:
        # Check if user already exists
        print("Checking for existing user...")
        existing_user = crud.get_user_by_email(db, email=user.email)
        if existing_user:
            print("User already exists.")
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Hash password and create user
        print("Hashing password...")
        password_hash = auth.get_password_hash(user.password)
        print("Creating user in database...")
        db_user = crud.create_user_with_password(db=db, user=user, password_hash=password_hash)
        print("User created:", db_user.id)
        
        # Create JWT token
        print("Creating JWT token...")
        access_token_expires = auth.timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
        jwt_token = auth.create_access_token(
            data={"sub": str(db_user.id)}, expires_delta=access_token_expires
        )
        refresh_token = auth.create_refresh_token(data={"sub": str(db_user.id)})
        
        # Store refresh token in the database
        print("Storing refresh token...")
        db_user.refresh_token = refresh_token
        db_user.refresh_token_expires_at = auth.datetime.utcnow() + auth.timedelta(days=auth.REFRESH_TOKEN_EXPIRE_DAYS)
        db.commit()
        print("User registration successful.")
        
        return schemas.TokenResponse(
            access_token=jwt_token,
            token_type="bearer",
            user=db_user,
            refresh_token=refresh_token
        )
    except Exception as e:
        print(f"An error occurred during user registration: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during registration")

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
    refresh_token = auth.create_refresh_token(data={"sub": str(authenticated_user.id)})
    
    # Store refresh token in the database
    authenticated_user.refresh_token = refresh_token
    authenticated_user.refresh_token_expires_at = auth.datetime.utcnow() + auth.timedelta(days=auth.REFRESH_TOKEN_EXPIRE_DAYS)
    db.commit()
    
    return schemas.TokenResponse(
        access_token=jwt_token,
        token_type="bearer",
        user=authenticated_user,
        refresh_token=refresh_token
    )

@app.post("/auth/demo", response_model=schemas.TokenResponse)
async def demo_login(db: Session = Depends(get_db)):
    """Login as a demo user"""
    # Create unique demo user
    demo_id = str(uuid.uuid4())
    email = f"demo_{demo_id}@cleansingapp.com"
    name = "Demo User"
    
    # Create user
    user_create = schemas.UserCreate(
        email=email,
        name=name,
        provider="demo",
        password=demo_id # Use ID as password for internal consistency, though it won't be used for login
    )
    user = crud.create_user(db, user_create)
    
    # Create a default project for the demo user
    project_create = schemas.ProjectCreate(
        name="Demo Project",
        description="A temporary project for demo purposes"
    )
    crud.create_project(db, project_create, owner_id=user.id)
    
    # Create JWT token
    access_token_expires = auth.timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    jwt_token = auth.create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    refresh_token = auth.create_refresh_token(data={"sub": str(user.id)})
    
    # Store refresh token
    user.refresh_token = refresh_token
    user.refresh_token_expires_at = auth.datetime.utcnow() + auth.timedelta(days=auth.REFRESH_TOKEN_EXPIRE_DAYS)
    db.commit()
    
    return schemas.TokenResponse(
        access_token=jwt_token,
        token_type="bearer",
        user=user,
        refresh_token=refresh_token
    )

# Google OAuth
@app.get("/auth/google/url")
def get_google_auth_url():
    """Get Google OAuth login URL"""
    return {"auth_url": auth.get_google_auth_url()}

@app.post("/auth/google/callback")
async def google_auth_callback(code: str = Body(..., embed=True), db: Session = Depends(get_db)):
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
    refresh_token = auth.create_refresh_token(data={"sub": str(user.id)})
    
    # Store refresh token in the database
    user.refresh_token = refresh_token
    user.refresh_token_expires_at = auth.datetime.utcnow() + auth.timedelta(days=auth.REFRESH_TOKEN_EXPIRE_DAYS)
    db.commit()
    
    return schemas.TokenResponse(
        access_token=jwt_token,
        token_type="bearer",
        user=user,
        refresh_token=refresh_token
    )

@app.post("/auth/refresh", response_model=schemas.TokenResponse)
async def refresh_token(request: schemas.RefreshTokenRequest, db: Session = Depends(get_db)):
    """Refresh access token"""
    user_id = auth.verify_token(request.refresh_token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = crud.get_user(db, user_id=user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if user.refresh_token != request.refresh_token or user.refresh_token_expires_at < auth.datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create new access token
    access_token_expires = auth.timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    jwt_token = auth.create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    
    return schemas.TokenResponse(
        access_token=jwt_token,
        token_type="bearer",
        user=user,
        refresh_token=request.refresh_token
    )

@app.post("/auth/logout")
async def logout(current_user: models.User = Depends(auth.get_current_active_user), db: Session = Depends(get_db)):
    """Logout user"""
    if current_user:
        crud.update_user_refresh_token(db, user_id=current_user.id, refresh_token=None, expires_at=None)
    return {"message": "Logout successful"}


@app.get("/auth/me", response_model=schemas.User)
def get_current_user_info(current_user: models.User = Depends(auth.get_current_active_user)):
    """Get current user information"""
    return current_user

# ============== PROJECT MANAGEMENT ENDPOINTS ==============

@app.post("/legacy_chat")
async def legacy_chat(prompt: schemas.Prompt, db: Session = Depends(get_db)):
    if prompt.file_id:
        dbf = crud.get_uploaded_file(db, prompt.file_id)
        if not dbf:
            raise HTTPException(status_code=404, detail="File not found")
        df = utils.read_tabular(dbf.stored_path)
        columns = df.columns.tolist()

        system_prompt = f"""
You are a data cleansing assistant. The user will provide a request to cleanse a dataset.
The dataset has the following columns: {columns}.

Your task is to understand the user's request and suggest a data cleansing operation in JSON format.

When the user asks to correct spellings, names, or abbreviations in a column, you should generate a mapping of original values to corrected values.
For example, if the user wants to correct company names, the JSON object should have the following structure:
{{
  "type": "rule",
  "rule": {{
    "column_name": "Company",
    "rule_type": "correct_spelling",
    "payload": {{
      "mapping": {{
        "Google Inc.": "Google",
        "Alphabet Inc.": "Google",
        "Microsft": "Microsoft",
        "Apple Inc": "Apple"
      }}
    }}
  }}
}}

If the user's request is about correcting date formats, the JSON object should have the following structure:
{{
  "type": "rule",
  "rule": {{
    "column_name": "<column_to_cleanse>",
    "rule_type": "correct_date",
    "payload": {{
      "target_format": "<date_format>"
    }}
  }}
}}

If the user asks to remove duplicate rows, the JSON object should have the following structure:
{{
  "type": "remove_duplicates",
  "remove_duplicates": true
}}

If the user asks to search for a row, the JSON object should have the following structure:
{{
  "type": "search",
  "search_query": "<search_query>"
}}

If you cannot determine a suitable operation, respond with a clarifying question.
Do not have any other text in the response, only the JSON.
"""
        
        try:
            response = utils.deepseek_client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt.prompt},
                ],
            )
            
            suggestion_str = response.choices[0].message.content
            suggestion = json.loads(suggestion_str)
            
            return {
                "response": f"I suggest the following operation:",
                "suggestion": suggestion
            }

        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    else:
        try:
            response = utils.deepseek_client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {
                        "role": "user",
                        "content": prompt.prompt,
                    },
                ],
            )
            return {"response": response.choices[0].message.content}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))



@app.get("/projects", response_model=List[schemas.Project])
def get_all_projects(
    skip: int = 0, 
    limit: int = 100, 
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all projects for all users (authenticated)."""
    projects = crud.get_all_projects(db, skip=skip, limit=limit)
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



@app.post("/cleanse/group-suggestions/{file_id}")
async def group_suggestions(file_id: int, request: schemas.GroupSuggestionsRequest, db: Session = Depends(get_db)):
    dbf = crud.get_uploaded_file(db, file_id)
    if not dbf:
        raise HTTPException(status_code=404, detail="File not found")

    df = utils.read_tabular(dbf.stored_path)
    
    if request.column_name not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{request.column_name}' not found in file.")

    unique_values = df[request.column_name].unique().tolist()
    unique_values = [val for val in unique_values if pd.notna(val) and isinstance(val, str)]

    groups = utils.group_similar_strings(unique_values, threshold=request.threshold)

    return {"groups": groups}

@app.post("/cleanse/country-suggestions/{file_id}")
async def country_suggestions(file_id: int, request: schemas.GroupSuggestionsRequest, db: Session = Depends(get_db)):
    dbf = crud.get_uploaded_file(db, file_id)
    if not dbf:
        raise HTTPException(status_code=404, detail="File not found")

    df = utils.read_tabular(dbf.stored_path)
    
    if request.column_name not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{request.column_name}' not found in file.")

    unique_values = df[request.column_name].unique().tolist()
    unique_values = [val for val in unique_values if pd.notna(val)]

    groups = utils.group_countries(unique_values)

    return {"groups": groups}


@app.post("/cleanse/detect-anomalies/{file_id}")
async def detect_anomalies(file_id: int, request: schemas.AnomalyDetectionRequest, db: Session = Depends(get_db)):
    dbf = crud.get_uploaded_file(db, file_id)
    if not dbf:
        raise HTTPException(status_code=404, detail="File not found")

    df = utils.read_tabular(dbf.stored_path)
    
    results = utils.detect_anomalies_and_duplicates(df, request.column_name, request.detection_type)

    return results

@app.post("/files/{file_id}/apply_rule")
async def apply_rule_from_chat(file_id: int, tool: schemas.Tool, db: Session = Depends(get_db)):
    dbf = crud.get_uploaded_file(db, file_id)
    if not dbf:
        raise HTTPException(status_code=404, detail="File not found")

    df = utils.read_tabular(dbf.stored_path)

    try:
        if tool.tool == "apply_rule":
            rule = tool.parameters
            if rule.get("rule_type") == "correct_date":
                df = utils.correct_date_format(
                    df, rule.get("column_name"), target_format=rule.get("target_format")
                )

        # Save the modified DataFrame back to the original file
        if dbf.stored_path.lower().endswith(".xlsx"):
            df.to_excel(dbf.stored_path, index=False)
        else:
            df.to_csv(dbf.stored_path, index=False)

        return {"message": f"Rule '{tool.tool}' applied successfully."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/projects/{project_id}/history", response_model=List[schemas.History])
def get_project_history(
    project_id: int,
    current_user: models.User = Depends(auth.get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get project history (accessible to any authenticated user)."""
    project = crud.get_project(db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Ownership check removed per visibility requirement
    return crud.get_project_history(db, project_id=project_id)
