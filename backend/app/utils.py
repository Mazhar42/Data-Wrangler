import pandas as pd
import itertools
import os
from openai import OpenAI
from fastapi import HTTPException
from dateutil.parser import parse as date_parse
import numpy as np
import pycountry
from fuzzywuzzy import process, fuzz
import networkx as nx
from sklearn.metrics.pairwise import cosine_similarity

# Configure DeepSeek API key
api_key = os.getenv("DEEPSEEK_API_KEY")
if api_key:
    deepseek_client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com")
else:
    deepseek_client = None

def clean_data(data):
    if isinstance(data, list):
        return [clean_data(item) for item in data]
    if isinstance(data, dict):
        return {key: clean_data(value) for key, value in data.items()}
    if isinstance(data, float) and np.isnan(data):
        return None
    return data

def apply_filter(df: pd.DataFrame, criteria: dict) -> pd.Series:
    """
    Filters a DataFrame based on the given criteria and returns a boolean mask.
    """
    if not criteria:
        return pd.Series([True] * len(df), index=df.index)

    if 'logical_operator' in criteria and 'conditions' in criteria:
        # Complex query with logical operators
        logical_operator = criteria['logical_operator']
        conditions = criteria['conditions']
        
        if not conditions:
            return pd.Series([True] * len(df), index=df.index)

        # Initialize a boolean series
        combined_mask = pd.Series([True] * len(df), index=df.index)
        if logical_operator.lower() == 'and':
            combined_mask = pd.Series([True] * len(df), index=df.index)
        elif logical_operator.lower() == 'or':
            combined_mask = pd.Series([False] * len(df), index=df.index)

        for condition in conditions:
            mask = apply_filter(df, condition)
            if logical_operator.lower() == 'and':
                combined_mask &= mask
            elif logical_operator.lower() == 'or':
                combined_mask |= mask
            else:
                raise ValueError(f"Unsupported logical operator: {logical_operator}")
        return combined_mask

    # Simple query
    column = criteria.get('column')
    operator = criteria.get('operator')
    value = criteria.get('value')
    compare_column = criteria.get('compare_column')

    if not all([column, operator]):
        raise ValueError("Invalid filter criteria: missing column or operator")

    if value is None and not compare_column and operator not in ['is_empty', 'is_not_empty']:
        raise ValueError("Invalid filter criteria: missing value or compare_column")

    if column not in df.columns:
        raise ValueError(f"Column '{column}' not found in DataFrame.")

    if compare_column:
        if compare_column not in df.columns:
            raise ValueError(f"Compare column '{compare_column}' not found in DataFrame.")
        value = df[compare_column]

    numeric_operators = ['>', '<', '>=', '<=', 'greater_than', 'less_than', 'greater_than_or_equal_to', 'less_than_or_equal_to']
    if operator in numeric_operators:
        try:
            numeric_column = pd.to_numeric(df[column], errors='coerce')
            numeric_value = pd.to_numeric(value, errors='coerce')

            if operator == '>' or operator == 'greater_than':
                return numeric_column > numeric_value
            elif operator == '<' or operator == 'less_than':
                return numeric_column < numeric_value
            elif operator == '>=' or operator == 'greater_than_or_equal_to':
                return numeric_column >= numeric_value
            elif operator == '<=' or operator == 'less_than_or_equal_to':
                return numeric_column <= numeric_value
        except (ValueError, TypeError):
            return pd.Series([False] * len(df), index=df.index)

    # Attempt to convert column to datetime if the value is a date
    is_date_value = False
    if not compare_column:
        try:
            date_parse(str(value))
            is_date_value = True
        except (ValueError, TypeError):
            pass

    if is_date_value and not compare_column:
        try:
            # Convert the column to datetime, coercing errors will turn unparseable dates into NaT
            df[column] = pd.to_datetime(df[column], errors='coerce')
            value = date_parse(str(value)) # Convert string value to datetime object
        except Exception:
            pass # if it fails, treat as string comparison
    
    # Perform comparison based on operator
    if operator == '==' or operator == 'equal':
        return df[column] == value
    elif operator == '!=' or operator == 'not_equal':
        return df[column] != value
    elif operator == 'contains':
        val_str = value.astype(str) if isinstance(value, pd.Series) else str(value)
        if isinstance(value, pd.Series):
             return df[column].astype(str).str.contains(val_str, case=False, na=False, regex=False)
        return df[column].astype(str).str.contains(val_str, case=False, na=False)
    elif operator == 'not_contains':
        val_str = value.astype(str) if isinstance(value, pd.Series) else str(value)
        if isinstance(value, pd.Series):
             return ~df[column].astype(str).str.contains(val_str, case=False, na=False, regex=False)
        return ~df[column].astype(str).str.contains(val_str, case=False, na=False)
    elif operator == 'starts_with':
        val_str = value.astype(str) if isinstance(value, pd.Series) else str(value)
        if isinstance(value, pd.Series):
             # Vectorized startswith not directly supported with another series in older pandas?
             # Actually str.startswith accepts a tuple, not a series.
             # We might need list comprehension or apply for column-column string comparison
             return df.apply(lambda row: str(row[column]).startswith(str(row[compare_column])), axis=1)
        return df[column].astype(str).str.startswith(val_str, na=False)
    elif operator == 'ends_with':
        val_str = value.astype(str) if isinstance(value, pd.Series) else str(value)
        if isinstance(value, pd.Series):
             return df.apply(lambda row: str(row[column]).endswith(str(row[compare_column])), axis=1)
        return df[column].astype(str).str.endswith(val_str, na=False)
    elif operator == 'is_empty':
        return df[column].isnull() | (df[column] == '')
    elif operator == 'is_not_empty':
        return df[column].notnull() & (df[column] != '')
    else:
        raise ValueError(f"Unsupported operator: {operator}")

