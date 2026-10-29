from fastapi import APIRouter, Depends, Query
from typing import Optional, List, Dict, Any
from app.core.security import get_current_user, User
from app.db.supabase import supabase

router = APIRouter()

@router.get("/history")
async def get_student_history(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    skill: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Lấy danh sách lịch sử các lần làm bài thi của học viên phân trang."""
    offset = (page - 1) * limit
    query = supabase.table("test_attempts").select("id, test_id, skill, mode, status, band, raw_score, started_at, submitted_at, tests(title, duration_min)", count="exact").eq("user_id", current_user.id).order("started_at", desc=True)

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
    """Lấy số liệu hồ sơ năng lực học tập: Radar chart 4 kỹ năng, mục tiêu, độ chính xác."""
    # 1. Lấy tiến độ hiện tại từ user_progress
    prog_res = supabase.table("user_progress").select("*").eq("user_id", current_user.id).execute()
    prog = prog_res.data[0] if prog_res.data else {}

    # 2. Lấy mục tiêu từ learner_goals
    goal_res = supabase.table("learner_goals").select("*").eq("user_id", current_user.id).execute()
    goals = goal_res.data[0] if goal_res.data else {}

    skills_data = [
        {"skill": "Listening", "current": float(prog.get("band_listening") or 6.0), "target": float(goals.get("target_listening") or 7.0)},
        {"skill": "Reading", "current": float(prog.get("band_reading") or 6.5), "target": float(goals.get("target_reading") or 7.5)},
        {"skill": "Writing", "current": float(prog.get("band_writing") or 5.5), "target": float(goals.get("target_writing") or 6.5)},
        {"skill": "Speaking", "current": float(prog.get("band_speaking") or 6.0), "target": float(goals.get("target_speaking") or 7.0)},
    ]

    # 3. Thống kê số bài thi đã hoàn thành
    count_res = supabase.table("test_attempts").select("id", count="exact").eq("user_id", current_user.id).eq("status", "scored").execute()
    total_completed = count_res.count if hasattr(count_res, 'count') and count_res.count is not None else len(count_res.data or [])

    return {
        "meta": {"code": 200},
        "data": {
            "overall_band": float(prog.get("band_overall") or 6.0),
            "target_overall": float(goals.get("target_overall") or 7.0),
            "total_completed_tests": total_completed,
            "radar_data": skills_data,
            "test_date": goals.get("test_date")
        }
    }
