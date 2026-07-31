from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserStatusUpdate(BaseModel):
    is_active: bool
    reason: Optional[str] = None

class SystemStatistics(BaseModel):
    total_users: int
    total_essays: int
    essays_today: int
    ai_error_rate_percent: float
    average_processing_time_sec: float

class EvaluationLogResponse(BaseModel):
    log_id: str
    essay_id: str
    agent_name: str
    status: str
    error_message: Optional[str] = None
    phoenix_trace_id: Optional[str] = None
    created_at: datetime
