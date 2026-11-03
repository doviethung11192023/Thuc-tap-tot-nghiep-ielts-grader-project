"""Lịch sử làm bài, learning profile (dashboard) và mục tiêu của Learner (UC-05, UC-06, UC-11)."""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.core.security import User, get_current_user
from app.services.learning_profile.common import _cache
from app.services.learning_profile_aggregator import (
    compute_learning_profile_overview,
    compute_learning_profile_test_practice,
)
from app.services.practice.learner_profile_store import save_goals
from app.services.practice.practice_history import abandon_attempt, list_history

router = APIRouter()


class GoalUpdateRequest(BaseModel):
    input_band: Optional[float] = None
    target_overall: Optional[float] = None
    target_listening: Optional[float] = None
    target_reading: Optional[float] = None
    target_writing: Optional[float] = None
    target_speaking: Optional[float] = None
    test_date: Optional[str] = None


def _drop_profile_cache(user_id: str) -> None:
    _cache.pop(f"overview_{user_id}", None)
    _cache.pop(f"practice_{user_id}", None)


@router.get("/history")
async def get_student_history(page: int = Query(1, ge=1), limit: int = Query(10, ge=1, le=50),
                              skill: Optional[str] = None, status: Optional[str] = None,
                              current_user: User = Depends(get_current_user)):
    """Lịch sử các lần làm bài (band = kết quả chính thức), phân trang."""
    return {"meta": {"code": 200}, "data": list_history(current_user.id, page, limit, skill, status)}


@router.delete("/history/{attempt_id}")
async def delete_student_attempt(attempt_id: str, current_user: User = Depends(get_current_user)):
    """Huỷ bài đang làm dở (abandoned). Bài đã nộp không xoá được (409)."""
    abandon_attempt(current_user.id, attempt_id)
    _drop_profile_cache(current_user.id)
    return {"meta": {"code": 200, "message": "Đã huỷ bài làm dở"}}


@router.get("/learning-profile")
async def get_student_learning_profile(current_user: User = Depends(get_current_user)):
    """KPIs, mục tiêu, Radar, Donut, Heatmap của hồ sơ năng lực."""
    return {"meta": {"code": 200}, "data": compute_learning_profile_overview(current_user.id)}


@router.get("/learning-profile/test-practice")
async def get_learning_profile_test_practice(current_user: User = Depends(get_current_user)):
    """Tab Test Practice: điểm 4 kỹ năng, biểu đồ 30 bài, dạng bài, lịch sử."""
    return {"meta": {"code": 200}, "data": compute_learning_profile_test_practice(current_user.id)}


@router.put("/learning-profile/goals")
async def update_student_goals(req: GoalUpdateRequest, current_user: User = Depends(get_current_user)):
    """Cập nhật band mục tiêu và ngày thi dự kiến."""
    payload = {f: getattr(req, f) for f in ("target_overall", "target_listening", "target_reading",
                                            "target_writing", "target_speaking", "test_date")
               if getattr(req, f) is not None}
    saved = save_goals(current_user.id, payload)
    _drop_profile_cache(current_user.id)
    return {"meta": {"code": 200, "message": "Cập nhật mục tiêu thành công"}, "data": saved}
