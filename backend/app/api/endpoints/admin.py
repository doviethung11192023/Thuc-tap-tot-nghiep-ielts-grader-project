from fastapi import APIRouter, Depends, HTTPException
from app.schemas.admin import UserStatusUpdate
from app.core.security import require_admin, User
from app.db.supabase import supabase
from datetime import datetime
import uuid

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
    res = supabase.table("users").update({"is_active": status_update.is_active}).eq("id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    return {"meta": {"code": 200, "message": "User status updated successfully"}}

@router.get("/statistics")
async def get_statistics(current_user: User = Depends(require_admin)):
    users_count = supabase.table("users").select("*", count="exact").limit(1).execute()
    essays_count = supabase.table("essays").select("*", count="exact").limit(1).execute()
    
    return {
        "meta": {"code": 200},
        "data": {
            "total_users": users_count.count if hasattr(users_count, 'count') else 0,
            "total_essays": essays_count.count if hasattr(essays_count, 'count') else 0,
            "essays_today": 0,
            "ai_error_rate_percent": 0.0,
            "average_processing_time_sec": 0.0
        }
    }

@router.get("/evaluations/logs")
async def get_eval_logs(page: int = 1, limit: int = 10, current_user: User = Depends(require_admin)):
    offset = (page - 1) * limit
    res = supabase.table("evaluation_logs").select("*", count="exact").range(offset, offset + limit - 1).execute()
    return {
        "meta": {"code": 200, "message": "Success"},
        "data": {
            "items": res.data,
            "total": res.count if hasattr(res, 'count') else len(res.data)
        }
    }
