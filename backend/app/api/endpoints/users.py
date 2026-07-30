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

@router.get("/me/progress")
async def get_my_progress(current_user: User = Depends(get_current_user)):
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
            
        # Supabase Python client can return dict (1:1) or list (1:N)
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
        
    if valid_evals > 0:
        data = UserProgressResponse(
            total_essays=total_essays,
            avg_overall_band=round(sum_overall / valid_evals, 2),
            avg_tr_score=round(sum_tr / valid_evals, 2),
            avg_cc_score=round(sum_cc / valid_evals, 2),
            avg_lr_score=round(sum_lr / valid_evals, 2),
            avg_gra_score=round(sum_gra / valid_evals, 2),
            best_overall_band=best_overall,
            last_submission_at=last_submission_at
        ).dict()
    else:
        data = UserProgressResponse(
            total_essays=total_essays,
            avg_overall_band=0.0,
            avg_tr_score=0.0,
            avg_cc_score=0.0,
            avg_lr_score=0.0,
            avg_gra_score=0.0,
            best_overall_band=0.0,
            last_submission_at=last_submission_at
        ).dict()

    return {
        "meta": {"code": 200, "message": "Success"},
        "data": data
    }
