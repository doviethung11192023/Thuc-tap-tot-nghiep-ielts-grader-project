"""Dịch vụ siêu nhẹ cho Header Streak Pill (< 30ms cached) và luồng xác nhận Streak Repair 48h (BR-29)."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict

from app.core.domain_errors import ConflictError

from .adaptive_streak_service import compute_adaptive_streak
from .common import (
    compute_daily_active_minutes,
    get_from_cache,
    get_learner_goal,
    get_user_attempts,
    set_to_cache,
)
from .gamification_state_store import get_gamification_state, persist_streak_repair
from .valid_study_day import load_attempt_quality_map


def get_streak_summary(user_id: str) -> Dict[str, Any]:
    """Endpoint nhẹ chuyên phục vụ Header Streak Pill trên mọi trang Học viên (cache 60s)."""
    cache_key = f"streak_summary_{user_id}"
    cached = get_from_cache(cache_key)
    if cached is not None:
        return cached

    attempts = get_user_attempts(user_id)
    goal = get_learner_goal(user_id)
    daily_minutes = compute_daily_active_minutes(attempts)
    state = get_gamification_state(user_id)
    quality_map = load_attempt_quality_map(user_id, attempts)
    streak = compute_adaptive_streak(attempts, daily_minutes, goal, state=state, quality_map=quality_map)

    summary = {
        "current_streak": streak["current_streak"],
        "longest_streak": streak["longest_streak"],
        "mode": streak["mode"],
        "daily_target_minutes": streak["daily_target_minutes"],
        "days_until_exam": streak["days_until_exam"],
        "today_met": streak["today_met"],
        "today_minutes": streak["today_minutes"],
        "today_completed": streak["today_completed"],
        "freezes_remaining": streak["freezes_remaining"],
        "max_freezes_per_month": streak["max_freezes_per_month"],
        "weekly_goal_days": streak["weekly_goal_days"],
        "weekly_completed_days": streak["weekly_completed_days"],
        "reminder_enabled": streak["reminder_enabled"],
        "hours_until_midnight_vn": streak["hours_until_midnight_vn"],
        "can_repair": streak["can_repair"],
        "broken_streak_backup": streak["broken_streak_backup"],
        "repair_deadline_at": streak["repair_deadline_at"],
        "repair_progress": streak["repair_progress"],
    }
    set_to_cache(cache_key, summary, ttl_seconds=60)
    return summary


def claim_streak_repair(user_id: str) -> Dict[str, Any]:
    """Xác thực cửa sổ 48h, chu kỳ 30 ngày & nhiệm vụ 2x rồi lưu vết khôi phục chuỗi bền vững (UC-47, BR-29)."""
    attempts = get_user_attempts(user_id)
    goal = get_learner_goal(user_id)
    daily_minutes = compute_daily_active_minutes(attempts)
    state = get_gamification_state(user_id)
    quality_map = load_attempt_quality_map(user_id, attempts)
    streak = compute_adaptive_streak(attempts, daily_minutes, goal, state=state, quality_map=quality_map)

    if not streak.get("can_repair") or not streak.get("repair_gap_dates"):
        raise ConflictError(
            "Hiện không có chuỗi đủ điều kiện khôi phục (cần chuỗi >= 5 ngày bị đứt trong 48 giờ và chưa dùng trong 30 ngày qua)."
        )

    prog = streak.get("repair_progress") or {"completed": 0, "required": 2}
    if int(prog["completed"]) < int(prog["required"]):
        raise ConflictError(
            "Bạn cần hoàn thành nhiệm vụ gấp đôi chuẩn ngày (2 bài Reading/Listening tổng >= 15 câu HOẶC 1 bài Writing/Speaking hợp lệ) trước khi khôi phục chuỗi."
        )

    new_state = persist_streak_repair(user_id, streak["repair_gap_dates"], datetime.now(timezone.utc))
    refreshed = compute_adaptive_streak(attempts, daily_minutes, goal, state=new_state, quality_map=quality_map)
    return {
        "restored": True,
        "current_streak": refreshed["current_streak"],
        "longest_streak": refreshed["longest_streak"],
        "repaired_dates": new_state.get("repaired_dates") or [],
    }
