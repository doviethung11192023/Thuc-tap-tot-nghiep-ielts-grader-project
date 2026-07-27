from fastapi import APIRouter, Depends, HTTPException, status, Request
from app.schemas.essay import EssayCreate, EvaluationResponse, EssayDetail
from app.core.security import get_current_user, User
from app.db.supabase import supabase
import uuid
from datetime import datetime

router = APIRouter()

@router.post("/evaluate", status_code=status.HTTP_202_ACCEPTED)
async def submit_essay(request: Request, essay: EssayCreate, current_user: User = Depends(get_current_user)):
    word_count = len(essay.content.split())
    
    # Auto-create mock user in DB if not exists (for testing with mock auth)
    user_res = supabase.table("users").select("id").eq("id", current_user.id).execute()
    if not user_res.data:
        try:
            supabase.table("users").insert({
                "id": current_user.id,
                "email": f"{current_user.id}@test.com",
                "full_name": "Test User",
                "role": current_user.role
            }).execute()
        except Exception as e:
            pass # Ignore if already inserted or UUID issue
            
    essay_data = {
        "user_id": current_user.id,
        "content": essay.content,
        "word_count": word_count,
        "status": "pending"
    }
    if essay.topic_id:
        essay_data["topic_id"] = essay.topic_id
        
    try:
        response = supabase.table("essays").insert(essay_data).execute()
        essay_id = response.data[0]["id"]
        
        # Enqueue background task
        job = await request.app.state.redis.enqueue_job("evaluate_essay_task", essay_id)
        if job:
            supabase.table("essays").update({"task_id": job.job_id}).eq("id", essay_id).execute()
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    return {
        "meta": {"code": 202, "message": "Essay submitted successfully and is being evaluated."},
        "data": {
            "essay_id": essay_id,
            "status": "pending",
            "task_id": job.job_id if 'job' in locals() and job else None,
            "word_count": word_count
        }
    }

@router.get("/{essay_id}/results", response_model=EvaluationResponse)
async def get_evaluation_results(essay_id: str, current_user: User = Depends(get_current_user)):
    essay_res = supabase.table("essays").select("*").eq("id", essay_id).execute()
    if not essay_res.data:
        raise HTTPException(status_code=404, detail="Essay not found")
        
    essay_data = essay_res.data[0]
    
    eval_res = supabase.table("evaluation_results").select("*").eq("essay_id", essay_id).execute()
    result_data = eval_res.data[0] if eval_res.data else None
    
    grammar_data = None
    if result_data:
        grammar_res = supabase.table("grammar_errors").select("*").eq("evaluation_id", result_data["id"]).execute()
        grammar_data = grammar_res.data
        
    return EvaluationResponse(
        essay=essay_data,
        result=result_data,
        grammar_errors=grammar_data,
        trace_info={"phoenix_trace_url": "http://phoenix.local"} if current_user.role == "admin" else None
    )

@router.get("")
async def list_essays(page: int = 1, limit: int = 10, status_filter: str = None, current_user: User = Depends(get_current_user)):
    query = supabase.table("essays").select("*", count="exact").eq("user_id", current_user.id)
    if status_filter:
        query = query.eq("status", status_filter)
        
    offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)
    res = query.execute()
    
    return {
        "meta": {"code": 200, "message": "Success"},
        "data": {
            "items": res.data,
            "total": res.count if hasattr(res, 'count') else len(res.data),
            "page": page
        }
    }
