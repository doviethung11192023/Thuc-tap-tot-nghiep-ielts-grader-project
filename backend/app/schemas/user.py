from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import date, datetime

def validate_band_score(v: Optional[float]) -> Optional[float]:
    if v is not None:
        if not (0.0 <= v <= 9.0):
            raise ValueError("Band score must be between 0.0 and 9.0")
        if (round(v * 2, 2)) % 1 != 0:
            raise ValueError("Band score must be an increment of 0.5 (e.g. 6.0, 6.5, 7.0)")
    return v

class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=150)
    avatar_url: Optional[str] = None
    voice_consent: Optional[bool] = None

class UserProfileResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str = "student"
    is_active: bool = True
    is_activated: bool = True
    voice_consent_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

class LearnerGoalUpdate(BaseModel):
    target_overall: Optional[float] = Field(None, ge=0.0, le=9.0)
    target_listening: Optional[float] = Field(None, ge=0.0, le=9.0)
    target_reading: Optional[float] = Field(None, ge=0.0, le=9.0)
    target_writing: Optional[float] = Field(None, ge=0.0, le=9.0)
    target_speaking: Optional[float] = Field(None, ge=0.0, le=9.0)
    test_date: Optional[date] = None

    _check_overall = validator("target_overall", allow_reuse=True)(validate_band_score)
    _check_listening = validator("target_listening", allow_reuse=True)(validate_band_score)
    _check_reading = validator("target_reading", allow_reuse=True)(validate_band_score)
    _check_writing = validator("target_writing", allow_reuse=True)(validate_band_score)
    _check_speaking = validator("target_speaking", allow_reuse=True)(validate_band_score)

    @validator("test_date")
    def validate_test_date(cls, v):
        if v is not None and v < date.today():
            raise ValueError("Target test date must be today or in the future")
        return v

class LearnerGoalResponse(BaseModel):
    user_id: str
    target_overall: Optional[float] = None
    target_listening: Optional[float] = None
    target_reading: Optional[float] = None
    target_writing: Optional[float] = None
    target_speaking: Optional[float] = None
    test_date: Optional[date] = None
    updated_at: Optional[datetime] = None

class UserProgressResponse(BaseModel):
    total_essays: int
    avg_overall_band: float
    avg_tr_score: float
    avg_cc_score: float
    avg_lr_score: float
    avg_gra_score: float
    best_overall_band: float
    last_submission_at: Optional[datetime] = None