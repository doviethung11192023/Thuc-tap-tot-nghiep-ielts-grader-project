from datetime import datetime
import re
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, validator

EMAIL_REGEX = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
ALLOWED_HELPFULNESS_TAGS = {"clear_actionable", "detailed_errors", "too_brief", "unclear"}


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
    tier: str = "standard"
    tier_max_reviews: int = 5
    cooldown_until: Optional[datetime] = None
    consecutive_clean_reviews: int = 0
    is_suspended_by_penalty: bool = False
    rps_summary: Optional[Dict[str, Any]] = None
    performance_summary: Optional[Dict[str, Any]] = None


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


class LearnerQuotaResponse(BaseModel):
    week_start: str
    mock_quota: int
    mock_used: int
    mock_reserved: int
    mock_remaining: int
    practice_quota: int
    practice_used: int
    practice_remaining: int
    school_weekly_capacity: int
    school_capacity_left: int
    can_reserve_mock: bool
    can_request_practice: bool


class PracticeReviewRequestCreate(BaseModel):
    attempt_id: str


class ExpertAssignmentItem(BaseModel):
    id: str
    request_id: str
    attempt_id: str
    expert_id: str
    skill: str
    source: str
    test_title: Optional[str] = None
    learner_name: Optional[str] = None
    learner_email: Optional[str] = None
    assigned_at: str
    started_at: Optional[str] = None
    due_at: str
    ended_at: Optional[str] = None
    end_reason: Optional[str] = None
    note: Optional[str] = None
    evaluation_id: Optional[str] = None
    can_decline: bool = False
    remaining_hours: float = 0.0


class ExpertDeclineRequest(BaseModel):
    note: str = Field(..., min_length=5, max_length=500, description="Lý do từ chối nhận bài")


class CriterionScoreInput(BaseModel):
    criterion_id: str
    task_no: int = 1
    skill: str = "writing"
    band: float
    comment: Optional[str] = ""


class AnnotationInput(BaseModel):
    type: str = "error"
    category: str = "GRA"
    title: Optional[str] = None
    original_text: Optional[str] = ""
    corrected_text: Optional[str] = None
    explanation: Optional[str] = ""
    start_pos: Optional[int] = None
    end_pos: Optional[int] = None
    essay_id: Optional[str] = None
    response_id: Optional[str] = None
    start_ms: Optional[int] = None
    end_ms: Optional[int] = None


class ExpertSubmitReviewRequest(BaseModel):
    overall_band: float
    criterion_scores: List[CriterionScoreInput]
    annotations: Optional[List[AnnotationInput]] = []
    feedback: Optional[str] = ""
    change_reason: Optional[str] = ""
    ai_agreement_confirmed: bool = False
    study_tip_note: Optional[str] = None


class AdminWaivePenaltyRequest(BaseModel):
    waive_reason: str = Field(..., min_length=10, max_length=500, description="Lý do miễn phạt rõ ràng")


class ExpertHelpfulnessRatingRequest(BaseModel):
    is_helpful: bool
    tags: List[str] = Field(default_factory=list)

    @validator("tags", each_item=True)
    def validate_tag(cls, v):
        clean = str(v).strip()
        if clean not in ALLOWED_HELPFULNESS_TAGS:
            raise ValueError(f"Tag không hợp lệ: {clean}")
        return clean
