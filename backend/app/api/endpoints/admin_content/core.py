from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from datetime import datetime, timezone
from typing import Optional
from app.core.domain_errors import InvalidRequestError
from app.core.student_content_cache import StudentContentMutationRoute
from app.core.security import require_admin, User
from app.db.supabase import db
from app.services.admin.staff_accounts import write_audit   # UC-38: sửa bảng quy đổi và cấu hình phải ghi audit
from app.schemas.exam_content import SkillType
from app.schemas.system_settings import (
    BandConversionCreate, SystemSettingUpdate
)
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

router = APIRouter(route_class=StudentContentMutationRoute)


def _with_id(row: dict) -> dict:
    """band_conversions có khoá (skill, raw_min); API dùng id "skill:raw_min"."""
    return {**row, "id": f"{row['skill']}:{row['raw_min']}"}


def _band_error(e: Exception) -> HTTPException:
    """Lỗi DB khi ghi bảng quy đổi: khoảng chồng lấn (ràng buộc 15) khác với band sai bước 0.5 (BR-01)."""
    msg = str(e)
    if "exclusion" in msg or "conflicting key" in msg or "overlap" in msg or "duplicate key" in msg:
        return HTTPException(status_code=409, detail="Khoảng điểm đã tồn tại hoặc bị chồng lấn với khoảng khác cùng kỹ năng")
    if "band" in msg and "check constraint" in msg:
        return HTTPException(status_code=400, detail="Band phải là bội số của 0.5 từ 0 đến 9 (BR-01)")
    return HTTPException(status_code=400, detail=msg[:200])


def _parse_id(item_id: str) -> tuple:
    try:
        skill_key, raw_min = item_id.split(":")
        return skill_key, int(raw_min)
    except ValueError:
        raise HTTPException(status_code=400, detail="Mã quy đổi không hợp lệ (dạng skill:raw_min)")

# --- Band Conversions (Bảng Quy Đổi Điểm Thô Sang Band Score) ---
@router.get("/core/band-conversions")
async def get_band_conversions(
    skill: Optional[SkillType] = Query(None, description="Lọc theo skill: listening, reading"),
    current_user: User = Depends(require_admin)
):
    """Danh sách bảng quy đổi điểm số thô sang IELTS Band Score."""
    query = db().table("band_conversions").select("skill, raw_min, raw_max, band")
    if skill:
        query = query.eq("skill", skill.value)
    res = query.order("skill").order("raw_min", desc=True).execute()
    return {"meta": {"code": 200}, "data": [_with_id(r) for r in res.data or []]}

@router.post("/core/band-conversions", status_code=status.HTTP_201_CREATED)
async def create_band_conversion(
    data: BandConversionCreate,
    current_user: User = Depends(require_admin)
):
    """Thêm một khoảng quy đổi điểm mới."""
    if data.skill not in [SkillType.LISTENING, SkillType.READING]:
        raise HTTPException(status_code=400, detail="Quy đổi điểm thô chỉ áp dụng cho Reading và Listening")
    if data.raw_min > data.raw_max:
        raise HTTPException(status_code=400, detail="raw_min phải nhỏ hơn hoặc bằng raw_max")

    payload = {
        "skill": data.skill.value,
        "raw_min": data.raw_min,
        "raw_max": data.raw_max,
        "band": data.band
    }
    try:
        res = db().table("band_conversions").insert(payload).execute()
    except Exception as e:
        raise _band_error(e)
    write_audit(str(current_user.id), "create_band_conversion", "band_conversions", _with_id(res.data[0])["id"],
                after=payload)
    return {"meta": {"code": 201, "message": "Thêm khoảng quy đổi thành công"}, "data": _with_id(res.data[0])}

@router.put("/core/band-conversions/{item_id}")
async def update_band_conversion(
    item_id: str,
    data: BandConversionCreate,
    current_user: User = Depends(require_admin)
):
    """Cập nhật một khoảng quy đổi điểm."""
    if data.raw_min > data.raw_max:
        raise HTTPException(status_code=400, detail="raw_min phải nhỏ hơn hoặc bằng raw_max")
    payload = {
        "skill": data.skill.value,
        "raw_min": data.raw_min,
        "raw_max": data.raw_max,
        "band": data.band
    }
    skill_key, raw_min = _parse_id(item_id)
    before = db().table("band_conversions").select("skill, raw_min, raw_max, band") \
        .eq("skill", skill_key).eq("raw_min", raw_min).execute().data
    try:
        res = db().table("band_conversions").update(payload).eq("skill", skill_key).eq("raw_min", raw_min).execute()
    except Exception as e:
        raise _band_error(e)
    if not res.data:
        raise HTTPException(status_code=404, detail="Bản ghi quy đổi không tồn tại")
    write_audit(str(current_user.id), "update_band_conversion", "band_conversions", item_id,
                before=before[0] if before else None, after=payload)
    return {"meta": {"code": 200, "message": "Cập nhật thành công"}, "data": _with_id(res.data[0])}

