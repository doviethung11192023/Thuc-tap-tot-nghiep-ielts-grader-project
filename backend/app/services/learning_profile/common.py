import threading
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import zoneinfo
from app.services.practice import learning_profile_readers

TZ_VN = zoneinfo.ZoneInfo("Asia/Ho_Chi_Minh")
_cache: Dict[str, Any] = {}
_cache_lock = threading.Lock()


def get_from_cache(key: str) -> Optional[Any]:
    """Lấy dữ liệu từ RAM Cache nếu còn hạn (chỉ lock thao tác đọc/ghi dict)."""
    now = datetime.now(timezone.utc).timestamp()
    with _cache_lock:
        if key in _cache:
            data, exp = _cache[key]
            if now < exp:
                return data
            del _cache[key]
    return None


def set_to_cache(key: str, data: Any, ttl_seconds: int = 30) -> None:
    """Lưu dữ liệu vào RAM Cache với TTL."""
    now = datetime.now(timezone.utc).timestamp()
    with _cache_lock:
        _cache[key] = (data, now + ttl_seconds)


def round_to_ielts_band(score: Optional[float]) -> float:
    """Làm tròn điểm theo quy tắc chuẩn kỳ thi IELTS quốc tế (.0 / .5)."""
    if score is None or score <= 0:
        return 0.0
    whole = int(score)
    rem = round(score - whole, 4)
    if rem < 0.25:
        return float(whole)
    if rem < 0.75:
        return float(whole) + 0.5
    return float(whole) + 1.0


def invalidate_user_profile_cache(user_id: str) -> None:
    """Xóa toàn bộ cache RAM liên quan đến hồ sơ học tập của học viên."""
    with _cache_lock:
        for k in list(_cache.keys()):
            if any(k.startswith(f"{p}{user_id}") for p in ("overview_", "overview_v2_", "practice_", "attempts_", "goal_", "answers_", "criteria_", "audit_", "gstate_", "quality_", "streak_summary_")):
                _cache.pop(k, None)


def clear_all_profile_cache() -> None:
    """Xóa toàn bộ RAM cache khi Admin cập nhật roadmap_config."""
    with _cache_lock:
        _cache.clear()


def get_user_attempts(user_id: str) -> List[Dict[str, Any]]:
    """Các lần làm bài của học viên (không giữ lock toàn cục khi gọi mạng Supabase)."""
    cache_key = f"attempts_{user_id}"
    cached = get_from_cache(cache_key)
    if cached is not None:
        return cached
    rows = learning_profile_readers.user_attempts(user_id)
    set_to_cache(cache_key, rows, ttl_seconds=60)
    return rows


def get_learner_goal(user_id: str) -> Dict[str, Any]:
    """Mục tiêu học tập của học viên (giá trị mặc định khi chưa đặt)."""
    cache_key = f"goal_{user_id}"
    cached = get_from_cache(cache_key)
    if cached is not None:
        return cached
    goal = learning_profile_readers.learner_goal_row(user_id)
    data = {
        "input_band": float(goal.get("input_band") or 4.0),
        "target_overall": float(goal.get("target_overall") or 6.5),
        "target_listening": float(goal.get("target_listening") or 7.0),
        "target_reading": float(goal.get("target_reading") or 7.0),
        "target_writing": float(goal.get("target_writing") or 6.0),
        "target_speaking": float(goal.get("target_speaking") or 6.0),
        "test_date": str(goal.get("test_date") or ""),
    }
    set_to_cache(cache_key, data, ttl_seconds=120)
    return data


def get_all_published_tests() -> List[Dict[str, Any]]:
    """Các đề đã xuất bản kèm metadata dạng câu hỏi & độ khó (cache 5 phút)."""
    cached = get_from_cache("published_tests")
    if cached is not None:
        return cached
    tests = learning_profile_readers.published_tests()
    set_to_cache("published_tests", tests, ttl_seconds=300)
    return tests


def get_user_answers_cached(user_id: str, attempt_ids: List[str]) -> List[Dict[str, Any]]:
    """Dùng chung batch answers giữa Overview, Roadmap, Monthly & Practice Tab."""
    if not attempt_ids:
        return []
    cache_key = f"answers_{user_id}:{attempt_ids[0]}:{len(attempt_ids)}"
    cached = get_from_cache(cache_key)
    if cached is not None:
        return cached
    rows = learning_profile_readers.answers_with_types(attempt_ids[:50])
    set_to_cache(cache_key, rows, ttl_seconds=60)
    return rows


def get_user_criteria_cached(user_id: str, attempt_ids: List[str]) -> List[Dict[str, Any]]:
    """Dùng chung batch criterion_scores Writing/Speaking."""
    if not attempt_ids:
        return []
    cache_key = f"criteria_{user_id}:{attempt_ids[0]}:{len(attempt_ids)}"
    cached = get_from_cache(cache_key)
    if cached is not None:
        return cached
    rows = learning_profile_readers.user_criterion_scores(attempt_ids[:50])
    set_to_cache(cache_key, rows, ttl_seconds=60)
    return rows


def get_roadmap_config_cached() -> Dict[str, int]:
    """Cấu hình Lộ trình & Chẩn đoán từ Admin (cache 2 phút)."""
    cached = get_from_cache("roadmap_config")
    if cached is not None:
        return cached
    cfg = learning_profile_readers.get_roadmap_config()
    set_to_cache("roadmap_config", cfg, ttl_seconds=120)
    return cfg


def get_vietnamese_month_abbr(dt: datetime) -> str:
    """Trả về tên tháng viết tắt (Jan..Dec)."""
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return months[dt.month - 1]


def to_vn_date_str(val: Any) -> Optional[str]:
    """Chuẩn hóa mọi mốc thời gian ISO/UTC về ngày Việt Nam (GMT+7 YYYY-MM-DD)."""
    if not val:
        return None
    try:
        dt = datetime.fromisoformat(str(val).replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(TZ_VN).date().isoformat()
    except Exception:
        s = str(val).strip()
        return s[:10] if len(s) >= 10 else None


def compute_daily_active_minutes(attempts: List[Dict[str, Any]]) -> Dict[str, int]:
    """Tính thời lượng luyện đề thực tế theo ngày GMT+7 (chỉ tính bài đã nộp, chống cày phút ảo từ bài bỏ trống)."""
    daily_minutes: Dict[str, int] = {}
    for a in attempts:
        status = str(a.get("status") or "").lower()
        sub_raw = a.get("submitted_at")
        if status not in ("scored", "waiting_expert", "grading") and not sub_raw:
            continue
        start_raw = a.get("started_at")
        end_raw = sub_raw or start_raw
        ds = to_vn_date_str(end_raw)
        if not ds:
            continue
        dur_cap = int(((a.get("tests") or {}).get("duration_min") or 60)) + 30
        mins = 5
        if start_raw and sub_raw:
            try:
                t1 = datetime.fromisoformat(str(start_raw).replace("Z", "+00:00"))
                t2 = datetime.fromisoformat(str(sub_raw).replace("Z", "+00:00"))
                if t1.tzinfo is None:
                    t1 = t1.replace(tzinfo=timezone.utc)
                if t2.tzinfo is None:
                    t2 = t2.replace(tzinfo=timezone.utc)
                raw_min = round(max(0.0, (t2 - t1).total_seconds()) / 60.0)
                mins = max(5, min(raw_min, dur_cap))
            except Exception:
                mins = 5
        daily_minutes[ds] = min(720, daily_minutes.get(ds, 0) + mins)
    return daily_minutes
