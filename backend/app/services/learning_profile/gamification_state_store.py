"""Lưu trữ & đồng bộ trạng thái gamification nhẹ (learner_gamification_state) + thông báo huy hiệu/nhắc học."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from app.core.domain_errors import ForbiddenError, InvalidRequestError
from app.db.supabase import db
from app.services.notifications.notification_service import create_notification

from .common import get_from_cache, invalidate_user_profile_cache, set_to_cache

DEFAULT_GAMIFICATION_STATE: Dict[str, Any] = {
    "weekly_goal_days": 5,
    "reminder_enabled": True,
    "repaired_dates": [],
    "last_repaired_at": None,
    "notified_badge_codes": [],
    "last_freeze_notified_date": None,
    "last_reminder_sent_date": None,
}


def _is_valid_uuid(raw: str) -> bool:
    try:
        UUID(str(raw))
        return True
    except Exception:
        return False


def get_gamification_state(user_id: str) -> Dict[str, Any]:
    """Đọc cấu hình cá nhân & vết Repair/Thông báo từ learner_gamification_state (cache 60s)."""
    if not _is_valid_uuid(user_id):
        return dict(DEFAULT_GAMIFICATION_STATE)
    cache_key = f"gstate_{user_id}"
    cached = get_from_cache(cache_key)
    if cached is not None:
        return cached
    try:
        rows = (
            db()
            .table("learner_gamification_state")
            .select(
                "weekly_goal_days, reminder_enabled, repaired_dates, last_repaired_at, "
                "notified_badge_codes, last_freeze_notified_date, last_reminder_sent_date"
            )
            .eq("user_id", user_id)
            .limit(1)
            .execute()
            .data
            or []
        )
        row = rows[0] if rows else {}
        data = {
            "weekly_goal_days": int(row.get("weekly_goal_days") or 5),
            "reminder_enabled": bool(row.get("reminder_enabled", True)),
            "repaired_dates": [str(d)[:10] for d in (row.get("repaired_dates") or [])],
            "last_repaired_at": row.get("last_repaired_at"),
            "notified_badge_codes": [str(c) for c in (row.get("notified_badge_codes") or [])],
            "last_freeze_notified_date": str(row["last_freeze_notified_date"])[:10]
            if row.get("last_freeze_notified_date")
            else None,
            "last_reminder_sent_date": str(row["last_reminder_sent_date"])[:10]
            if row.get("last_reminder_sent_date")
            else None,
        }
    except Exception:
        data = dict(DEFAULT_GAMIFICATION_STATE)
    set_to_cache(cache_key, data, ttl_seconds=60)
    return data


def _upsert_state_fields(user_id: str, fields: Dict[str, Any]) -> Dict[str, Any]:
    if not _is_valid_uuid(user_id):
        raise ForbiddenError("Tài khoản không hợp lệ")
    if not db().table("learner_profiles").select("user_id").eq("user_id", user_id).limit(1).execute().data:
        raise ForbiddenError("Chỉ tài khoản Học viên mới có thể cấu hình kế hoạch học tập")
    payload = {
        "user_id": user_id,
        **fields,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    db().table("learner_gamification_state").upsert(payload, on_conflict="user_id").execute()
    invalidate_user_profile_cache(user_id)
    return get_gamification_state(user_id)


def update_study_plan(
    user_id: str,
    weekly_goal_days: Optional[int] = None,
    reminder_enabled: Optional[bool] = None,
) -> Dict[str, Any]:
    """Cập nhật mục tiêu buổi/tuần (3/5/7) và công tắc nhắc học 20:00 GMT+7 (FR-57)."""
    changes: Dict[str, Any] = {}
    if weekly_goal_days is not None:
        if int(weekly_goal_days) not in (3, 5, 7):
            raise InvalidRequestError("Mục tiêu tuần chỉ chấp nhận 3, 5 hoặc 7 buổi/tuần")
        changes["weekly_goal_days"] = int(weekly_goal_days)
    if reminder_enabled is not None:
        changes["reminder_enabled"] = bool(reminder_enabled)
    if not changes:
        raise InvalidRequestError("Không có trường kế hoạch học tập hợp lệ để cập nhật")
    return _upsert_state_fields(user_id, changes)


def persist_streak_repair(user_id: str, gap_dates: List[str], now_utc: datetime) -> Dict[str, Any]:
    """Lưu các ngày khoảng trống đã khôi phục & chốt mốc last_repaired_at (cooldown 30 ngày, BR-29)."""
    cur = get_gamification_state(user_id)
    merged = sorted(set(cur.get("repaired_dates") or []) | {str(d)[:10] for d in gap_dates})[-60:]
    return _upsert_state_fields(
        user_id,
        {"repaired_dates": merged, "last_repaired_at": now_utc.isoformat()},
    )


def sync_new_badge_notifications(
    user_id: str,
    badges_payload: Dict[str, Any],
    state: Dict[str, Any],
) -> List[str]:
    """Phát thông báo badge_unlocked đúng 1 lần cho mỗi huy hiệu mới mở khóa (FR-58)."""
    if not _is_valid_uuid(user_id):
        return []
    already = set(state.get("notified_badge_codes") or [])
    unlocked = [b for b in (badges_payload.get("badges") or []) if b.get("unlocked")]
    fresh = [b for b in unlocked if b.get("id") and b["id"] not in already]
    if not fresh:
        return []

    # Nếu chưa từng ghi nhận notified_badge_codes nào mà đã có nhiều huy hiệu cũ, chỉ thông báo huy hiệu cao nhất để tránh spam
    to_notify = fresh if already else fresh[-2:]
    for b in to_notify:
        create_notification(
            user_id=user_id,
            notification_type="badge_unlocked",
            title=f"Mở khóa huy hiệu: {b['title']}",
            message=str(b.get("description") or "Chúc mừng bạn đã đạt cột mốc mới trên MoonLab IELTS!"),
            action_url="/learning-profile",
            metadata={"badge_code": b["id"], "tier": b.get("tier"), "pillar": b.get("pillar")},
        )
    merged_codes = sorted(already | {b["id"] for b in unlocked})
    try:
        _upsert_state_fields(user_id, {"notified_badge_codes": merged_codes})
    except Exception:
        pass
    return [b["id"] for b in to_notify]


def mark_nudge_or_freeze_sent(
    user_id: str,
    *,
    reminder_date: Optional[str] = None,
    freeze_date: Optional[str] = None,
) -> None:
    """Đánh dấu đã gửi nhắc học / thông báo Freeze trong ngày để chống gửi trùng (BR-32)."""
    fields: Dict[str, Any] = {}
    if reminder_date:
        fields["last_reminder_sent_date"] = reminder_date
    if freeze_date:
        fields["last_freeze_notified_date"] = freeze_date
    if fields:
        try:
            _upsert_state_fields(user_id, fields)
        except Exception:
            pass
