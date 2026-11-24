from fastapi import APIRouter, Depends, Query, Request, status
from fastapi.concurrency import run_in_threadpool
from typing import Optional
from app.api.responses import created, ok
from app.core.student_content_cache import StudentContentMutationRoute
from app.core.security import require_admin, User
from app.schemas.exam_content import SkillType
from app.schemas.system_settings import (
    BandConversionCreate, SystemSettingUpdate
)
from app.services.admin import band_conversion_service, system_settings_service
# Hằng số cấu hình giữ ở service; import lại tên cũ để test và nơi khác đọc từ module này vẫn chạy
from app.services.admin.system_settings_service import (  # noqa: F401
    ALLOWED_UPSERT_SETTINGS,
    HIDDEN_SECRET_SETTINGS,
    STATS_CACHE_SETTINGS,
)

router = APIRouter(route_class=StudentContentMutationRoute)

# --- Band Conversions (Bảng Quy Đổi Điểm Thô Sang Band Score) ---
@router.get("/core/band-conversions")
def get_band_conversions(
    skill: Optional[SkillType] = Query(None, description="Lọc theo skill: listening, reading"),
    current_user: User = Depends(require_admin)
):
    """Danh sách bảng quy đổi điểm số thô sang IELTS Band Score."""
    return ok(band_conversion_service.list_band_conversions(skill))

@router.post("/core/band-conversions", status_code=status.HTTP_201_CREATED)
def create_band_conversion(
    data: BandConversionCreate,
    current_user: User = Depends(require_admin)
):
    """Thêm một khoảng quy đổi điểm mới."""
    item = band_conversion_service.create_band_conversion(data, str(current_user.id))
    return created(item, message="Thêm khoảng quy đổi thành công")

@router.put("/core/band-conversions/{item_id}")
def update_band_conversion(
    item_id: str,
    data: BandConversionCreate,
    current_user: User = Depends(require_admin)
):
    """Cập nhật một khoảng quy đổi điểm."""
    item = band_conversion_service.update_band_conversion(item_id, data, str(current_user.id))
    return ok(item, message="Cập nhật thành công")

@router.delete("/core/band-conversions/{item_id}")
def delete_band_conversion(
    item_id: str,
    current_user: User = Depends(require_admin)
):
    """Xóa một khoảng quy đổi điểm."""
    band_conversion_service.delete_band_conversion(item_id, str(current_user.id))
    return ok(message="Xóa thành công")

# --- System Settings (Cấu Hình Tham Số Hệ Thống) ---
@router.get("/core/settings")
def get_system_settings(current_user: User = Depends(require_admin)):
    """Lấy danh sách các cấu hình hệ thống (ẩn tuyệt đối ai_tutor_secrets, kèm mặc định roadmap/tutor/Wave 5)."""
    return ok(system_settings_service.list_system_settings())


@router.put("/core/settings/{key}")
async def update_system_setting(
    key: str,
    data: SystemSettingUpdate,
    request: Request,
    current_user: User = Depends(require_admin),
):
    """Cập nhật giá trị một cấu hình hệ thống (JSON). Đọc/ghi Supabase (đồng bộ) chạy trong threadpool để không
    chặn event loop; chỉ phần xoá cache Redis (async) chạy ở đây."""
    saved = await run_in_threadpool(
        system_settings_service.save_system_setting, key, data.value, str(current_user.id)
    )
    if key in STATS_CACHE_SETTINGS:
        try:
            redis = getattr(request.app.state, "redis", None)
            if redis is not None:
                await redis.delete("admin:statistics:v2", "admin:statistics:v3")
        except Exception:
            pass
    return ok(saved, message=f"Cập nhật cấu hình '{key}' thành công")
