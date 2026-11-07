"""Xin URL upload và xác nhận từng câu trả lời Speaking (UC-10, SD-03). Chỉ chủ bài."""
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.security import User, get_optional_user
from app.services.practice.practice_attempt_lifecycle import require_owned_attempt
from app.services.speaking.speaking_upload_service import confirm_upload, create_upload

router = APIRouter()


class SpeakingUploadRequest(BaseModel):
    question_id: str
    content_type: str


class SpeakingConfirmRequest(BaseModel):
    duration_ms: int = Field(ge=0)


@router.post("/attempts/{attempt_id}/speaking-uploads")
async def request_speaking_upload(attempt_id: str, req: SpeakingUploadRequest,
                                  current_user: Optional[User] = Depends(get_optional_user)):
    attempt = require_owned_attempt(attempt_id, current_user, "speaking")
    return {"meta": {"code": 200}, "data": create_upload(attempt, req.question_id, req.content_type)}


@router.post("/attempts/{attempt_id}/speaking-uploads/{response_id}/confirm")
async def confirm_speaking_upload(attempt_id: str, response_id: str, req: SpeakingConfirmRequest,
                                  current_user: Optional[User] = Depends(get_optional_user)):
    attempt = require_owned_attempt(attempt_id, current_user, "speaking")
    return {"meta": {"code": 200}, "data": confirm_upload(attempt, response_id, req.duration_ms)}
