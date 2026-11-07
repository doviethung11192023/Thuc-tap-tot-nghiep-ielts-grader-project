from fastapi import APIRouter, Depends, HTTPException, Query, status
from datetime import datetime, timezone
from typing import Optional
from app.core.student_content_cache import StudentContentMutationRoute
from app.core.security import require_admin, User
from app.db.supabase import db
from app.schemas.exam_content import SkillType
from app.schemas.system_settings import (
    BandConversionCreate, SystemSettingUpdate
)

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
    try:
        res = db().table("band_conversions").update(payload).eq("skill", skill_key).eq("raw_min", raw_min).execute()
    except Exception as e:
        raise _band_error(e)
    if not res.data:
        raise HTTPException(status_code=404, detail="Bản ghi quy đổi không tồn tại")
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
    return {"meta": {"code": 200, "message": "Xóa thành công"}}

# --- System Settings (Cấu Hình Tham Số Hệ Thống) ---
@router.get("/core/settings")
async def get_system_settings(current_user: User = Depends(require_admin)):
    """Lấy danh sách các cấu hình và tham số hệ thống."""
    res = db().table("system_settings").select("*").order("key").execute()
    return {"meta": {"code": 200}, "data": res.data or []}

@router.put("/core/settings/{key}")
async def update_system_setting(
    key: str,
    data: SystemSettingUpdate,
    current_user: User = Depends(require_admin)
):
    """Cập nhật giá trị một cấu hình hệ thống (JSON)."""
    if not db().table("system_settings").select("key").eq("key", key).execute().data:
        raise HTTPException(status_code=404, detail=f"Không có cấu hình '{key}'")
    payload = {
        "value": data.value,
        "updated_by": str(current_user.id),
        "admin_role": "admin",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    res = db().table("system_settings").upsert({"key": key, **payload}).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Không thể lưu cấu hình")
    return {"meta": {"code": 200, "message": f"Cập nhật cấu hình '{key}' thành công"}, "data": res.data[0]}
