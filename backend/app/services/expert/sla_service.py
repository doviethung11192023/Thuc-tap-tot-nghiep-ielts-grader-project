"""
Dịch vụ tính toán hạn SLA cho Phân hệ Chuyên gia (Expert Review).
Tuân thủ BR-11 và FR-39 trong docs/source-of-truth.md:
- BR-11: Hạn 48 giờ làm việc (chỉ đếm Thứ Hai - Thứ Sáu giờ Việt Nam GMT+7).
- FR-39: Quyền từ chối nhận bài trong 2 giờ làm việc đầu tiên kể từ lúc giao.
"""

from datetime import datetime, timedelta
from time import monotonic
import zoneinfo
from typing import Tuple

TZ_VN = zoneinfo.ZoneInfo("Asia/Ho_Chi_Minh")
_sla_cache: Tuple[float, float, float] | None = None
_SLA_CACHE_TTL = 60.0


def _to_vn(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=TZ_VN)
    return dt.astimezone(TZ_VN)


def get_sla_hours() -> Tuple[float, float]:
    """Đọc động (review_due_hours, review_decline_hours) từ system_settings (cache 60s)."""
    global _sla_cache
    now_mono = monotonic()
    if _sla_cache is not None and (now_mono - _sla_cache[2]) < _SLA_CACHE_TTL:
        return _sla_cache[0], _sla_cache[1]

    due_h, decline_h = 48.0, 2.0
    try:
        from app.db.supabase import db
        rows = (
            db()
            .table("system_settings")
            .select("key, value")
            .in_("key", ["review_due_hours", "review_decline_hours"])
            .execute()
            .data
            or []
        )
        for r in rows:
            val = r.get("value")
            if isinstance(val, dict):
                val = val.get("hours", val.get("value"))
            if val is None:
                continue
            if r.get("key") == "review_due_hours" and float(val) > 0:
                due_h = float(val)
            elif r.get("key") == "review_decline_hours" and float(val) > 0:
                decline_h = float(val)
    except Exception:
        pass

    _sla_cache = (due_h, decline_h, now_mono)
    return due_h, decline_h


def add_business_hours(start: datetime, hours: float = 48.0) -> datetime:
    """Cộng số giờ làm việc (chỉ đếm Thứ Hai đến Thứ Sáu theo giờ Việt Nam GMT+7)."""
    cur = _to_vn(start)
    if cur.weekday() == 5:
        cur = (cur + timedelta(days=2)).replace(hour=0, minute=0, second=0, microsecond=0)
    elif cur.weekday() == 6:
        cur = (cur + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)

    remaining_hours = float(hours)
    while remaining_hours > 0:
        if cur.weekday() < 5:
            hours_today = 24.0 - cur.hour - (cur.minute / 60.0) - (cur.second / 3600.0)
            if remaining_hours <= hours_today:
                cur = cur + timedelta(hours=remaining_hours)
                remaining_hours = 0
            else:
                remaining_hours -= hours_today
                cur = (cur + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        else:
            days_to_add = 2 if cur.weekday() == 5 else 1
            cur = (cur + timedelta(days=days_to_add)).replace(hour=0, minute=0, second=0, microsecond=0)
    return cur


def _business_hours_between(start_dt: datetime, end_dt: datetime) -> float:
    """Đếm số giờ làm việc dương từ start_dt -> end_dt (chỉ Thứ Hai - Thứ Sáu GMT+7)."""
    cur = _to_vn(start_dt)
    target = _to_vn(end_dt)
    if cur >= target:
        return 0.0

    total = 0.0
    while cur < target:
        if cur.weekday() >= 5:
            days = 2 if cur.weekday() == 5 else 1
            nxt = (cur + timedelta(days=days)).replace(hour=0, minute=0, second=0, microsecond=0)
            cur = nxt
            continue
        day_end = (cur + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        step_end = target if target <= day_end else day_end
        total += max(0.0, (step_end - cur).total_seconds() / 3600.0)
        cur = step_end
    return total


def remaining_business_hours(now_dt: datetime, due_at: datetime) -> float:
    """Trả về số giờ làm việc còn lại trước hạn chót (số âm khi đã quá hạn)."""
    now_vn = _to_vn(now_dt)
    due_vn = _to_vn(due_at)
    if now_vn <= due_vn:
        return round(_business_hours_between(now_vn, due_vn), 1)
    return -round(_business_hours_between(due_vn, now_vn), 1)


def calculate_review_due_at(assigned_at: datetime, due_hours: float = 48.0) -> datetime:
    """Tính thời điểm hết hạn nộp bài của Expert theo SLA làm việc."""
    return add_business_hours(assigned_at, due_hours)


def calculate_decline_deadline(assigned_at: datetime, decline_hours: float = 2.0) -> datetime:
    """Tính mốc thời gian tối đa Expert được phép từ chối nhận bài (FR-39)."""
    return add_business_hours(assigned_at, decline_hours)


def is_within_decline_window(assigned_at: datetime, decline_hours: float = 2.0, now_dt: datetime = None) -> bool:
    """Kiểm tra thời điểm hiện tại có còn trong khung giờ được từ chối bài không."""
    now_vn = _to_vn(now_dt) if now_dt is not None else datetime.now(TZ_VN)
    deadline = calculate_decline_deadline(assigned_at, decline_hours)
    return now_vn <= deadline
