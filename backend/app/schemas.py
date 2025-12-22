from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime

class UploadResponse(BaseModel):
    file_id: int
    filename: str
    data: List[Dict[str, Any]]
    total_rows: int


class UniqueSuggestion(BaseModel):
    candidates: list

class ColumnRuleIn(BaseModel):
    column_name: str
    rule_type: str
    payload: Dict[str, Any]
    active: Optional[bool] = True

class WaterfallIn(BaseModel):
    equation: str
    validate_equation: Optional[bool] = True
    tolerance: Optional[float] = 1e-6

class CleansingRequest(BaseModel):
    column_rules: Optional[List[ColumnRuleIn]] = []
    waterfall_rules: Optional[List[WaterfallIn]] = []
    page: Optional[int] = 1
    per_page: Optional[int] = 50

class Equation(BaseModel):
    formula_name: str
    formula_expression: str
    page: Optional[int] = 1
    per_page: Optional[int] = 50

class CompareRequest(BaseModel):
    file_id: int
    column1: str
    column2: str
    operator: str

class FormulaBase(BaseModel):
    name: str
    expression: str

class Formula(FormulaBase):
    id: int
    project_id: int

    class Config:
        from_attributes = True

class Modification(BaseModel):
    type: str
    criteria: Optional[Dict[str, Any]] = None
    rule: Optional[Dict[str, Any]] = None
    formula: Optional[Dict[str, Any]] = None
    edit: Optional[Dict[str, Any]] = None
    search: Optional[Dict[str, Any]] = None
    remove_duplicates: Optional[bool] = False
    search_query: Optional[str] = None

class ModificationRequest(BaseModel):
    modifications: List[Modification]
    format: str

class ApplyModificationRequest(BaseModel):
    modifications: List[Modification]

class PreviewModificationRequest(BaseModel):
    modifications: List[Modification]

class StatsRequest(BaseModel):
    column_names: List[str]

# Authentication and User Management Schemas
class UserBase(BaseModel):
    email: str
    name: str

class UserCreate(UserBase):
    password: Optional[str] = None
    google_id: Optional[str] = None
    provider: str = "email"

class UserLogin(BaseModel):
    email: str
    password: str

class UserRegister(UserBase):
    password: str

class User(UserBase):
    id: int
    provider: str
    google_id: Optional[str] = None
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class Project(ProjectBase):
    id: int
    owner_id: int
    created_at: datetime
    updated_at: datetime
    owner: User

    class Config:
        from_attributes = True

class ProjectWithFiles(Project):
    files: List[Dict[str, Any]] = []

    class Config:
        from_attributes = True

# Google OAuth schemas
class GoogleUserInfo(BaseModel):
    id: str
    email: str
    name: str
    picture: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: User
    refresh_token: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class HistoryBase(BaseModel):
    operation: str
    details: Optional[str] = None
    project_id: int
    user_id: Optional[int] = None
    file_id: Optional[int] = None

class HistoryCreate(HistoryBase):
    pass

class History(HistoryBase):
    id: int
    timestamp: datetime
    user: Optional[User] = None

    class Config:
        from_attributes = True

class Prompt(BaseModel):
    prompt: str
    file_id: Optional[int] = None

class ChatCleanseRequest(BaseModel):
    file_id: int
    prompt: str


class AICleanseRequest(BaseModel):
    column_to_cleanse: str
    user_prompt: str

class GroupSuggestionsRequest(BaseModel):
    column_name: str
    threshold: Optional[int] = 85

class AnomalyDetectionRequest(BaseModel):
    column_name: str
    detection_type: str # e.g., 'country', 'company', 'general'

class ConversationMessageBase(BaseModel):
    role: str
    content: str

class ConversationMessage(ConversationMessageBase):
    id: int
    conversation_id: int
    sender: str
    created_at: datetime

    class Config:
        from_attributes = True

class ConversationBase(BaseModel):
    user_id: int
    project_id: int
    file_id: int

class Conversation(ConversationBase):
    id: int
    created_at: datetime
    messages: List[ConversationMessage] = []

    class Config:
        from_attributes = True

class Tool(BaseModel):
    tool: str
    parameters: Dict[str, Any]

# === User Management Admin Schemas ===
class RoleBase(BaseModel):
    name: str
    description: Optional[str] = None

class RoleCreate(RoleBase):
    pass

class Role(RoleBase):
    id: int

    class Config:
        from_attributes = True

class GroupBase(BaseModel):
    name: str
    description: Optional[str] = None

class GroupCreate(GroupBase):
    pass

class Group(GroupBase):
    id: int

    class Config:
        from_attributes = True

class UserAssignment(BaseModel):
    user_id: int
    target_id: int
