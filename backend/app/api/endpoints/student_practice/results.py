"""Kết quả sau khi nộp: tổng kết và đáp án/lời giải (UC-11, FR-14). Người khác xem → 404."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from app.core.security import User, get_optional_user
from app.services.listening_reading.lr_result_views import build_lr_detail, build_lr_summary
from app.services.practice.practice_attempt_lifecycle import get_owned_attempt
from app.services.speaking.speaking_result_views import build_speaking_detail, build_speaking_summary
from app.services.writing.writing_result_views import build_attempt_summary

router = APIRouter()


def _attempt_or_404(attempt_id: str, current_user: Optional[User]) -> dict:
    is_admin = bool(current_user and current_user.role == "admin")
    attempt = get_owned_attempt(attempt_id, current_user.id if current_user else None, is_admin)
    if not attempt:
        raise HTTPException(status_code=404, detail="Phiên làm bài không tồn tại")
    return attempt


@router.get("/attempts/{attempt_id}/summary")
async def get_attempt_summary(attempt_id: str, current_user: Optional[User] = Depends(get_optional_user)):
    """Band, số câu đúng, thống kê dạng câu (L/R) hoặc trạng thái chấm từng task (Writing)."""
    attempt = _attempt_or_404(attempt_id, current_user)
    if attempt["skill"] == "writing":
        data = build_attempt_summary(attempt)
    elif attempt["skill"] in ("reading", "listening"):
        data = build_lr_summary(attempt)
    else:
        data = build_speaking_summary(attempt)
    return {"meta": {"code": 200}, "data": data}


@router.get("/attempts/{attempt_id}/detail")
async def get_attempt_detail_with_explanations(attempt_id: str, current_user: Optional[User] = Depends(get_optional_user)):
    """Đáp án và lời giải (L/R), hoặc transcript và phân tích từng câu (Speaking)."""
    attempt = _attempt_or_404(attempt_id, current_user)
    if attempt["skill"] == "speaking":
        return {"meta": {"code": 200}, "data": build_speaking_detail(attempt)}
    if attempt["skill"] not in ("reading", "listening"):
        raise HTTPException(status_code=400, detail="Chi tiết đáp án chỉ áp dụng cho Listening, Reading, Speaking")
    return {"meta": {"code": 200}, "data": build_lr_detail(attempt)}
