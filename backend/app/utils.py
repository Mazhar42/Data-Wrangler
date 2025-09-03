import pandas as pd
import itertools
import os
from fastapi import HTTPException
from dateutil.parser import parse as date_parse

def apply_filter(df: pd.DataFrame, criteria: dict):
    """
    Filters a DataFrame based on the given criteria.
    """
    if not criteria:
        return df

    column = criteria.get('column')
    operator = criteria.get('operator')
    compare_target = criteria.get('compareTarget')

    if not all([column, operator, compare_target]):
        raise ValueError("Invalid filter criteria")

    if column not in df.columns:
        raise ValueError(f"Column '{column}' not found in DataFrame.")

    target_type = compare_target.get('type')
    target_value = compare_target.get('value')

    if target_type == 'column':
        if target_value not in df.columns:
            raise ValueError(f"Compare column '{target_value}' not found in DataFrame.")
        # Compare two columns
        if operator == '>':
            df = df[df[column] > df[target_value]]
        elif operator == '<':
            df = df[df[column] < df[target_value]]
        elif operator == '==':
            df = df[df[column] == df[target_value]]
        elif operator == '!=':
            df = df[df[column] != df[target_value]]
        elif operator == '>=':
            df = df[df[column] >= df[target_value]]
        elif operator == '<=':
            df = df[df[column] <= df[target_value]]
        else:
            raise ValueError(f"Unsupported operator for column comparison: {operator}")
    elif target_type == 'value':
        # Compare column with a custom value
        is_numeric_col = pd.api.types.is_numeric_dtype(df[column])
        
        if operator in ['>', '<', '==', '!=', '>=', '<=']:
            try:
                if is_numeric_col:
                    target_value = pd.to_numeric(target_value)
            except (ValueError, TypeError):
                if operator in ['>', '<', '>=', '<=']:
                    return df # Cannot perform numeric comparison
        
        if operator == '>':
            if is_numeric_col:
                df = df[df[column] > target_value]
        elif operator == '<':
            if is_numeric_col:
                df = df[df[column] < target_value]
        elif operator == '==':
            if is_numeric_col:
                df = df[df[column] == target_value]
            else:
                df = df[df[column].astype(str) == str(target_value)]
        elif operator == '!=':
            if is_numeric_col:
                df = df[df[column] != target_value]
            else:
                df = df[df[column].astype(str) != str(target_value)]
        elif operator == '>=':
            if is_numeric_col:
                df = df[df[column] >= target_value]
        elif operator == '<=':
            if is_numeric_col:
                df = df[df[column] <= target_value]
        elif operator == 'contains':
            df = df[df[column].astype(str).str.contains(target_value, case=False, na=False)]
        elif operator == 'not_contains':
            df = df[~df[column].astype(str).str.contains(target_value, case=False, na=False)]
        elif operator == 'starts_with':
            df = df[df[column].astype(str).str.startswith(target_value, na=False)]
        elif operator == 'ends_with':
            df = df[df[column].astype(str).str.endswith(target_value, na=False)]
        elif operator == 'is_empty':
            df = df[df[column].isnull() | (df[column] == '')]
        elif operator == 'is_not_empty':
            df = df[df[column].notnull() & (df[column] != '')]
        else:
            raise ValueError(f"Unsupported operator: {operator}")
    else:
        raise ValueError(f"Unsupported compare target type: {target_type}")

    return df

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

def apply_cell_edit(df: pd.DataFrame, edit: dict):
    """
    Applies a cell edit to the DataFrame.
    """
    if not edit:
        return df

    rowIndex = edit.get('rowIndex')
    columnKey = edit.get('columnKey')
    oldValue = edit.get('oldValue')
    newValue = edit.get('newValue')
    applyToAll = edit.get('applyToAll')

    if not all([rowIndex is not None, columnKey, oldValue is not None, newValue is not None, applyToAll is not None]):
        raise ValueError("Invalid cell edit")

    if columnKey not in df.columns:
        raise ValueError(f"Column '{columnKey}' not found in DataFrame.")

    is_numeric_col = pd.api.types.is_numeric_dtype(df[columnKey])

    if is_numeric_col:
        try:
            oldValue = pd.to_numeric(oldValue)
            newValue = pd.to_numeric(newValue)
        except (ValueError, TypeError):
            pass # Keep them as strings if conversion fails

    if applyToAll:
        df[columnKey] = df[columnKey].replace(oldValue, newValue)
    else:
        if rowIndex >= len(df):
            raise ValueError(f"Row index {rowIndex} is out of bounds.")
        df.at[rowIndex, columnKey] = newValue
        
    return df

def apply_column_search(df: pd.DataFrame, search: dict):
    """
    Applies a column search to the DataFrame.
    """
    if not search:
        return df

    column = search.get('column')
    searchTerm = search.get('searchTerm')

    if not all([column, searchTerm]):
        return df # Or raise an error, but returning df is safer

    if column not in df.columns:
        raise ValueError(f"Column '{column}' not found in DataFrame.")

    df = df[df[column].astype(str).str.contains(searchTerm, case=False, na=False)]
    return df
