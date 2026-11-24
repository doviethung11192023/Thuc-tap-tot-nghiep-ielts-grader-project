"""Cấu hình động từ system_settings cho Hệ thống 3 trụ cột & 4-Tier Chuyên gia (PRD_01)."""
from typing import Any

from app.core.domain_errors import InvalidRequestError
from app.db.supabase import db

TIER_MAX_CAP: dict[str, int] = {
    "probation": 2,
    "standard": 5,
    "high_performer": 8,
    "top_expert": 10,
}

TIER_PRIORITY_RANK: dict[str, int] = {
    "top_expert": 0,
    "high_performer": 1,
    "standard": 2,
    "probation": 3,
}

DEFAULT_EXPERT_COMPLETENESS_RULES: dict[str, Any] = {
    "min_criteria_count": 4,
    "min_criterion_comment_chars": 20,
    "min_overall_feedback_chars": 50,
    "min_writing_annotations": 1,
    "exempt_annotation_band": 8.5,
    "min_change_reason_chars": 15,
    "min_study_tip_chars": 30,
    "writing_rubber_stamp_sec": 90,
    "speaking_rubber_stamp_sec": 120,
    "require_speaking_part_feedback": True,
}

DEFAULT_EXPERT_RPS_CONFIG: dict[str, Any] = {
    "window_days": 30,
    "weight_sla_pct": 40,
    "weight_depth_pct": 30,
    "weight_consistency_pct": 20,
    "weight_speed_pct": 10,
    "gold_threshold": 90,
    "standard_threshold": 75,
    "target_turnaround_hours": 24,
}

DEFAULT_EXPERT_PENALTY_CONFIG: dict[str, Any] = {
    "window_days": 30,
    "strike1_rps_deduction": 10,
    "strike2_rps_deduction": 20,
    "strike2_capacity_ratio": 0.5,
    "strike2_cooldown_days": 7,
    "strike3_cooldown_days": 14,
}

_DEFAULTS_MAP = {
    "expert_completeness_rules": DEFAULT_EXPERT_COMPLETENESS_RULES,
    "expert_rps_config": DEFAULT_EXPERT_RPS_CONFIG,
    "expert_penalty_config": DEFAULT_EXPERT_PENALTY_CONFIG,
}


def _read_setting(key: str) -> dict[str, Any]:
    default = dict(_DEFAULTS_MAP[key])
    try:
        rows = db().table("system_settings").select("value").eq("key", key).limit(1).execute().data or []
        stored = rows[0].get("value") if rows else None
        if isinstance(stored, dict):
            return {**default, **stored}
    except Exception:
        pass
    return default


def get_completeness_rules() -> dict[str, Any]:
    return _read_setting("expert_completeness_rules")


def get_rps_config() -> dict[str, Any]:
    return _read_setting("expert_rps_config")


def get_penalty_config() -> dict[str, Any]:
    return _read_setting("expert_penalty_config")


def get_cooldown_min_active_pool() -> int:
    """Ngưỡng pool active tối thiểu trước khi tự động tạm ngưng Expert (BR-26)."""
    try:
        rows = (
            db()
            .table("system_settings")
            .select("value")
            .eq("key", "expert_cooldown_min_active_pool")
            .limit(1)
            .execute()
            .data
            or []
        )
        raw = rows[0].get("value") if rows else None
        if isinstance(raw, dict):
            return max(1, int(raw.get("value", 3)))
        if raw is not None:
            return max(1, int(raw))
    except Exception:
        pass
    return 3


_COMPLETENESS_INT_BOUNDS: dict[str, tuple[int, int]] = {
    "min_criteria_count": (1, 8),
    "min_overall_feedback_chars": (10, 500),
    "min_criterion_comment_chars": (5, 300),
    "min_writing_annotations": (0, 10),
    "min_change_reason_chars": (5, 200),
    "min_study_tip_chars": (10, 200),
    "writing_rubber_stamp_sec": (15, 600),
    "speaking_rubber_stamp_sec": (15, 600),
}


def validate_expert_setting(key: str, value: Any) -> dict[str, Any]:
    """Xác thực biên an toàn khi Admin cập nhật expert_completeness_rules / expert_cooldown_min_active_pool."""
    if key == "expert_cooldown_min_active_pool":
        raw = value.get("value") if isinstance(value, dict) else value
        if isinstance(raw, bool) or raw is None:
            raise InvalidRequestError("expert_cooldown_min_active_pool phải là số nguyên 1 - 50")
        try:
            num = int(raw)
        except (TypeError, ValueError):
            raise InvalidRequestError("expert_cooldown_min_active_pool phải là số nguyên hợp lệ")
        if num < 1 or num > 50:
            raise InvalidRequestError("Ngưỡng pool tối thiểu phải nằm trong khoảng 1 đến 50")
        return {"value": num}

    if key == "expert_completeness_rules":
        if not isinstance(value, dict):
            raise InvalidRequestError("expert_completeness_rules phải là JSON object")
        merged = {**DEFAULT_EXPERT_COMPLETENESS_RULES, **value}
        for field, (lo, hi) in _COMPLETENESS_INT_BOUNDS.items():
            raw_v = merged.get(field)
            if isinstance(raw_v, bool):
                raise InvalidRequestError(f"{field} phải là số nguyên")
            try:
                num = int(raw_v)
            except (TypeError, ValueError):
                raise InvalidRequestError(f"{field} phải là số nguyên hợp lệ")
            if num < lo or num > hi:
                raise InvalidRequestError(f"{field} phải trong khoảng {lo}..{hi}")
            merged[field] = num
        try:
            band = float(merged.get("exempt_annotation_band", 8.5))
        except (TypeError, ValueError):
            raise InvalidRequestError("exempt_annotation_band phải là số hợp lệ")
        if band < 6.0 or band > 9.0 or (band * 2) != int(band * 2):
            raise InvalidRequestError("exempt_annotation_band phải thuộc 6.0 - 9.0 (bước 0.5)")
        merged["exempt_annotation_band"] = band
        merged["require_speaking_part_feedback"] = bool(merged.get("require_speaking_part_feedback", True))
        return merged

    return value
