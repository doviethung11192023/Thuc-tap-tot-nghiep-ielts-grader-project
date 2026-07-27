from fastapi import APIRouter, Depends, HTTPException
from app.schemas.user import UserUpdate, UserProfileResponse, UserProgressResponse
from app.core.security import get_current_user, User
from app.db.supabase import supabase
from datetime import datetime

router = APIRouter()

@router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    user_res = supabase.table("users").select("*").eq("id", current_user.id).execute()
    if not user_res.data:
        raise HTTPException(status_code=404, detail="User not found")
        
    return UserProfileResponse(**user_res.data[0])

@router.put("/me")
async def update_my_profile(profile: UserUpdate, current_user: User = Depends(get_current_user)):
    res = supabase.table("users").update(profile.dict(exclude_unset=True)).eq("id", current_user.id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {
        "meta": {"code": 200, "message": "Profile updated successfully"},
        "data": res.data[0]
    }

@router.get("/me/progress", response_model=UserProgressResponse)
async def get_my_progress(current_user: User = Depends(get_current_user)):
    progress_res = supabase.table("user_progress").select("*").eq("user_id", current_user.id).execute()
    if not progress_res.data:
        # Return empty progress if not found
        return UserProgressResponse(
            total_essays=0,
            avg_overall_band=0.0,
            avg_tr_score=0.0,
            avg_cc_score=0.0,
            avg_lr_score=0.0,
            avg_gra_score=0.0,
            best_overall_band=0.0,
            last_submission_at=None
        )
    return UserProgressResponse(**progress_res.data[0])
