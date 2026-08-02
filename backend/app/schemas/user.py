from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class UserUpdate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    avatar_url: Optional[str] = None

class UserProfileResponse(BaseModel):
    id: str
    email: str
    full_name: str
    avatar_url: Optional[str]
    is_active: bool
    created_at: datetime

class UserProgressResponse(BaseModel):
    total_essays: int
    avg_overall_band: float
    avg_tr_score: float
    avg_cc_score: float
    avg_lr_score: float
    avg_gra_score: float
    best_overall_band: float
    last_submission_at: Optional[datetime] = None
# mWQGO3jHXqKPof6w