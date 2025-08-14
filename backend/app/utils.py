import pandas as pd
import itertools
import os
from fastapi import HTTPException
from dateutil.parser import parse as date_parse

def read_tabular(path):
    """
    Read CSV or Excel into pandas DataFrame.
    """
    try:
        if path.lower().endswith('.csv'):
            return pd.read_csv(path)
        else:
            # try excel
            return pd.read_excel(path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading file: {e}")

def detect_unique_columns(df, max_combo=3):
    n = len(df)
    candidates = []
    # single columns
    for c in df.columns:
        if df[c].nunique(dropna=False) == n:
            candidates.append([c])
    # combinations up to max_combo
    for r in range(2, max_combo+1):
        for combo in itertools.combinations(df.columns, r):
            if df[list(combo)].drop_duplicates().shape[0] == n:
                candidates.append(list(combo))
    return list(df.columns), candidates # Return all columns and candidates

def validate_waterfall(df, equation: str, tolerance=1e-6):
    """
    Expect equation like 'total = base - discount + rebate'.
    Returns dict with status and first failing row index if any.
    """
    equation = equation.strip()
    if '=' not in equation:
        return {'ok': False, 'error': 'Equation must contain = sign'}
    target, expr = [s.strip() for s in equation.split('=', 1)]
    # ensure target exists and expression columns exist
    # We'll use pandas.eval for vectorized evaluation
    try:
        import pandas as pd
        # safe eval: allow only column names and python operators
        # replace column references to ensure they map to df[...] style
        # We'll create a local namespace where column names are variables
        local_ns = {c: df[c] for c in df.columns}
        result_series = pd.eval(expr, local_dict=local_ns)
        if target not in df.columns:
            return {'ok': False, 'error': f'Target column "{target}" not present in data'}
        diff = (df[target] - result_series).abs()
        failing = diff > tolerance
        if failing.any():
            first_idx = failing.idxmax()
            return {'ok': False, 'error': 'Mismatch in rows', 'first_fail_index': int(first_idx)}
        return {'ok': True}
    except Exception as e:
        return {'ok': False, 'error': str(e)}

def correct_date_format(df: pd.DataFrame, column_name: str, target_format: str = '%Y-%m-%d'):
    """
    Corrects date formats in a specified column to a target format.
    Invalid dates will be set to NaT (Not a Time).
    """
    if column_name not in df.columns:
        raise ValueError(f"Column '{column_name}' not found in DataFrame.")
    
    # Attempt to convert to datetime, coercing errors to NaT
    df[column_name] = pd.to_datetime(df[column_name], errors='coerce')
    
    # Convert back to string in target format, NaT becomes NaN
    df[column_name] = df[column_name].dt.strftime(target_format).fillna('')
    return df

def correct_country_spelling(df: pd.DataFrame, column_name: str, mapping: dict = None):
    """
    Corrects country spellings/abbreviations in a specified column using a mapping.
    """
    if column_name not in df.columns:
        raise ValueError(f"Column '{column_name}' not found in DataFrame.")

    # Default mapping for common cases
    if mapping is None:
        mapping = {
            'US': 'United States',
            'USA': 'United States',
            'UK': 'United Kingdom',
            'GB': 'United Kingdom',
            'CA': 'Canada',
            'DE': 'Germany',
            'FR': 'France',
            'JP': 'Japan',
            'CN': 'China',
            'IND': 'India',
            'IN': 'India',
            'Brasil': 'Brazil',
            'U.S.A.': 'United States',
            'United Sates': 'United States', # Common misspelling
            'BD' : 'Bangladesh'
        }
    
    # Apply the mapping
    df[column_name] = df[column_name].replace(mapping)
    return df