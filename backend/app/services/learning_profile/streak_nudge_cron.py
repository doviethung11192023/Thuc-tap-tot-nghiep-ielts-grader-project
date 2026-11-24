"""ARQ Smart Retention Nudge (20:00 GMT+7) & Freeze Notification (FR-60, BR-32)."""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any, Dict

from app.db.supabase import db
from app.services.notification_service import create_notification

from .adaptive_streak_service import compute_adaptive_streak
from .common import TZ_VN, compute_daily_active_minutes, get_learner_goal, get_user_attempts
from .gamification_state_store import get_gamification_state, mark_nudge_or_freeze_sent
from .valid_study_day import load_attempt_quality_map

MAX_INACTIVE_DAYS_FOR_NUDGE = 5
MIN_STREAK_FOR_NUDGE = 2


def run_daily_streak_nudge(force_hour_check: bool = True, now_vn: datetime | None = None) -> Dict[str, int]:
    """
    Gửi nhắc giữ chuỗi lúc 20:00 GMT+7 (BR-32):
    - Chỉ gửi khi current_streak >= 2, hôm nay chưa hoàn thành, nghỉ <= 5 ngày, reminder_enabled = true.
    - Tối đa 1 lần/ngày (lưu last_reminder_sent_date).
    - Tự động gửi thông báo streak_freeze_used nếu hôm qua được bảo vệ bằng Freeze.
    """
    current_vn = now_vn or datetime.now(TZ_VN)
    if force_hour_check and current_vn.hour != 20:
        return {"skipped_hour": current_vn.hour, "reminders_sent": 0, "freeze_notices_sent": 0}

    today = current_vn.date()
    today_iso = today.isoformat()
    yesterday_iso = (today - timedelta(days=1)).isoformat()
    cutoff_iso = (today - timedelta(days=MAX_INACTIVE_DAYS_FOR_NUDGE + 2)).isoformat()

    recent_rows = (
        db()
        .table("attempts")
        .select("learner_id")
        .gte("started_at", cutoff_iso)
        .in_("status", ["scored", "waiting_expert", "grading"])
        .execute()
        .data
        or []
    )
    candidate_ids = sorted({str(r["learner_id"]) for r in recent_rows if r.get("learner_id")})

    reminders_sent = 0
    freeze_notices_sent = 0
    for uid in candidate_ids:
        try:
            state = get_gamification_state(uid)
            attempts = get_user_attempts(uid)
            goal = get_learner_goal(uid)
            daily_minutes = compute_daily_active_minutes(attempts)
            quality_map = load_attempt_quality_map(uid, attempts)
            streak = compute_adaptive_streak(
                attempts, daily_minutes, goal, today_vn=today, state=state, quality_map=quality_map
            )

            # 1. Thông báo nếu ngày hôm qua vừa tiêu thụ Freeze để bảo vệ chuỗi
            frozen_dates = streak.get("frozen_dates") or []
            if yesterday_iso in frozen_dates and state.get("last_freeze_notified_date") != yesterday_iso:
                create_notification(
                    user_id=uid,
                    notification_type="streak_freeze_used",
                    title="Streak Freeze đã bảo vệ chuỗi học của bạn",
                    message=f"Hệ thống đã dùng 1 thẻ Freeze cho ngày {yesterday_iso} để giữ nguyên chuỗi {streak['current_streak']} ngày.",
                    action_url="/learning-profile",
                    metadata={"frozen_date": yesterday_iso, "current_streak": streak["current_streak"]},
                )
                mark_nudge_or_freeze_sent(uid, freeze_date=yesterday_iso)
                freeze_notices_sent += 1

            # 2. Nhắc giữ chuỗi thông minh (BR-32)
            if not state.get("reminder_enabled", True):
                continue
            if state.get("last_reminder_sent_date") == today_iso:
                continue
            if streak["today_met"] or int(streak["current_streak"]) < MIN_STREAK_FOR_NUDGE:
                continue

            last_active = streak.get("last_active_date")
            if last_active:
                days_inactive = (today - date.fromisoformat(last_active)).days
                if days_inactive > MAX_INACTIVE_DAYS_FOR_NUDGE:
                    continue

            create_notification(
                user_id=uid,
                notification_type="streak_reminder",
                title=f"Giữ vững chuỗi {streak['current_streak']} ngày trước 00:00 nhé!",
                message="Hoàn thành nhanh 1 Passage Reading/Listening (>= 5 câu) hoặc 1 phần Writing/Speaking hôm nay để nối dài chuỗi.",
                action_url="/test-practice",
                metadata={"current_streak": streak["current_streak"], "date": today_iso},
            )
            mark_nudge_or_freeze_sent(uid, reminder_date=today_iso)
            reminders_sent += 1
        except Exception:
            continue

    return {"reminders_sent": reminders_sent, "freeze_notices_sent": freeze_notices_sent}
