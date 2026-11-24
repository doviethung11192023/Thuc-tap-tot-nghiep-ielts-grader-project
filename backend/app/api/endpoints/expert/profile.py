"""Route hồ sơ Expert: thông tin cá nhân, hiệu suất và trạng thái khả dụng nhận bài (UC-14, FR-21)."""
from fastapi import APIRouter, Depends

from app.core.security import User, require_expert
from app.schemas.expert import ExpertAvailabilityUpdate, ExpertProfileResponse
from app.services.expert import expert_profile_service

router = APIRouter()


@router.get("/me", response_model=ExpertProfileResponse)
def get_expert_profile(current_user: User = Depends(require_expert)):
    """
    Lấy thông tin hồ sơ của Expert, trạng thái khả dụng nhận bài, 
    và số lượng bài đang được phân công (UC-14, FR-21).
    """
    return expert_profile_service.get_expert_profile(current_user.id)


@router.get("/me/performance")
def get_expert_performance_me(current_user: User = Depends(require_expert)):
    """Lấy 6 chỉ số hiệu suất 30 ngày, tiến độ lên hạng, cảnh báo vi phạm & lịch sử tháng."""
    return expert_profile_service.get_expert_performance(current_user.id)


@router.patch("/me/availability", response_model=ExpertProfileResponse)
def update_expert_availability(
    update_data: ExpertAvailabilityUpdate,
    current_user: User = Depends(require_expert),
):
    """
    Cập nhật trạng thái khả dụng (is_available: true/false), giới hạn số bài 
    và tiểu sử chuyên môn của Expert (UC-14, FR-21). Khóa bypass khi cooldown/suspended (B2).
    """
    return expert_profile_service.update_expert_availability(
        current_user.id, update_data.dict(exclude_unset=True)
    )
