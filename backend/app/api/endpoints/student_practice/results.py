"""Kết quả sau khi nộp: tổng kết và đáp án/lời giải (UC-11, FR-14). Người khác xem → 404."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from app.core.security import User, get_optional_user
from app.db.supabase import db
from app.services.listening_reading.lr_result_views import build_lr_detail, build_lr_summary
from app.services.practice.practice_attempt_lifecycle import get_owned_attempt
from app.services.writing.writing_result_views import build_attempt_summary

router = APIRouter()


def _attempt_or_404(attempt_id: str, current_user: Optional[User]) -> dict:
    is_admin = bool(current_user and current_user.role == "admin")
    attempt = get_owned_attempt(attempt_id, current_user.id if current_user else None, is_admin)
    if not attempt:
        raise HTTPException(status_code=404, detail="Phiên làm bài không tồn tại")
    return attempt


def _speaking_summary(attempt: dict) -> dict:
    """Speaking chưa có pipeline chấm: band lấy từ kết quả chính thức nếu có (Expert), không thì null."""
    title = db().table("tests").select("title").eq("id", attempt["test_id"]).execute().data
    band = db().table("attempt_results").select("band").eq("attempt_id", attempt["id"]).execute().data
    return {
        "attempt_id": attempt["id"], "test_id": attempt["test_id"],
        "title": (title[0]["title"] if title else None) or "IELTS Speaking Test", "skill": "speaking",
        "mode": attempt["mode"], "status": attempt["status"],
        "overall_band": float(band[0]["band"]) if band and band[0]["band"] is not None else None,
        "correct_count": 0, "total_questions": 0,
        "submitted_at": attempt.get("submitted_at") or attempt.get("started_at"), "task_formats_result": [],
    }


@router.get("/attempts/{attempt_id}/summary")
async def get_attempt_summary(attempt_id: str, current_user: Optional[User] = Depends(get_optional_user)):
    """Band, số câu đúng, thống kê dạng câu (L/R) hoặc trạng thái chấm từng task (Writing)."""
    attempt = _attempt_or_404(attempt_id, current_user)
    if attempt["skill"] == "writing":
        data = build_attempt_summary(attempt)
    elif attempt["skill"] in ("reading", "listening"):
        data = build_lr_summary(attempt)
    else:
        data = _speaking_summary(attempt)
    return {"meta": {"code": 200}, "data": data}


@router.get("/attempts/{attempt_id}/detail")
async def get_attempt_detail_with_explanations(attempt_id: str, current_user: Optional[User] = Depends(get_optional_user)):
    """Đáp án, lời giải, dẫn chứng, transcript — chỉ sau khi nộp (Listening/Reading)."""
    attempt = _attempt_or_404(attempt_id, current_user)
    if attempt["skill"] not in ("reading", "listening"):
        raise HTTPException(status_code=400, detail="Chi tiết đáp án chỉ áp dụng cho Listening/Reading")
    return {"meta": {"code": 200}, "data": build_lr_detail(attempt)}