@router.delete("/core/band-conversions/{item_id}")
async def delete_band_conversion(
    item_id: str,
    current_user: User = Depends(require_admin)
):
    """Xóa một khoảng quy đổi điểm."""
    skill_key, raw_min = _parse_id(item_id)
    res = db().table("band_conversions").delete().eq("skill", skill_key).eq("raw_min", raw_min).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Bản ghi quy đổi không tồn tại")
    write_audit(str(current_user.id), "delete_band_conversion", "band_conversions", item_id, before=res.data[0])
    return {"meta": {"code": 200, "message": "Xóa thành công"}}

# --- System Settings (Cấu Hình Tham Số Hệ Thống) ---
@router.get("/core/settings")
async def get_system_settings(current_user: User = Depends(require_admin)):
    """Lấy danh sách các cấu hình hệ thống (ẩn tuyệt đối ai_tutor_secrets, kèm mặc định roadmap/tutor/Wave 5)."""
    res = db().table("system_settings").select("*").order("key").execute()
    rows = [r for r in (res.data or []) if r.get("key") not in HIDDEN_SECRET_SETTINGS]
    existing_keys = {r.get("key") for r in rows}
    for s_key, s_val, s_desc in _DEFAULT_SETTINGS_INJECT:
        if s_key not in existing_keys:
            rows.append({"key": s_key, "value": s_val, "description": s_desc, "updated_at": None})
    return {"meta": {"code": 200}, "data": rows}

@router.put("/core/settings/{key}")
async def update_system_setting(
    key: str,
    data: SystemSettingUpdate,
    request: Request,
    current_user: User = Depends(require_admin),
):
    """Cập nhật giá trị một cấu hình hệ thống (JSON)."""
    if key in HIDDEN_SECRET_SETTINGS:
        raise HTTPException(status_code=403, detail="Không thể chỉnh sửa kho khóa bí mật qua endpoint cấu hình chung")
    existing = db().table("system_settings").select("key, value").eq("key", key).execute().data
    if not existing and key not in ALLOWED_UPSERT_SETTINGS:
        raise HTTPException(status_code=404, detail=f"Không có cấu hình '{key}'")
    try:
        if key == "ai_tutor_config":
            value = validate_tutor_config(data.value)
        elif key in ("expert_completeness_rules", "expert_cooldown_min_active_pool"):
            value = validate_expert_setting(key, data.value)
        else:
            value = data.value
    except InvalidRequestError as exc:
        raise HTTPException(status_code=400, detail=exc.detail)
    payload = {
        "value": value,
        "updated_by": str(current_user.id),
        "admin_role": "admin",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    res = db().table("system_settings").upsert({"key": key, **payload}).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Không thể lưu cấu hình")
    if key in ("roadmap_config", "learner_gamification_config"):
        clear_all_profile_cache()
    if key in ("expert_completeness_rules", "expert_rps_config", "expert_penalty_config", "expert_cooldown_min_active_pool"):
        try:
            redis = getattr(request.app.state, "redis", None)
            if redis is not None:
                await redis.delete("admin:statistics:v2", "admin:statistics:v3")
        except Exception:
            pass
    before_val = {"value": existing[0]["value"]} if existing else None
    if key == "ai_tutor_config":
        invalidate_tutor_config_cache()
        write_audit(
            str(current_user.id),
            "update_ai_tutor_config",
            "system_settings",
            key,
            before=before_val,
            after={"model": value.get("primary_model"), "enabled": value.get("enabled"), "hourly_quota": value.get("hourly_quota")},
        )
    elif key in ("expert_completeness_rules", "expert_rps_config", "expert_penalty_config", "expert_cooldown_min_active_pool", "learner_gamification_config"):
        write_audit(str(current_user.id), f"update_{key}", "system_settings", key, before=before_val, after=value)
    else:
        write_audit(
            str(current_user.id),
            "update_system_setting",
            "system_settings",
            key,
            before=before_val,
            after={"value": value},
        )
    return {"meta": {"code": 200, "message": f"Cập nhật cấu hình '{key}' thành công"}, "data": res.data[0]}
