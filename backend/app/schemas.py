from pydantic import BaseModel
from typing import Optional, Dict, Any, List

class UploadResponse(BaseModel):
    file_id: int
    filename: str

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
