import requests
import json
import os
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from . import auth, crud, schemas, utils, models
from .database import get_db

router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    project_id: int
    file_id: int

# Use environment variable for Ollama URL, default to localhost
# In Docker, this should be set to "http://ollama:11434/api/chat" or similar
OLLAMA_API_URL = os.getenv("OLLAMA_API_URL", "http://localhost:11434/api/chat")
MODEL_NAME = os.getenv("OLLAMA_MODEL", "phi4-mini")

SYSTEM_PROMPT_TEMPLATE = '''
You are a helpful, fast data-cleansing assistant for tabular data.

Columns available: {columns}
Data sample (JSON records): {data_sample}

How to respond:
- Speak first in plain, friendly English like a helpful colleague.
- For greetings or general questions (e.g., “Can you assist me cleansing the data?”), answer naturally (e.g., “Of course—I can help.”) and briefly outline useful operations.
- When you want to suggest a concrete action (rule, filter, formula, etc.), include a single fenced JSON block after your explanation:
  ```json
  {{"tool": "apply_rule|apply_filter|apply_formula|undo|redo|save_changes|download", "parameters": {{ ... }}}}
  ```
- Keep the JSON compact and valid. Only one tool per reply.
- If information is missing, ask a short clarifying question instead of emitting JSON.

Tools and parameters:
- apply_rule — parameters: column_name, rule_type, payload
  - rule_type correct_date → payload.target_format (e.g. "%Y-%m-%d")
  - rule_type correct_spelling → payload.mapping (original → corrected)
- apply_filter — parameters: column, operator (equal|not_equal|greater_than|less_than|contains|starts_with|ends_with), value
- apply_formula — parameters: formula_name, formula_expression
- undo — no parameters
- redo — no parameters
- save_changes — no parameters
- download — parameter: format (csv|xlsx)

Guidance:
- Prefer apply_rule with correct_spelling for spelling fixes across any column.
- Keep mappings compact and include only values present in the sample when possible.
'''

@router.post("/chat")
async def chat_with_ollama(chat_request: ChatRequest, db: Session = Depends(get_db), current_user: schemas.User = Depends(auth.get_current_active_user)):
    """
    Handles a chat request by forwarding it to the Ollama API and returning the response.
    Maintains conversation history and can return filter suggestions.
    """
    dbf = crud.get_uploaded_file(db, chat_request.file_id)
    if not dbf:
        raise HTTPException(status_code=404, detail="File not found")

    df = utils.read_tabular(dbf.stored_path)
    # Limit prompt size for faster inference
    all_columns = df.columns.tolist()
    columns_for_prompt = all_columns[:12]  # cap number of columns in prompt
    # Create a compact data sample: few rows, truncated cell values, JSON format
    compact_df = df.head(5).astype(str)
    # Pandas deprecates DataFrame.applymap; use column-wise Series.map for compatibility
    compact_df = compact_df.apply(lambda col: col.map(lambda x: (x[:60] + '…') if len(x) > 60 else x))
    data_sample = compact_df.to_json(orient='records')

    system_prompt = SYSTEM_PROMPT_TEMPLATE.format(columns=columns_for_prompt, data_sample=data_sample)

    conversations = crud.get_conversations_for_user(db, user_id=current_user.id, project_id=chat_request.project_id, file_id=chat_request.file_id)
    if not conversations:
        conversation = crud.create_conversation(db, user_id=current_user.id, project_id=chat_request.project_id, file_id=chat_request.file_id)
    else:
        conversation = conversations[0]

    # Persist only the newest user message to avoid duplicating entire history
    if chat_request.messages:
        last_msg = chat_request.messages[-1]
        if last_msg.role == "user" and last_msg.content:
            crud.add_message_to_conversation(
                db,
                conversation_id=conversation.id,
                role=last_msg.role,
                content=last_msg.content,
                sender=last_msg.role,
            )

    # Keep only the last few messages to reduce context and latency
    history_tail = chat_request.messages[-8:] if chat_request.messages else []
    messages = [{"role": "system", "content": system_prompt}] + [msg.dict() for msg in history_tail]

    try:
        # Quick health check for Ollama; if unavailable, degrade gracefully
        try:
            # Extract base URL from API URL for health check
            base_url = OLLAMA_API_URL.rsplit('/api/chat', 1)[0]
            if not base_url:
                 base_url = "http://localhost:11434"
            requests.get(base_url, timeout=2)
        except requests.exceptions.RequestException:
            assistant_message_content = (
                f"I couldn’t reach the local AI engine right now at {OLLAMA_API_URL}. "
                "Please ensure Ollama is running and the model '" + MODEL_NAME + "' is installed. "
                "If you prefer cloud mode, configure DEEPSEEK_API_KEY and use the legacy assistant."
            )
            # Persist assistant message for a consistent UX
            crud.add_message_to_conversation(db, conversation_id=conversation.id, role="assistant", content=assistant_message_content, sender="ai")
            return {"response": assistant_message_content}

        response = requests.post(
            OLLAMA_API_URL,
            json={
                "model": MODEL_NAME,
                "messages": messages,
                "stream": False,
                # Tuning options to reduce latency on CPU
                "options": {
                    "temperature": 0.6,
                    "top_p": 0.9,
                    "num_ctx": 2048,
                    "num_thread": os.cpu_count() or 4,
                },
            },
            timeout=120,
        )
        response.raise_for_status()

        ollama_data = response.json()
        assistant_message_content = ollama_data.get("message", {}).get("content", "")

        crud.add_message_to_conversation(db, conversation_id=conversation.id, role="assistant", content=assistant_message_content, sender="ai")

        # Parse a fenced JSON tool suggestion (human-in-the-loop)
        try:
            json_str = None
            if "```json" in assistant_message_content:
                json_str = assistant_message_content.split("```json")[1].split("```")[0].strip()
            else:
                # If the model responded with raw JSON only
                content = assistant_message_content.strip()
                if content.startswith("{") and content.endswith("}"):
                    json_str = content

            if json_str:
                json_response = json.loads(json_str)
                if json_response.get("tool"):
                    tool_name = json_response.get("tool")
                    params = json_response.get("parameters", {})
                    return {"response": assistant_message_content, "tool": {"tool": tool_name, "parameters": params}, "cleansing_done": False}
        except (json.JSONDecodeError, IndexError):
            # Not a tool suggestion; fall through to conversational reply
            pass

        # Conversational reply only
        return {"response": assistant_message_content}

    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error communicating with Ollama: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")

@router.get("/conversations/{project_id}/{file_id}", response_model=List[schemas.Conversation])
async def get_conversations(project_id: int, file_id: int, db: Session = Depends(get_db), current_user: schemas.User = Depends(auth.get_current_active_user)):
    try:
        conversations = crud.get_conversations_for_user(db, user_id=current_user.id, project_id=project_id, file_id=file_id)
        if conversations:
            return conversations
        return []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")