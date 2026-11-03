"""Hồ sơ, mục tiêu và tiến độ của người dùng hiện tại (UC-04, UC-05, FR-06/07)."""
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import User, get_current_active_user
from app.schemas.user import (
    LearnerGoalResponse,
    LearnerGoalUpdate,
    UserProfileResponse,
    UserProgressResponse,
    UserUpdate,
)
from app.services.practice import learner_profile_store as profiles

router = APIRouter()


@router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(current_user: User = Depends(get_current_active_user)):
    """Hồ sơ cá nhân của người dùng hiện tại (Learner, Expert hoặc Admin)."""
    profile = profiles.get_profile(current_user.id)
    if not profile:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserProfileResponse(**profile)


@router.put("/me")
async def update_my_profile(profile: UserUpdate, current_user: User = Depends(get_current_active_user)):
    """Cập nhật họ tên, ảnh đại diện, đồng ý ghi âm (FR-38, NFR-07 — Nghị định 13/2023/NĐ-CP)."""
    data = profiles.update_profile(current_user.id, profile.full_name, profile.avatar_url, profile.voice_consent)
    return {"meta": {"code": 200, "message": "Profile updated successfully"}, "data": data}


@router.post("/me/activate")
async def activate_my_account(current_user: User = Depends(get_current_active_user)):
    """Giữ cho frontend cũ: tài khoản được kích hoạt bởi Supabase Auth (xác minh email / link mời)."""
    return {"meta": {"code": 200, "message": "Tài khoản đã được kích hoạt thành công"}}


@router.get("/me/goals")
async def get_my_goals(current_user: User = Depends(get_current_active_user)):
    """Mục tiêu IELTS và ngày thi dự kiến của học viên (UC-05, FR-06)."""
    goals = profiles.get_goals(current_user.id)
    if goals is None:
        return {"meta": {"code": 200, "message": "No goals set yet"}, "data": None}
    return {"meta": {"code": 200, "message": "Success"}, "data": LearnerGoalResponse(**goals).dict()}


@router.put("/me/goals")
async def update_my_goals(goals: LearnerGoalUpdate, current_user: User = Depends(get_current_active_user)):
    """Band mục tiêu tổng, từng kỹ năng (0–9, bước 0.5 — BR-01) và ngày thi (UC-05)."""
    goal_dict = goals.dict(exclude_unset=True)
    if goal_dict.get("test_date"):
        goal_dict["test_date"] = goal_dict["test_date"].isoformat()
    data = profiles.save_goals(current_user.id, goal_dict)
    return {"meta": {"code": 200, "message": "Goals updated successfully"}, "data": data}


@router.get("/me/progress")
async def get_my_progress(current_user: User = Depends(get_current_active_user)):
    """Thống kê Writing: số bài đã nộp, band trung bình / cao nhất theo kết quả chính thức."""
    data = UserProgressResponse(**profiles.writing_progress(current_user.id)).dict()
    return {"meta": {"code": 200, "message": "Success"}, "data": data}
