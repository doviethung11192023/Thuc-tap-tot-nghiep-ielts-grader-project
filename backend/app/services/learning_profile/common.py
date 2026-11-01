from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional
from app.db.supabase import supabase

_cache: Dict[str, Any] = {}

def get_from_cache(key: str) -> Optional[Any]:
    """Lấy dữ liệu từ RAM Cache nếu còn hạn."""
    now = datetime.now(timezone.utc).timestamp()
    if key in _cache:
        data, exp = _cache[key]
        if now < exp:
            return data
        del _cache[key]
    return None

def set_to_cache(key: str, data: Any, ttl_seconds: int = 30) -> None:
    """Lưu dữ liệu vào RAM Cache với TTL (mặc định 30s)."""
    now = datetime.now(timezone.utc).timestamp()
    _cache[key] = (data, now + ttl_seconds)

def get_user_attempts(user_id: str) -> List[Dict[str, Any]]:
    """Lấy danh sách các lần làm bài thi của học viên kèm thông tin bài thi."""
    res = supabase.table("test_attempts").select(
        "id, test_id, skill, mode, status, band, raw_score, started_at, submitted_at, tests(id, title, duration_min)"
    ).eq("user_id", user_id).order("started_at", desc=True).execute()
    return res.data or []

def get_user_essays(user_id: str) -> List[Dict[str, Any]]:
    """Lấy danh sách các bài viết tự do của học viên kèm kết quả chấm."""
    res = supabase.table("essays").select(
        "id, topic_id, status, submitted_at, topics(title), evaluation_results(overall_band)"
    ).eq("user_id", user_id).order("submitted_at", desc=True).limit(10).execute()
    return res.data or []

def get_learner_goal(user_id: str) -> Dict[str, Any]:
    """Lấy mục tiêu học tập của học viên."""
    g_res = supabase.table("learner_goals").select("*").eq("user_id", user_id).execute()
    goal = g_res.data[0] if g_res.data else {}
    return {
        "input_band": float(goal.get("input_band") or 4.0),
        "target_overall": float(goal.get("target_overall") or 6.5),
        "target_listening": float(goal.get("target_listening") or 7.0),
        "target_reading": float(goal.get("target_reading") or 7.0),
        "target_writing": float(goal.get("target_writing") or 6.0),
        "target_speaking": float(goal.get("target_speaking") or 6.0),
        "test_date": goal.get("test_date") or "2026-12-31"
    }

def get_all_published_tests() -> List[Dict[str, Any]]:
    """Lấy danh sách các đề thi đã xuất bản trong hệ thống (có cache)."""
    cached = get_from_cache("published_tests")
    if cached is not None:
        return cached
    res = supabase.table("tests").select("id, title, skill, duration_min").eq("status", "published").execute()
    tests = res.data or []
    set_to_cache("published_tests", tests, ttl_seconds=120)
    return tests

def get_vietnamese_month_abbr(dt: datetime) -> str:
    """Trả về tên tháng viết tắt tiếng Anh/Việt tương ứng (Aug, Sep, Oct...)."""
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return months[dt.month - 1]
