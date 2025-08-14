
# Data Cleansing Backend (FastAPI + SQLite)

This is a starter backend for a data-cleansing application with AI-assisted suggestions.
It uses FastAPI, SQLite (via SQLAlchemy), and Pandas for data processing. An Ollama (LLaMA 3.2) integration point is provided as a placeholder.

## Features included
- Upload CSV/Excel files and store metadata
- Suggest candidate unique column(s)
- Keep/drop unique columns (by user decision)
- Column-specific rules store (CRUD)
- Waterfall equation validation
- AI suggestions endpoint (stubbed; replace with real Ollama client)
- Apply approved suggestions and produce cleaned file for download

## How to run (local)
1. Create a Python venv and install requirements:
   ```bash
   python -m venv .venv
   source .venv/bin/activate   # or .venv\Scripts\activate on Windows
   pip install -r requirements.txt
   ```

2. Run the server:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

3. Open the interactive docs at http://localhost:8000/docs

## Notes about Ollama integration
- This starter contains a stub function `call_ollama_for_suggestions()` in `app/ai.py`.
- Replace the stub with actual Ollama client calls when available and configured on your machine.

## File structure
- app/
  - main.py       # FastAPI app and endpoints
  - database.py   # SQLAlchemy session and engine
  - models.py     # DB models
  - schemas.py    # Pydantic schemas
  - crud.py       # Database helper functions
  - ai.py         # AI integration (stub)
  - utils.py      # helper utilities for parsing/validation
- requirements.txt
- README.md

