"""Cấu hình hệ thống (bảng system_settings): liệt kê kèm mặc định và lưu có kiểm tra theo từng khoá.

Route PUT /core/settings/{key} chỉ lo xoá cache Redis (async); mọi truy vấn Supabase đồng bộ nằm ở đây.
"""
from datetime import datetime, timezone

from app.core.domain_errors import (
    ForbiddenError,
    InternalFailureError,
    InvalidRequestError,
    NotFoundError,
)
from app.db.supabase import db
from app.services.admin.staff_accounts import write_audit   # UC-38: sửa cấu hình phải ghi audit
from app.services.ai_services.ai_step_catalog import is_ai_managed_setting
from app.services.expert.expert_policy_config import (
    DEFAULT_EXPERT_COMPLETENESS_RULES,
    DEFAULT_EXPERT_PENALTY_CONFIG,
    DEFAULT_EXPERT_RPS_CONFIG,
    validate_expert_setting,
)
from app.services.learning_profile.common import clear_all_profile_cache
from app.services.learning_profile.gamification_config import DEFAULT_LEARNER_GAMIFICATION_CONFIG
from app.services.practice.learning_profile_readers import DEFAULT_ROADMAP_CONFIG
from app.services.tutor.tutor_config_store import (
    DEFAULT_AI_TUTOR_CONFIG,
    invalidate_tutor_config_cache,
    validate_tutor_config,
)

ALLOWED_UPSERT_SETTINGS = {
    "roadmap_config",
    "ai_tutor_config",
    "expert_completeness_rules",
    "expert_rps_config",
    "expert_penalty_config",
    "expert_cooldown_min_active_pool",
    "learner_gamification_config",
}
_DEFAULT_SETTINGS_INJECT: tuple[tuple[str, dict, str], ...] = (
    ("roadmap_config", DEFAULT_ROADMAP_CONFIG, "Tham số cá nhân hóa lộ trình học tập"),
    ("ai_tutor_config", DEFAULT_AI_TUTOR_CONFIG, "Cấu hình Trợ lý AI luyện tập Reading/Listening"),
    ("expert_completeness_rules", DEFAULT_EXPERT_COMPLETENESS_RULES, "Ngưỡng kiểm tra độ đầy đủ bài chấm Chuyên gia (Pillar 1)"),
    ("expert_rps_config", DEFAULT_EXPERT_RPS_CONFIG, "Trọng số & ngưỡng hạng Review Performance Score 30 ngày (Pillar 2)"),
    ("expert_penalty_config", DEFAULT_EXPERT_PENALTY_CONFIG, "Cấu hình phạt lũy tiến quá hạn SLA 48h (Pillar 3)"),
    ("expert_cooldown_min_active_pool", {"value": 3}, "Ngưỡng tối thiểu số Chuyên gia active trước khi tự động Cooldown (BR-26)"),
    ("learner_gamification_config", DEFAULT_LEARNER_GAMIFICATION_CONFIG, "Cấu hình Adaptive Streak, Streak Freeze & Huy hiệu 3 tầng Học viên"),
)
HIDDEN_SECRET_SETTINGS = {"ai_tutor_secrets"}

# Cấu hình ảnh hưởng số liệu Expert: đổi thì route xoá cache trang thống kê Admin
STATS_CACHE_SETTINGS = ("expert_completeness_rules", "expert_rps_config", "expert_penalty_config",
                        "expert_cooldown_min_active_pool")
_EXPERT_AUDITED_SETTINGS = STATS_CACHE_SETTINGS + ("learner_gamification_config",)


def list_system_settings() -> list[dict]:
    """Cấu hình hiện có (ẩn tuyệt đối kho khoá bí mật) cộng các mặc định chưa được lưu."""
    res = db().table("system_settings").select("*").order("key").execute()
    # Khoá ai_* và trace_view_days do trang Service AI quản lý (spec 008), kho khoá bí mật cũng không lộ ở trình sửa JSON chung
    rows = [r for r in (res.data or [])
            if r.get("key") not in HIDDEN_SECRET_SETTINGS and not is_ai_managed_setting(r["key"])]
    existing_keys = {r.get("key") for r in rows}
    for s_key, s_val, s_desc in _DEFAULT_SETTINGS_INJECT:
        if s_key not in existing_keys and not is_ai_managed_setting(s_key):
            rows.append({"key": s_key, "value": s_val, "description": s_desc, "updated_at": None})
    return rows


def save_system_setting(key: str, raw_value, admin_id: str) -> dict:
    """Kiểm tra theo khoá, upsert, xoá cache liên quan và ghi audit. Trả về dòng đã lưu."""
    if key in HIDDEN_SECRET_SETTINGS:
        raise ForbiddenError("Không thể chỉnh sửa kho khóa bí mật qua endpoint cấu hình chung")
    if is_ai_managed_setting(key):
        raise InvalidRequestError("Quản lý ở trang Service AI")
    existing = db().table("system_settings").select("key, value").eq("key", key).execute().data
    if not existing and key not in ALLOWED_UPSERT_SETTINGS:
        raise NotFoundError(f"Không có cấu hình '{key}'")
    if key == "ai_tutor_config":
        value = validate_tutor_config(raw_value)
    elif key in ("expert_completeness_rules", "expert_cooldown_min_active_pool"):
        value = validate_expert_setting(key, raw_value)
    else:
        value = raw_value
    payload = {
        "value": value,
        "updated_by": admin_id,
        "admin_role": "admin",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    res = db().table("system_settings").upsert({"key": key, **payload}).execute()
    if not res.data:
        raise InternalFailureError("Không thể lưu cấu hình")
    if key in ("roadmap_config", "learner_gamification_config"):
        clear_all_profile_cache()
    before_val = {"value": existing[0]["value"]} if existing else None
    if key == "ai_tutor_config":
        invalidate_tutor_config_cache()
        write_audit(
            admin_id,
            "update_ai_tutor_config",
            "system_settings",
            key,
            before=before_val,
            after={"model": value.get("primary_model"), "enabled": value.get("enabled"), "hourly_quota": value.get("hourly_quota")},
        )
    elif key in _EXPERT_AUDITED_SETTINGS:
        write_audit(admin_id, f"update_{key}", "system_settings", key, before=before_val, after=value)
    else:
        write_audit(admin_id, "update_system_setting", "system_settings", key, before=before_val, after={"value": value})
    return res.data[0]
