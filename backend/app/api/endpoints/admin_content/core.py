from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional
from app.core.security import require_admin, User
from app.db.supabase import supabase
from app.schemas.exam_content import SkillType
from app.schemas.system_settings import (
    BandConversionCreate, SystemSettingUpdate
)

router = APIRouter()

# --- Band Conversions (Bảng Quy Đổi Điểm Thô Sang Band Score) ---
@router.get("/core/band-conversions")
async def get_band_conversions(
    skill: Optional[SkillType] = Query(None, description="Lọc theo skill: listening, reading"),
    current_user: User = Depends(require_admin)
):
    """Danh sách bảng quy đổi điểm số thô sang IELTS Band Score."""
    query = supabase.table("band_conversions").select("*")
    if skill:
        query = query.eq("skill", skill.value)
    res = query.order("skill").order("raw_min", desc=True).execute()
    return {"meta": {"code": 200}, "data": res.data or []}

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
    res = supabase.table("band_conversions").insert(payload).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Không thể tạo khoảng quy đổi điểm")
    return {"meta": {"code": 201, "message": "Thêm khoảng quy đổi thành công"}, "data": res.data[0]}

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
    res = supabase.table("band_conversions").update(payload).eq("id", item_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Bản ghi quy đổi không tồn tại")
    return {"meta": {"code": 200, "message": "Cập nhật thành công"}, "data": res.data[0]}

@router.delete("/core/band-conversions/{item_id}")
async def delete_band_conversion(
    item_id: str,
    current_user: User = Depends(require_admin)
):
    """Xóa một khoảng quy đổi điểm."""
    res = supabase.table("band_conversions").delete().eq("id", item_id).execute()
    return {"meta": {"code": 200, "message": "Xóa thành công"}}

# --- System Settings (Cấu Hình Tham Số Hệ Thống) ---
@router.get("/core/settings")
async def get_system_settings(current_user: User = Depends(require_admin)):
    """Lấy danh sách các cấu hình và tham số hệ thống."""
    res = supabase.table("system_settings").select("*").order("key").execute()
    return {"meta": {"code": 200}, "data": res.data or []}

@router.put("/core/settings/{key}")
async def update_system_setting(
    key: str,
    data: SystemSettingUpdate,
    current_user: User = Depends(require_admin)
):
    """Cập nhật giá trị một cấu hình hệ thống (JSON)."""
    payload = {
        "value": data.value,
        "updated_by": str(current_user.id),
        "updated_at": "now()"
    }

    res = supabase.table("system_settings").upsert({"key": key, **payload}).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Không thể lưu cấu hình")
    return {"meta": {"code": 200, "message": f"Cập nhật cấu hình '{key}' thành công"}, "data": res.data[0]}
