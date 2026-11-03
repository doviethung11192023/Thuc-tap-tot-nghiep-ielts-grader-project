"""Nộp và chấm Listening/Reading theo đáp án (SD-04, BR-14, BR-03)."""
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.security import User, get_optional_user
from app.services.listening_reading.lr_grading_service import submit_lr
from app.services.practice.practice_attempt_lifecycle import get_owned_attempt

router = APIRouter()


class SubmitAnswersRequest(BaseModel):
    answers: Dict[str, Any]  # question_id hoặc số câu -> câu trả lời
    time_spent_sec: Optional[int] = None
    parts: Optional[List[int]] = None


@router.post("/attempts/{attempt_id}/submit")
async def submit_reading_listening_answers(attempt_id: str, req: SubmitAnswersRequest,
                                           current_user: Optional[User] = Depends(get_optional_user)):
    """Nộp bài Reading/Listening; chấm ngay, band chỉ khi đủ 40 câu."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập để nộp bài")
    attempt = get_owned_attempt(attempt_id, current_user.id)          # chỉ chủ bài được nộp
    if not attempt:
        raise HTTPException(status_code=404, detail="Phiên làm bài không tồn tại")
    if attempt["skill"] not in ("reading", "listening"):
        raise HTTPException(status_code=400, detail="Chức năng này chỉ áp dụng cho Reading và Listening")
    data = submit_lr(attempt, req.answers, req.parts, req.time_spent_sec)
    return {"meta": {"code": 200, "message": "Nộp bài và chấm điểm thành công"}, "data": data}
