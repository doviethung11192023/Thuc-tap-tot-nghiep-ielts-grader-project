"""Cấu hình động từ system_settings cho Adaptive Streak & Huy hiệu 3 tầng (Wave 5)."""
from typing import Any

from app.db.supabase import db
from .common import get_from_cache, set_to_cache

GAMIFICATION_CACHE_KEY = "gamification_config"

DEFAULT_LEARNER_GAMIFICATION_CONFIG: dict[str, Any] = {
    "normal_daily_minutes": 15,
    "sprint_daily_minutes": 30,
    "sprint_days_before_exam": 60,
    "freeze_per_streak_days": 7,
    "max_freezes_per_month": 2,
    "grace_recovery_max_gap_days": 2,
    "streak_tiers": {"bronze": 3, "silver": 14, "gold": 30},
    "mastery_gold_accuracy_pct": 80,
    "mastery_gold_min_types": 3,
    "mastery_gold_min_scored": 20,
    "breakthrough_bronze_delta": 0.5,
    "breakthrough_silver_band": 6.5,
}


def get_gamification_config() -> dict[str, Any]:
    cached = get_from_cache(GAMIFICATION_CACHE_KEY)
    if cached is not None:
        return dict(cached)
    default = dict(DEFAULT_LEARNER_GAMIFICATION_CONFIG)
    try:
        rows = (
            db().table("system_settings")
            .select("value")
            .eq("key", "learner_gamification_config")
            .limit(1)
            .execute()
            .data
            or []
        )
        stored = rows[0].get("value") if rows else None
        if isinstance(stored, dict):
            merged = {**default, **stored}
            if isinstance(stored.get("streak_tiers"), dict):
                merged["streak_tiers"] = {**default["streak_tiers"], **stored["streak_tiers"]}
            set_to_cache(GAMIFICATION_CACHE_KEY, merged, ttl_seconds=120)
            return dict(merged)
    except Exception:
        pass
    set_to_cache(GAMIFICATION_CACHE_KEY, default, ttl_seconds=120)
    return default
