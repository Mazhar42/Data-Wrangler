
# AI integration helpers (stubbed)
# Replace the stub below with an actual Ollama client call.
# Example (pseudo):
# from ollama import OllamaClient
# client = OllamaClient(...)
# resp = client.generate(model='llama3.2', prompt=..., max_tokens=...)

def call_ollama_for_suggestions(sample_rows, column_names):
    """
    Given sample_rows (list of dicts) and column_names (list),
    return a list of suggestion dicts like:
    [{ 'column': 'country', 'issue': 'abbreviation', 'suggestion': 'BD -> Bangladesh' }, ...]
    """
    # STUB: return some deterministic suggestions based on heuristics
    suggestions = []
    for col in column_names:
        if col.lower() in ('country', 'country_code', 'countryname'):
            suggestions.append({'column': col, 'issue': 'abbreviation', 'suggestion': 'BD -> Bangladesh', 'confidence': 0.9})
        if col.lower().endswith('date'):
            suggestions.append({'column': col, 'issue': 'date_format', 'suggestion': 'normalize to YYYY-MM-DD', 'confidence': 0.7})
    # return top suggestions
    return suggestions
