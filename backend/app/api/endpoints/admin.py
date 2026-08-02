from fastapi import APIRouter, Depends, HTTPException, Request
from app.schemas.admin import UserStatusUpdate
from app.core.security import require_admin, User
from app.db.supabase import supabase
from datetime import datetime
import uuid
import json

router = APIRouter()

@router.get("/users")
async def list_users(page: int = 1, limit: int = 10, current_user: User = Depends(require_admin)):
    offset = (page - 1) * limit
    res = supabase.table("users").select("*", count="exact").range(offset, offset + limit - 1).execute()
    return {
        "meta": {"code": 200},
        "data": {
            "items": res.data,
            "total": res.count if hasattr(res, 'count') else len(res.data)
        }
    }

@router.put("/users/{user_id}/status")
async def update_user_status(user_id: str, status_update: UserStatusUpdate, current_user: User = Depends(require_admin)):
    if user_id == str(current_user.id):
        raise HTTPException(status_code=400, detail="Admins cannot lock their own account")
        
    res = supabase.table("users").update({"is_active": status_update.is_active}).eq("id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    return {"meta": {"code": 200, "message": "User status updated successfully"}}

@router.get("/statistics")
async def get_statistics(request: Request, current_user: User = Depends(require_admin)):
    redis = request.app.state.redis
    cache_key = "admin:statistics"
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)

    users_count = supabase.table("users").select("*", count="exact").limit(1).execute()
    essays_count = supabase.table("essays").select("*", count="exact").limit(1).execute()
    
    # Lấy số bài đã nộp hôm nay
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_essays_count = supabase.table("essays").select("*", count="exact").gte("submitted_at", today_start).limit(1).execute()
    
    # Tính AI Error Rate
    logs = supabase.table("evaluation_logs").select("status").execute()
    total_logs = len(logs.data)
    failed_logs = sum(1 for log in logs.data if log.get("status") == "failed")
    error_rate = (failed_logs / total_logs * 100) if total_logs > 0 else 0.0
    
    # Xu hướng 7 ngày qua
    import datetime as dt
    trend_data = []
    today = dt.datetime.utcnow().date()
    for i in range(6, -1, -1):
        target_date = today - dt.timedelta(days=i)
        start_of_day = dt.datetime.combine(target_date, dt.time.min).isoformat()
        end_of_day = dt.datetime.combine(target_date, dt.time.max).isoformat()
        day_count = supabase.table("essays").select("*", count="exact").gte("submitted_at", start_of_day).lte("submitted_at", end_of_day).limit(1).execute()
        trend_data.append({
            "date": target_date.strftime("%d/%m"),
            "count": day_count.count if hasattr(day_count, 'count') and day_count.count is not None else 0
        })
    
    result = {
        "meta": {"code": 200},
        "data": {
            "total_users": users_count.count if hasattr(users_count, 'count') else 0,
            "total_essays": essays_count.count if hasattr(essays_count, 'count') else 0,
            "essays_today": today_essays_count.count if hasattr(today_essays_count, 'count') else 0,
            "ai_error_rate_percent": round(error_rate, 2),
            "average_processing_time_sec": 5.5,  # Hardcoded tạm thời do DB chưa lưu processing_time
            "submissions_trend": trend_data
        }
    }
    
    await redis.setex(cache_key, 300, json.dumps(result))
    return result

@router.get("/evaluations/logs")
async def get_eval_logs(page: int = 1, limit: int = 10, current_user: User = Depends(require_admin)):
    offset = (page - 1) * limit
    res = supabase.table("evaluation_logs").select("*, essay:essays(id, user:users(email), topic:topics(title))", count="exact").range(offset, offset + limit - 1).order('created_at', desc=True).execute()
    return {
        "meta": {"code": 200, "message": "Success"},
        "data": {
            "items": res.data,
            "total": res.count if hasattr(res, 'count') else len(res.data)
        }
    }