def read_tabular(path):
    """
    Read CSV or Excel into pandas DataFrame.
    """
    try:
        if path.lower().endswith('.csv'):
            # Read as string to preserve original formatting
            # keep_default_na=False prevents pandas from interpreting 'NA', 'null' etc as NaN
            return pd.read_csv(path, dtype=str, keep_default_na=False)
        else:
            # try excel
            return pd.read_excel(path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading file: {e}")

def save_tabular(df: pd.DataFrame, path: str):
    """
    Save pandas DataFrame to CSV or Excel.
    """
    try:
        if path.lower().endswith('.csv'):
            df.to_csv(path, index=False)
        else:
            # try excel
            df.to_excel(path, index=False)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error saving file: {e}")

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

    # Map common user-friendly formats to strftime formats
    format_mapping = {
        'DD/MM/YYYY': '%d/%m/%Y',
        'MM/DD/YYYY': '%m/%d/%Y',
        'YYYY-MM-DD': '%Y-%m-%d',
        'DD-MM-YYYY': '%d-%m-%Y',
        'dd/mm/yyyy': '%d/%m/%Y',
        'mm/dd/yyyy': '%m/%d/%Y',
        'yyyy-mm-dd': '%Y-%m-%d',
        'dd-mm-yyyy': '%d-%m-%Y',
    }
    if target_format in format_mapping:
        target_format = format_mapping[target_format]
    
    # Attempt to convert to datetime, coercing errors to NaT
    # infer_datetime_format is deprecated in newer pandas, so we rely on to_datetime's smarts
    df[column_name] = pd.to_datetime(df[column_name], errors='coerce')
    
    # Handle NaT values before formatting
    # NaT values will be converted to empty strings
    df[column_name] = df[column_name].apply(lambda x: x.strftime(target_format) if pd.notnull(x) else '')
    return df

def correct_country_spelling(df: pd.DataFrame, column_name: str, mapping: dict = None):
    """
    Corrects country spellings/abbreviations in a specified column using a custom mapping and fuzzy matching.
    """
    if column_name not in df.columns:
        raise ValueError(f"Column '{column_name}' not found in DataFrame.")

    # Custom mapping for common abbreviations and misspellings
    custom_mapping = {
        'UK': 'United Kingdom',
        'U.K': 'United Kingdom',
        'GB': 'United Kingdom',
        'USA': 'United States',
        'U.S.A.': 'United States',
        'U.S.': 'United States',
        'CA': 'Canada',
        'DE': 'Germany',
        'FR': 'France',
        'JP': 'Japan',
        'CN': 'China',
        'IND': 'India',
        'IN': 'India',
        'BRASIL': 'Brazil',
        'UNITED SATES': 'United States',
        'BD' : 'Bangladesh'
    }

    # Get a list of official country names
    official_countries = [country.name for country in pycountry.countries]

    # Get unique country names from the dataframe column
    unique_countries = df[column_name].unique()

    # Create a mapping for correction
    correction_map = {}
    for country_name in unique_countries:
        if pd.isna(country_name):
            continue

        # 1. Check custom mapping (case-insensitive)
        if isinstance(country_name, str):
            processed_name = country_name.upper().replace('.', '')
            if processed_name in custom_mapping:
                correction_map[country_name] = custom_mapping[processed_name]
                continue

        # 2. Use fuzzy matching as a fallback
        match = process.extractOne(country_name, official_countries)

        if match and match[1] > 80:  # Using a threshold of 80
            correction_map[country_name] = match[0]

    # Apply the mapping
    df[column_name] = df[column_name].replace(correction_map)
    return df

def correct_spelling(df: pd.DataFrame, column_name: str, mapping: dict):
    """
    Corrects spellings in a specified column using a mapping.
    """
    if column_name not in df.columns:
        raise ValueError(f"Column '{column_name}' not found in DataFrame.")

    if not isinstance(mapping, dict):
        raise ValueError("Mapping must be a dictionary.")

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

    for column, searchTerm in search.items():
        if searchTerm:
            if column not in df.columns:
                raise ValueError(f"Column '{column}' not found in DataFrame.")
            df = df[df[column].astype(str).str.contains(searchTerm, case=False, na=False)]
            
    return df

def group_countries(unique_values: list) -> list:
    """
    Groups a list of country names using pycountry and fuzzy matching.
    Returns groups of original values, with a suggested corrected value for each group.
    """
    official_countries = [country.name for country in pycountry.countries]
    
    custom_mapping = {
        'UK': 'United Kingdom',
        'U.K': 'United Kingdom',
        'GB': 'United Kingdom',
        'USA': 'United States',
        'U.S.A.': 'United States',
        'U.S.': 'United States',
        'CA': 'Canada',
        'DE': 'Germany',
        'FR': 'France',
        'JP': 'Japan',
        'CN': 'China',
        'IND': 'India',
        'IN': 'India',
        'BRASIL': 'Brazil',
        'UNITED SATES': 'United States',
        'BD' : 'Bangladesh'
    }

    # Map each unique value to its suggested corrected name
    value_to_corrected_map = {}
    for country_name in unique_values:
        if pd.isna(country_name):
            continue
        
        corrected_name = None
        if isinstance(country_name, str):
            processed_name = country_name.upper().replace('.', '')
            if processed_name in custom_mapping:
                corrected_name = custom_mapping[processed_name]
            else:
                match = process.extractOne(country_name, official_countries)
                if match and match[1] > 80:
                    corrected_name = match[0]
        
        value_to_corrected_map[country_name] = corrected_name if corrected_name else country_name # If no correction, map to itself

    # Group original values by their suggested corrected name
    grouped_by_correction = {}
    for original_value, suggested_corrected_name in value_to_corrected_map.items():
        if suggested_corrected_name not in grouped_by_correction:
            grouped_by_correction[suggested_corrected_name] = []
        grouped_by_correction[suggested_corrected_name].append(original_value)

    output_groups = []
    for suggested_corrected_name, original_values_in_group in grouped_by_correction.items():
        output_groups.append({
            "suggested_corrected_name": suggested_corrected_name,
            "original_values": list(set(original_values_in_group))
        })

    return output_groups

def group_similar_strings(strings: list, threshold=85) -> list:
    """
    Groups a list of strings based on fuzzy string matching using a graph-based approach.
    Returns groups in the format: [{"suggested_corrected_name": str, "original_values": list}]
    """
    G = nx.Graph()
    G.add_nodes_from(strings)

    for i in range(len(strings)):
        for j in range(i + 1, len(strings)):
            s1 = strings[i]
            s2 = strings[j]
            score = fuzz.token_set_ratio(s1, s2)
            if score > threshold:
                G.add_edge(s1, s2)

    connected_components = list(nx.connected_components(G))
    
    output_groups = []
    for component in connected_components:
        original_values = list(component)
        # For generic strings, the suggested corrected name can be the longest string in the group
        # or simply the first one. Let's use the longest for better readability.
        suggested_corrected_name = max(original_values, key=len) if original_values else ""
        
        output_groups.append({
            "suggested_corrected_name": suggested_corrected_name,
            "original_values": original_values
        })

    return output_groups

def detect_anomalies_and_duplicates(df: pd.DataFrame, column_name: str, detection_type: str) -> dict:
    """
    Detects near-duplicate strings and anomalies in a column using embeddings.
    """
    if not deepseek_client:
        return {"near_duplicates": [], "anomalies": []}

    if column_name not in df.columns:
        raise ValueError(f"Column '{column_name}' not found in DataFrame.")

    unique_values = df[column_name].unique().tolist()
    unique_values = [str(val) for val in unique_values if pd.notna(val) and isinstance(val, (str, int, float))]

    if not unique_values:
        return {"near_duplicates": [], "anomalies": []}

    embeddings = []
    for value in unique_values:
        try:
            response = deepseek_client.embeddings.create(model='deepseek-embed', input=value)
            embeddings.append(response.data[0].embedding)
        except Exception as e:
            print(f"Error generating embedding for '{value}': {e}")
            # Handle error: e.g., skip this value or return an error
            continue

    if not embeddings:
        return {"near_duplicates": [], "anomalies": []}

    embeddings_np = np.array(embeddings)
    similarity_matrix = cosine_similarity(embeddings_np)

    near_duplicates = []
    anomalies = []

    # --- Near-Duplicate Detection (Clustering) ---
    # Using a simple thresholding approach for clustering
    # Create a graph where nodes are unique values and edges are similarities above a threshold
    G = nx.Graph()
    G.add_nodes_from(unique_values)

    embedding_threshold = 0.85 # Cosine similarity threshold for near-duplicates

    for i in range(len(unique_values)):
        for j in range(i + 1, len(unique_values)):
            if similarity_matrix[i, j] > embedding_threshold:
                G.add_edge(unique_values[i], unique_values[j])

    # Extract connected components as near-duplicate groups
    for component in nx.connected_components(G):
        if len(component) > 1:
            near_duplicates.append(list(component))

    # --- Anomaly Detection ---
    if detection_type == 'country':
        custom_mapping = {
            'UK': 'United Kingdom',
            'U.K': 'United Kingdom',
            'GB': 'United Kingdom',
            'USA': 'United States',
            'U.S.A.': 'United States',
            'U.S.': 'United States',
            'CA': 'Canada',
            'DE': 'Germany',
            'FR': 'France',
            'JP': 'Japan',
            'CN': 'China',
            'IND': 'India',
            'IN': 'India',
            'BRASIL': 'Brazil',
            'UNITED SATES': 'United States',
            'BD' : 'Bangladesh'
        }
        for value in unique_values:
            # Check if the value is a known country using pycountry
            is_country = False
            if isinstance(value, str):
                processed_name = value.upper().replace('.', '')
                if processed_name in custom_mapping:
                    is_country = True

            if not is_country:
                try:
                    pycountry.countries.lookup(value)
                    is_country = True
                except LookupError:
                    pass # Not a direct match
            
            # Also check common abbreviations/aliases not covered by direct lookup
            # This is a simplified check, a more robust one would involve fuzzy matching against all country names/aliases
            if not is_country:
                # Check if it's a known country by fuzzy matching against official names
                official_countries = [country.name for country in pycountry.countries]
                match = fuzz.ratio(value, 'United States') # Example: check against a common country
                if match < 50: # Arbitrary low threshold to flag very dissimilar items
                    anomalies.append(value)

    # For general type, anomalies could be values very far from any cluster, or outliers
    # This is more complex and might require density-based clustering (e.g., DBSCAN) or outlier detection
    # For now, we'll keep it simple and focus on country type anomalies.

    return {"near_duplicates": near_duplicates, "anomalies": anomalies}