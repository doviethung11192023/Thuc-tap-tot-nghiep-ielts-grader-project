from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.expert import (
    ExpertProfileResponse, 
    ExpertAvailabilityUpdate
)
from app.core.security import require_expert, User
from app.db.supabase import db

router = APIRouter()

@router.get("/me", response_model=ExpertProfileResponse)
async def get_expert_profile(current_user: User = Depends(require_expert)):
    """
    Lấy thông tin hồ sơ của Expert, trạng thái khả dụng nhận bài, 
    và số lượng bài đang được phân công (UC-14, FR-21).
    """
    user_res = db().table("profiles").select("id, email, full_name, avatar_key, created_at").eq("id", current_user.id).execute()
    if not user_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user_data = {**user_res.data[0], "avatar_url": user_res.data[0].get("avatar_key")}

    # Hồ sơ Expert được tạo cùng tài khoản (trigger handle_new_user / Admin tạo Expert)
    profile_res = db().table("expert_profiles").select("*").eq("user_id", current_user.id).execute()
    if not profile_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expert profile not found")
    expert_data = profile_res.data[0]

    # Số assignment đang mở (chưa kết thúc) của Expert này
    count_res = db().table("review_assignments").select("id", count="exact") \
        .eq("expert_id", current_user.id).is_("ended_at", "null").execute()
    active_count = count_res.count if getattr(count_res, "count", None) is not None else len(count_res.data or [])

    return ExpertProfileResponse(
        user_id=user_data["id"],
        email=user_data["email"],
        full_name=user_data.get("full_name"),
        avatar_url=user_data.get("avatar_url"),
        is_available=expert_data.get("is_available", False),
        max_active_reviews=expert_data.get("max_active_reviews", 5),
        bio=expert_data.get("bio"),
        active_reviews_count=active_count,
        created_at=user_data.get("created_at")
    )

@router.patch("/me/availability", response_model=ExpertProfileResponse)
async def update_expert_availability(
    update_data: ExpertAvailabilityUpdate,
    current_user: User = Depends(require_expert)
):
    """
    Cập nhật trạng thái khả dụng (is_available: true/false), giới hạn số bài 
    và tiểu sử chuyên môn của Expert (UC-14, FR-21).
    """
    fields_to_update = update_data.dict(exclude_unset=True)
    if not fields_to_update:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    res = db().table("expert_profiles").update(fields_to_update).eq("user_id", current_user.id).execute()
    if not res.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update expert profile")

    # Lấy lại hồ sơ đầy đủ để trả về
    return await get_expert_profile(current_user=current_user)
