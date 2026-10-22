from fastapi import APIRouter, Depends, HTTPException, status
from app.schemas.user import (
    UserUpdate, 
    UserProfileResponse, 
    UserProgressResponse, 
    LearnerGoalUpdate, 
    LearnerGoalResponse
)
from app.core.security import get_current_active_user, User
from app.db.supabase import supabase
from datetime import datetime

router = APIRouter()

@router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(current_user: User = Depends(get_current_active_user)):
    """
    Lấy thông tin hồ sơ cá nhân của người dùng hiện tại (Learner, Expert hoặc Admin).
    """
    user_res = supabase.table("users").select("*").eq("id", current_user.id).execute()
    if not user_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    return UserProfileResponse(**user_res.data[0])

@router.put("/me")
async def update_my_profile(
    profile: UserUpdate, 
    current_user: User = Depends(get_current_active_user)
):
    """
    Cập nhật thông tin hồ sơ: họ tên, ảnh đại diện, và xác nhận xử lý giọng nói (voice_consent).
    Tuân thủ Nghị định 13/2023/NĐ-CP (NFR-07).
    """
    update_data = {}
    if profile.full_name is not None:
        update_data["full_name"] = profile.full_name
    if profile.avatar_url is not None:
        update_data["avatar_url"] = profile.avatar_url
    if profile.voice_consent is True:
        update_data["voice_consent_at"] = datetime.utcnow().isoformat()
    elif profile.voice_consent is False:
        update_data["voice_consent_at"] = None

    if profile.voice_consent is not None:
        try:
            supabase.table("audit_logs").insert({
                "actor_id": current_user.id,
                "action": "consent_grant" if profile.voice_consent else "consent_revoke",
                "entity": "users",
                "entity_id": current_user.id,
                "after": {"voice_consent": profile.voice_consent}
            }).execute()
        except Exception as log_err:
            print(f"Warning audit log voice_consent: {log_err}")

    if not update_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    res = supabase.table("users").update(update_data).eq("id", current_user.id).execute()
    if not res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    return {
        "meta": {"code": 200, "message": "Profile updated successfully"},
        "data": res.data[0]
    }

@router.post("/me/activate")
async def activate_my_account(current_user: User = Depends(get_current_active_user)):
    """
    Kích hoạt tài khoản khi người dùng hoàn tất đặt mật khẩu hoặc liên kết OAuth (UC-19).
    """
    supabase.table("users").update({"is_activated": True}).eq("id", current_user.id).execute()
    return {"meta": {"code": 200, "message": "Tài khoản đã được kích hoạt thành công"}}

@router.get("/me/goals")
async def get_my_goals(current_user: User = Depends(get_current_active_user)):
    """
    Lấy mục tiêu IELTS và ngày thi dự kiến của học viên (UC-05, FR-06).
    """
    goals_res = supabase.table("learner_goals").select("*").eq("user_id", current_user.id).execute()
    if not goals_res.data:
        return {
            "meta": {"code": 200, "message": "No goals set yet"},
            "data": None
        }
    return {
        "meta": {"code": 200, "message": "Success"},
        "data": LearnerGoalResponse(**goals_res.data[0]).dict()
    }

@router.put("/me/goals")
async def update_my_goals(
    goals: LearnerGoalUpdate, 
    current_user: User = Depends(get_current_active_user)
):
    """
    Thiết lập hoặc cập nhật band mục tiêu tổng, từng kỹ năng (0.0-9.0, bước 0.5) 
    và ngày thi dự kiến (UC-05, BR-01, FR-06).
    """
    goal_dict = goals.dict(exclude_unset=True)
    if "test_date" in goal_dict and goal_dict["test_date"]:
        goal_dict["test_date"] = goal_dict["test_date"].isoformat()
        
    goal_dict["user_id"] = current_user.id
    goal_dict["updated_at"] = datetime.utcnow().isoformat()

    res = supabase.table("learner_goals").upsert(goal_dict).execute()
    if not res.data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to save goals")

    return {
        "meta": {"code": 200, "message": "Goals updated successfully"},
        "data": res.data[0]
    }

@router.get("/me/progress")
async def get_my_progress(current_user: User = Depends(get_current_active_user)):
    """
    Lấy thống kê tiến độ luyện thi của học viên (bài đã nộp, điểm trung bình các kỹ năng).
    """
    # 1. Fetch all essays to get total_essays and last_submission_at
    all_essays_res = supabase.table("essays").select("submitted_at, status").eq("user_id", current_user.id).order("submitted_at", desc=True).execute()
    
    total_essays = len(all_essays_res.data) if all_essays_res.data else 0
    last_submission_at = all_essays_res.data[0]["submitted_at"] if total_essays > 0 else None
    
    # 2. Fetch completed essays with evaluation results to calculate scores
    completed_essays_res = supabase.table("essays").select("id, evaluation_results(*)").eq("user_id", current_user.id).eq("status", "completed").execute()
    completed_data = completed_essays_res.data or []
    
    sum_overall = 0.0
    sum_tr = 0.0
    sum_cc = 0.0
    sum_lr = 0.0
    sum_gra = 0.0
    best_overall = 0.0
    valid_evals = 0
    
    for essay in completed_data:
        evals = essay.get("evaluation_results")
        if not evals:
            continue
            
        eval_res = evals[0] if isinstance(evals, list) and len(evals) > 0 else (evals if isinstance(evals, dict) else None)
        if not eval_res:
            continue
            
        overall = eval_res.get("overall_band") or 0.0
        sum_overall += overall
        sum_tr += eval_res.get("task_response_score") or 0.0
        sum_cc += eval_res.get("coherence_cohesion_score") or 0.0
        sum_lr += eval_res.get("lexical_resource_score") or 0.0
        sum_gra += eval_res.get("grammar_accuracy_score") or 0.0
        
        if overall > best_overall:
            best_overall = overall
            
        valid_evals += 1
        
    avg_scores = {
        "total_essays": total_essays,
        "avg_overall_band": round(sum_overall / valid_evals, 2) if valid_evals > 0 else 0.0,
        "avg_tr_score": round(sum_tr / valid_evals, 2) if valid_evals > 0 else 0.0,
        "avg_cc_score": round(sum_cc / valid_evals, 2) if valid_evals > 0 else 0.0,
        "avg_lr_score": round(sum_lr / valid_evals, 2) if valid_evals > 0 else 0.0,
        "avg_gra_score": round(sum_gra / valid_evals, 2) if valid_evals > 0 else 0.0,
        "best_overall_band": best_overall,
        "last_submission_at": last_submission_at
    }

    return {
        "meta": {"code": 200, "message": "Success"},
        "data": UserProgressResponse(**avg_scores).dict()
    }
