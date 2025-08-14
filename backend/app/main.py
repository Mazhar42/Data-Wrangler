
import os
import re
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session
from . import models, schemas, crud, ai, utils
from .database import engine, Base, get_db
import pandas as pd
import numpy as np
import uuid
import json
from fastapi.middleware.cors import CORSMiddleware

Base.metadata.create_all(bind=engine)

app = FastAPI(title='Data Cleansing Backend (Starter)')

origins = [
    "http://localhost",
    "http://localhost:5174",
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post('/upload', response_model=schemas.UploadResponse)
async def upload_file(file: UploadFile = File(...), db: Session = Depends(get_db)):
    # save file to disk
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ('.csv', '.xls', '.xlsx'):
        raise HTTPException(status_code=400, detail='Unsupported file type. Use CSV or Excel.')
    stored_name = f"{uuid.uuid4().hex}_{file.filename}"
    stored_path = os.path.join(UPLOAD_DIR, stored_name)
    with open(stored_path, 'wb') as f:
        content = await file.read()
        f.write(content)
    # create DB record
    db_obj = crud.create_uploaded_file(db, filename=file.filename, stored_path=stored_path)
    return {'file_id': db_obj.id, 'filename': file.filename, 'message': 'File processed'}

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


@app.post('/keep-unique-columns/{file_id}')
def keep_unique_columns(file_id: int, columns: list, keep: bool = True, db: Session = Depends(get_db)):
    dbf = crud.get_uploaded_file(db, file_id)
    if not dbf:
        raise HTTPException(status_code=404, detail='File not found')
    # apply choice by dropping columns if keep=False
    df = utils.read_tabular(dbf.stored_path)
    if not keep:
        df = df.drop(columns=columns)
        # overwrite stored file with cleaned version
        new_path = dbf.stored_path.replace('.','_cleaned.')
        df.to_csv(new_path, index=False)
        dbf.stored_path = new_path
        db.commit()
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
    # write cleaned file
    cleaned_path = dbf.stored_path.replace('.','_cleaned.')
    df.to_csv(cleaned_path, index=False)
    dbf.stored_path = cleaned_path
    db.commit()
    return {'ok': True, 'cleaned_path': cleaned_path}

ALLOWED_FUNCTIONS = ['abs', 'round']
ALLOWED_OPERATORS = ['+', '-', '*', '/']

def sanitize_formula(formula: str, columns: list) -> str:
    # Remove any characters that are not allowed
    sanitized = re.sub(r'[^a-zA-Z0-9_+\-*/(). ]', '', formula)

    # Check for allowed functions
    for func in re.findall(r'[a-zA-Z_][a-zA-Z0-9_]*', sanitized):
        if func not in ALLOWED_FUNCTIONS and func not in columns:
            raise ValueError(f"Function or column '{func}' is not allowed.")

    return sanitized

@app.post('/files/{file_id}/apply_formula')
async def apply_formula(file_id: int, equation: schemas.Equation, db: Session = Depends(get_db)):
    dbf = crud.get_uploaded_file(db, file_id)
    if not dbf:
        raise HTTPException(status_code=404, detail='File not found')

    df = utils.read_tabular(dbf.stored_path)
    
    try:
        sanitized_expression = sanitize_formula(equation.formula_expression, df.columns)
        df[equation.formula_name] = df.eval(sanitized_expression)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid formula: {e}")

    # Save the cleaned file
    base, ext = os.path.splitext(dbf.stored_path)
    cleaned_path = f"{base}_cleaned{ext}"
    
    if ext.lower() == '.xlsx':
        df.to_excel(cleaned_path, index=False)
    else:
        df.to_csv(cleaned_path, index=False)

    # Update the stored path in the database
    dbf.stored_path = cleaned_path
    db.commit()
    db.refresh(dbf)

    # Replace non-compliant values with None for JSON compatibility
    start = (equation.page - 1) * equation.per_page
    end = start + equation.per_page
    df_page = df.iloc[start:end].replace([np.inf, -np.inf], np.nan)
    df_page = df_page.where(pd.notna(df_page), None)

    return {
        'total_rows': len(df),
        'data': df_page.to_dict(orient='records')
    }

@app.post('/files/{file_id}/clean')
async def clean_file(file_id: int, request: schemas.CleansingRequest, db: Session = Depends(get_db)):
    dbf = crud.get_uploaded_file(db, file_id)
    if not dbf:
        raise HTTPException(status_code=404, detail='File not found')

    df = utils.read_tabular(dbf.stored_path)

    for rule in request.column_rules:
        if rule.active:
            try:
                if rule.rule_type == 'correct_date':
                    df = utils.correct_date_format(df, rule.column_name, **rule.payload)
                elif rule.rule_type == 'correct_country':
                    df = utils.correct_country_spelling(df, rule.column_name, **rule.payload)
                # Add other rule types here as needed
            except ValueError as e:
                raise HTTPException(status_code=400, detail=f"Error applying rule to column {rule.column_name}: {e}")

    # For waterfall rules, you might want to validate and then decide what to do with the data
    # For now, just validate and return status, not modify the DF based on it directly
    for rule in request.waterfall_rules:
        if rule.validate_equation:
            validation_result = utils.validate_waterfall(df, rule.equation, rule.tolerance)
            if not validation_result.get('ok'):
                # You might want to handle this differently, e.g., log, or return a warning
                print(f"Waterfall validation failed: {validation_result.get('error')}")

    # Save the cleaned file
    base, ext = os.path.splitext(dbf.stored_path)
    cleaned_path = f"{base}_cleaned{ext}"
    
    if ext.lower() == '.xlsx':
        df.to_excel(cleaned_path, index=False)
    else:
        df.to_csv(cleaned_path, index=False)

    # Update the stored path in the database
    dbf.stored_path = cleaned_path
    db.commit()
    db.refresh(dbf)

    # Pagination for the preview
    start = (request.page - 1) * request.per_page
    end = start + request.per_page
    df_preview = df.iloc[start:end].replace([np.inf, -np.inf], np.nan).where(pd.notna(df.iloc[start:end]), None)

    return {
        'message': 'File cleansing completed',
        'file_id': file_id,
        'cleaned_path': cleaned_path,
        'preview': df_preview.to_dict(orient='records'),
        'total_rows': len(df)
    }

@app.get('/cleaned-file/{file_id}')
def download_cleaned(file_id: int, db: Session = Depends(get_db)):
    dbf = crud.get_uploaded_file(db, file_id)
    if not dbf:
        raise HTTPException(status_code=404, detail='File not found')
    return FileResponse(dbf.stored_path, filename=os.path.basename(dbf.stored_path))
