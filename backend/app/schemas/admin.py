from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime
import re

EMAIL_REGEX = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'

class AdminCreateAdminRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    full_name: str = Field(..., min_length=2, max_length=150)

    @validator("email")
    def validate_email_format(cls, v):
        v = v.strip().lower()
        if not re.match(EMAIL_REGEX, v):
            raise ValueError("Định dạng email không hợp lệ")
        return v

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

