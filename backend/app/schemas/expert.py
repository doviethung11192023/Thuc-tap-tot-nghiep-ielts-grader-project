from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime
import re

EMAIL_REGEX = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'

class ExpertProfileResponse(BaseModel):
    user_id: str
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_available: bool = False
    max_active_reviews: int = 5
    bio: Optional[str] = None
    active_reviews_count: int = 0
    created_at: Optional[datetime] = None

class ExpertAvailabilityUpdate(BaseModel):
    is_available: Optional[bool] = None
    max_active_reviews: Optional[int] = Field(None, ge=1, le=20)
    bio: Optional[str] = None

class AdminCreateExpertRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    full_name: str = Field(..., min_length=2, max_length=150)
    bio: Optional[str] = None
    max_active_reviews: int = Field(5, ge=1, le=20)

    @validator("email")
    def validate_email_format(cls, v):
        v = v.strip().lower()
        if not re.match(EMAIL_REGEX, v):
            raise ValueError("Định dạng email không hợp lệ")
        return v
