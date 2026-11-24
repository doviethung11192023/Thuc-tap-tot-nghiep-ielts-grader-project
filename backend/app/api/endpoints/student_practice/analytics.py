"""Lịch sử làm bài, learning profile (dashboard) và mục tiêu của Learner (UC-05, UC-06, UC-11)."""
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from app.core.security import User, get_current_user
from app.services.learner_journey.next_step_builder import compute_next_step
from app.services.learning_profile.common import _cache
from app.services.learning_profile.common import invalidate_user_profile_cache
from app.services.learning_profile.gamification_state_store import update_study_plan
from app.services.learning_profile.streak_summary_service import claim_streak_repair, get_streak_summary
from app.services.learning_profile_aggregator import (
    compute_learning_profile_overview,
    compute_learning_profile_test_practice,
)
from app.services.practice.learner_profile_store import save_goals
from app.services.practice.practice_history import discard_attempt, list_history

router = APIRouter()


class GoalUpdateRequest(BaseModel):
    input_band: Optional[float] = Field(default=None, ge=1.0, le=9.0)
    target_overall: Optional[float] = Field(default=None, ge=4.0, le=9.0)
    target_listening: Optional[float] = Field(default=None, ge=4.0, le=9.0)
    target_reading: Optional[float] = Field(default=None, ge=4.0, le=9.0)
    target_writing: Optional[float] = Field(default=None, ge=4.0, le=9.0)
    target_speaking: Optional[float] = Field(default=None, ge=4.0, le=9.0)
    test_date: Optional[str] = Field(default=None, max_length=20)


def _drop_profile_cache(user_id: str) -> None:
    invalidate_user_profile_cache(user_id)


@router.get("/history")
def get_student_history(page: int = Query(1, ge=1), limit: int = Query(10, ge=1, le=50),
                        skill: Optional[str] = None, status: Optional[str] = None,
                        current_user: User = Depends(get_current_user)):
    """Lịch sử các lần làm bài (band = kết quả chính thức), phân trang."""
    return {"meta": {"code": 200}, "data": list_history(current_user.id, page, limit, skill, status)}


@router.delete("/history/{attempt_id}")
def delete_student_attempt(attempt_id: str, current_user: User = Depends(get_current_user)):
    """Luyện tập đang dở: xoá hẳn. Thi thử đang dở (thoát phòng thi): abandoned. Bài đã nộp: 409."""
    outcome = discard_attempt(current_user.id, attempt_id)
    _drop_profile_cache(current_user.id)
    message = "Đã xoá bài luyện tập làm dở" if outcome == "deleted" else "Đã ghi nhận bỏ dở bài thi thử"
    return {"meta": {"code": 200, "message": message}, "data": {"outcome": outcome}}


@router.get("/learning-profile")
def get_student_learning_profile(current_user: User = Depends(get_current_user)):
    """KPIs, mục tiêu, Radar, Donut, Heatmap của hồ sơ năng lực."""
    return {"meta": {"code": 200}, "data": compute_learning_profile_overview(current_user.id)}


@router.get("/learning-profile/next-step")
def get_learning_profile_next_step(current_user: User = Depends(get_current_user)):
    """Thẻ "Bước tiếp theo" (BR-17, ADR-23): kỹ năng ưu tiên, điểm yếu, ≤ 3 gợi ý. Tính lúc xem, không lưu.
    Hàm thường (không async) để FastAPI chạy trong threadpool, không chặn event loop khi đọc Supabase."""
    return {"meta": {"code": 200}, "data": compute_next_step(current_user.id)}


@router.get("/learning-profile/test-practice")
def get_learning_profile_test_practice(current_user: User = Depends(get_current_user)):
    """Tab Test Practice: điểm 4 kỹ năng, biểu đồ 30 bài, dạng bài, lịch sử."""
    return {"meta": {"code": 200}, "data": compute_learning_profile_test_practice(current_user.id)}


@router.put("/learning-profile/goals")
def update_student_goals(req: GoalUpdateRequest, current_user: User = Depends(get_current_user)):
    """Cập nhật band mục tiêu và ngày thi dự kiến."""
    payload = {f: getattr(req, f) for f in ("input_band", "target_overall", "target_listening", "target_reading",
                                            "target_writing", "target_speaking", "test_date")
               if getattr(req, f) is not None}
    saved = save_goals(current_user.id, payload)
    _drop_profile_cache(current_user.id)
    return {"meta": {"code": 200, "message": "Cập nhật mục tiêu thành công"}, "data": saved}


class StudyPlanUpdateRequest(BaseModel):
    weekly_goal_days: Optional[int] = Field(default=None, ge=3, le=7)
    reminder_enabled: Optional[bool] = None


@router.get("/learning-profile/streak-summary")
def get_student_streak_summary(current_user: User = Depends(get_current_user)):
    """Endpoint siêu nhẹ cho Header Streak Pill trên mọi trang Học viên (cache 60s)."""
    return {"meta": {"code": 200}, "data": get_streak_summary(current_user.id)}


@router.put("/learning-profile/study-plan")
def update_student_study_plan(req: StudyPlanUpdateRequest, current_user: User = Depends(get_current_user)):
    """Cập nhật mục tiêu tuần (3/5/7 buổi) và công tắc nhắc giữ chuỗi 20:00 GMT+7 (FR-57)."""
    saved = update_study_plan(current_user.id, req.weekly_goal_days, req.reminder_enabled)
    return {"meta": {"code": 200, "message": "Đã lưu kế hoạch học tập tuần"}, "data": saved}


@router.post("/learning-profile/streak/repair")
def repair_student_streak(current_user: User = Depends(get_current_user)):
    """Khôi phục chuỗi >= 5 ngày bị đứt trong cửa sổ 48h sau khi hoàn thành nhiệm vụ 2x (UC-47, BR-29)."""
    res = claim_streak_repair(current_user.id)
    return {"meta": {"code": 200, "message": "Khôi phục chuỗi học thành công!"}, "data": res}
