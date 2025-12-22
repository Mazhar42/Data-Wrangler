# Data Cleansing Backend (FastAPI)

This is a starter backend for a data-cleansing application with AI-assisted suggestions.
It uses FastAPI, Postgres (via SQLAlchemy), and Pandas for data processing. An Ollama (LLaMA 3.2) integration is provided.

## Features included
- User authentication (email/password, Google, Demo)
- Project management (create, update, delete)
- Upload CSV/Excel files and store metadata
- Data preview and pagination
- Data modification and cleansing operations (filter, edit, remove duplicates)
- AI-powered data cleansing and suggestions using Ollama
- Download modified data as CSV or Excel
- History tracking of project activities

## How to run (local)
1. Create a Python venv and install requirements:
   ```bash
   python -m venv env
   source env/bin/activate   # or env\Scripts\activate on Windows
   pip install -r requirements.txt
   ```

2. Set up your environment variables by creating a `.env` file. You can copy the `.env.example` if it exists, or create a new one with the following content:
    ```
    DATABASE_URL="sqlite:///./data_cleansing.db"
    JWT_SECRET_KEY="your-secret-key"
    GOOGLE_CLIENT_ID="your-google-client-id"
    GOOGLE_CLIENT_SECRET="your-google-client-secret"
    ```

3. Run the server:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

4. Open the interactive docs at http://localhost:8000/docs

## Notes about DeepSeek integration
- The AI integration is implemented in `app/main.py` within the `/chat` and `/cleanse/ai/{file_id}` endpoints.
- These endpoints use the `deepseek` library to interact with a running DeepSeek instance.
- Make sure you have DeepSeek installed and running on your machine for the AI features to work.

## File structure
- app/
  - main.py       # FastAPI app and endpoints
  - database.py   # SQLAlchemy session and engine
  - models.py     # DB models
  - schemas.py    # Pydantic schemas
  - crud.py       # Database helper functions
  - auth.py       # Authentication logic
  - deps.py       # Shared dependencies
  - json_encoder.py # Custom JSON encoder
  - utils.py      # Helper utilities for parsing/validation
- requirements.txt
- README.md
