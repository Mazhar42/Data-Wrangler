# POTENTIALLY UNUSED: This entire file appears to be unused.
"""
Shared dependencies for FastAPI routes.
Handles dataset loading and caching.
"""

import pandas as pd
from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

from . import crud, utils
from .database import get_db

# Simple in-memory storage of datasets
DATASETS: dict[int, pd.DataFrame] = {}


def save_dataset(file_id: int, df: pd.DataFrame):
    DATASETS[file_id] = df


def get_dataset(file_id: int, db: Session = Depends(get_db)) -> pd.DataFrame:
    # 1. Try to get from in-memory cache first
    df = DATASETS.get(file_id)
    if df is not None:
        return df

    # 2. If not in cache, load from disk using path from DB
    db_file = crud.get_uploaded_file(db, file_id=file_id)
    if not db_file:
        raise HTTPException(status_code=404, detail=f"File record for id {file_id} not found in database.")

    try:
        df = utils.read_tabular(db_file.stored_path)
        # 3. Store it in the cache for next time
        save_dataset(file_id, df)
        return df
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Dataset file not found on disk at path: {db_file.stored_path}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load dataset {file_id}: {e}")
