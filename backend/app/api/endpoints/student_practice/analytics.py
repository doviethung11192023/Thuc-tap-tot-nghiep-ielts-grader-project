from fastapi import APIRouter, Depends, Query, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from app.core.security import get_current_user, User
from app.db.supabase import supabase
from app.services.learning_profile_aggregator import (
    compute_learning_profile_overview,
    compute_learning_profile_test_practice
)

router = APIRouter()

class GoalUpdateRequest(BaseModel):
    input_band: Optional[float] = None
    target_overall: Optional[float] = None
    target_listening: Optional[float] = None
    target_reading: Optional[float] = None
    target_writing: Optional[float] = None
    target_speaking: Optional[float] = None
    test_date: Optional[str] = None

@router.get("/history")
async def get_student_history(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    skill: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Lấy danh sách lịch sử các lần làm bài thi của học viên phân trang."""
    offset = (page - 1) * limit
    query = supabase.table("test_attempts").select(
        "id, test_id, skill, mode, status, band, raw_score, started_at, submitted_at, tests(title, duration_min)",
        count="exact"
    ).eq("user_id", current_user.id).order("started_at", desc=True)

    if skill and skill.lower() != "all":
        query = query.eq("skill", skill.lower())

    res = query.range(offset, offset + limit - 1).execute()
    items = []
    for a in (res.data or []):
        t_info = a.get("tests") or {}
        items.append({
            "id": a["id"],
            "test_id": a["test_id"],
            "title": t_info.get("title") or "IELTS Test",
            "skill": a["skill"].capitalize(),
            "mode": a["mode"],
            "status": a["status"],
            "band": float(a["band"]) if a.get("band") is not None else 0.0,
            "raw_score": a.get("raw_score"),
            "submitted_at": a.get("submitted_at") or a.get("started_at"),
            "duration_min": t_info.get("duration_min") or 60
        })

    return {
        "meta": {"code": 200},
        "data": {
            "items": items,
            "total": res.count if hasattr(res, 'count') and res.count is not None else len(items),
            "page": page,
            "limit": limit
        }
    }

@router.get("/learning-profile")
async def get_student_learning_profile(current_user: User = Depends(get_current_user)):
    """Lấy toàn bộ số liệu thực tế hồ sơ năng lực học viên: KPIs, mục tiêu, Radar, Donut, Heatmap."""
    profile_data = compute_learning_profile_overview(current_user.id)
    return {
        "meta": {"code": 200},
        "data": profile_data
    }

@router.get("/learning-profile/test-practice")
async def get_learning_profile_test_practice(current_user: User = Depends(get_current_user)):
    """Lấy toàn bộ số liệu thực tế cho Tab Test Practice: Điểm 4 kỹ năng, Line Chart 30 bài, Dạng bài, Lịch sử."""
    practice_data = compute_learning_profile_test_practice(current_user.id)
    return {
        "meta": {"code": 200},
        "data": practice_data
    }

@router.put("/learning-profile/goals")
async def update_student_goals(req: GoalUpdateRequest, current_user: User = Depends(get_current_user)):
    """Cập nhật mục tiêu điểm số và ngày thi dự kiến của học viên."""
    payload = {}
    if req.target_overall is not None:
        payload["target_overall"] = req.target_overall
    if req.target_listening is not None:
        payload["target_listening"] = req.target_listening
    if req.target_reading is not None:
        payload["target_reading"] = req.target_reading
    if req.target_writing is not None:
        payload["target_writing"] = req.target_writing
    if req.target_speaking is not None:
        payload["target_speaking"] = req.target_speaking
    if req.test_date is not None:
        payload["test_date"] = req.test_date

    existing = supabase.table("learner_goals").select("user_id").eq("user_id", current_user.id).execute()
    if existing.data:
        res = supabase.table("learner_goals").update(payload).eq("user_id", current_user.id).execute()
    else:
        payload["user_id"] = current_user.id
        res = supabase.table("learner_goals").insert(payload).execute()

    from app.services.learning_profile.common import _cache
    _cache.pop(f"overview_{current_user.id}", None)
    _cache.pop(f"practice_{current_user.id}", None)

    return {
        "meta": {"code": 200, "message": "Cập nhật mục tiêu thành công"},
        "data": res.data[0] if res.data else payload
    }
