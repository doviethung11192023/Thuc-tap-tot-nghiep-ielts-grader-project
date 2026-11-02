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

def round_to_ielts_band(score: Optional[float]) -> float:
    """
    Làm tròn điểm theo quy tắc chuẩn kỳ thi IELTS quốc tế của Cambridge / IDP / BC:
    - Điểm IELTS chỉ có bước nhảy 0.5 (vd: 5.0, 5.5, 6.0, 6.5, 7.0, 7.5...).
    - Phần thập phân < 0.25 -> làm tròn xuống .0 (vd: 6.1 -> 6.0, 6.2 -> 6.0).
    - Phần thập phân >= 0.25 và < 0.75 -> làm tròn thành .5 (vd: 6.25 -> 6.5, 6.675 -> 6.5, 6.7 -> 6.5).
    - Phần thập phân >= 0.75 -> làm tròn lên band nguyên kế tiếp .0 (vd: 2.75 -> 3.0, 6.75 -> 7.0, 6.8 -> 7.0).
    """
    if score is None or score <= 0:
        return 0.0
    whole = int(score)
    rem = round(score - whole, 4)
    if rem < 0.25:
        return float(whole)
    elif rem < 0.75:
        return float(whole) + 0.5
    else:
        return float(whole) + 1.0


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
    ).eq("user_id", user_id).order("submitted_at", desc=True).limit(100).execute()
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

def compute_daily_active_minutes(attempts: List[Dict[str, Any]], essays: List[Dict[str, Any]]) -> Dict[str, int]:
    """
    Tính toán thời lượng học tập và luyện đề thực tế theo từng ngày.
    Sử dụng thuật toán gom nhóm phiên học tập thực tế (Session Clustering) với ngưỡng nghỉ 30 phút giữa các phiên,
    loại bỏ hoàn toàn tình trạng click nhiều lần làm nhân khống số phút.
    """
    events_by_date: Dict[str, List[datetime]] = {}
    for a in attempts:
        for k in ["started_at", "submitted_at"]:
            val = a.get(k)
            if val:
                try:
                    ds = str(val)[:10]
                    dt = datetime.fromisoformat(val)
                    events_by_date.setdefault(ds, []).append(dt)
                except Exception:
                    pass
    for e in essays:
        val = e.get("submitted_at")
        if val:
            try:
                ds = str(val)[:10]
                dt = datetime.fromisoformat(val)
                events_by_date.setdefault(ds, []).append(dt)
            except Exception:
                pass

    daily_minutes: Dict[str, int] = {}
    for ds, times in events_by_date.items():
        times.sort()
        sessions = []
        if not times:
            continue
        cur_start = times[0]
        cur_end = times[0]
        for t in times[1:]:
            if (t - cur_end).total_seconds() <= 30 * 60:
                cur_end = t
            else:
                sessions.append((cur_start, cur_end))
                cur_start = t
                cur_end = t
        sessions.append((cur_start, cur_end))

        total_day_min = 0
        for s_start, s_end in sessions:
            diff_min = round((s_end - s_start).total_seconds() / 60)
            session_min = max(5, diff_min)
            total_day_min += session_min

        # Không vượt quá giới hạn thể lực học tập hợp lý trong 1 ngày (12 tiếng = 720 phút)
        daily_minutes[ds] = min(total_day_min, 720)

    return daily_minutes

