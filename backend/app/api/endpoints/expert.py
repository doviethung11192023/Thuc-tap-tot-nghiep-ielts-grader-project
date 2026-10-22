from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.expert import (
    ExpertProfileResponse, 
    ExpertAvailabilityUpdate
)
from app.core.security import require_expert, User
from app.db.supabase import supabase

router = APIRouter()

@router.get("/me", response_model=ExpertProfileResponse)
async def get_expert_profile(current_user: User = Depends(require_expert)):
    """
    Lấy thông tin hồ sơ của Expert, trạng thái khả dụng nhận bài, 
    và số lượng bài đang được phân công (UC-14, FR-21).
    """
    # 1. Lấy thông tin user
    user_res = supabase.table("users").select("id, email, full_name, avatar_url, created_at").eq("id", current_user.id).execute()
    if not user_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user_data = user_res.data[0]

    # 2. Lấy thông tin expert_profiles
    profile_res = supabase.table("expert_profiles").select("*").eq("user_id", current_user.id).execute()
    if not profile_res.data:
        # Nếu chưa có bản ghi (ví dụ tài khoản admin mới set sang expert), tự động khởi tạo
        new_profile = {
            "user_id": current_user.id,
            "is_available": False,
            "max_active_reviews": 5,
            "bio": None
        }
        create_res = supabase.table("expert_profiles").insert(new_profile).execute()
        expert_data = create_res.data[0] if create_res.data else new_profile
    else:
        expert_data = profile_res.data[0]

    # 3. Đếm số lượng bài đang được gán cho Expert này ('assigned' hoặc 'in_review')
    count_res = supabase.table("review_requests")\
        .select("id", count="exact")\
        .eq("expert_id", current_user.id)\
        .in_("status", ["assigned", "in_review"])\
        .execute()
    
    active_count = count_res.count if hasattr(count_res, 'count') and count_res.count is not None else len(count_res.data or [])

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

    # Upsert/Update vào expert_profiles
    fields_to_update["user_id"] = current_user.id
    res = supabase.table("expert_profiles").upsert(fields_to_update).execute()
    if not res.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update expert profile")

    # Lấy lại hồ sơ đầy đủ để trả về
    return await get_expert_profile(current_user=current_user)
