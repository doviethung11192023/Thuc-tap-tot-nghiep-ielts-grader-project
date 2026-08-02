from fastapi import APIRouter, Depends, status, HTTPException, Request
from typing import Optional
from app.schemas.topic import TopicCreate, TopicUpdate, TopicResponse
from app.core.security import require_admin, get_current_user, User
from app.db.supabase import supabase
import uuid
import json

router = APIRouter()

@router.get("")
async def list_topics(request: Request, page: int = 1, limit: int = 10, task_type: str = None, difficulty: str = None, category: str = None, current_user: User = Depends(get_current_user)):
    redis = request.app.state.redis
    cache_key = f"topics:list:{page}:{limit}:{task_type}:{difficulty}:{category}"
    cached = await redis.get(cache_key)
    if cached:
        return json.loads(cached)

    query = supabase.table("topics").select("*", count="exact").eq("is_active", True)
    if task_type:
        query = query.eq("task_type", task_type)
    if difficulty:
        query = query.eq("difficulty", difficulty)
    if category:
        query = query.eq("category", category)
        
    offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)
    res = query.execute()
    
    result = {
        "meta": {"code": 200, "message": "Success"},
        "data": {
            "items": res.data,
            "total": res.count if hasattr(res, 'count') else len(res.data),
            "page": page,
            "limit": limit
        }
    }
    await redis.setex(cache_key, 300, json.dumps(result))
    return result

@router.post("", status_code=status.HTTP_201_CREATED)
async def create_topic(request: Request, topic: TopicCreate, current_user: User = Depends(require_admin)):
    # Auto-create mock user in DB if not exists
    user_res = supabase.table("users").select("id").eq("id", current_user.id).execute()
    if not user_res.data:
        try:
            supabase.table("users").insert({
                "id": current_user.id,
                "email": f"{current_user.id}@test.com",
                "full_name": "Admin User",
                "role": "admin"
            }).execute()
        except Exception:
            pass

    topic_data = topic.model_dump()
    topic_data["created_by"] = current_user.id
    
    try:
        res = supabase.table("topics").insert(topic_data).execute()
        # Invalidate cache
        keys = await request.app.state.redis.keys("topics:list:*")
        if keys:
            await request.app.state.redis.delete(*keys)

        return {
            "meta": {"code": 201, "message": "Topic created successfully"},
            "data": {"topic_id": res.data[0]["id"]}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{topic_id}")
async def update_topic(request: Request, topic_id: str, topic: TopicUpdate, current_user: User = Depends(require_admin)):
    update_data = {k: v for k, v in topic.model_dump().items() if v is not None}
    if not update_data:
        return {"meta": {"code": 200, "message": "Nothing to update"}}
    
    res = supabase.table("topics").update(update_data).eq("id", topic_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Topic not found")
        
    # Invalidate cache
    keys = await request.app.state.redis.keys("topics:list:*")
    if keys:
        await request.app.state.redis.delete(*keys)

    return {"meta": {"code": 200, "message": "Topic updated successfully"}}

@router.delete("/{topic_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_topic(request: Request, topic_id: str, current_user: User = Depends(require_admin)):
    supabase.table("topics").update({"is_active": False}).eq("id", topic_id).execute()
    
    # Invalidate cache
    keys = await request.app.state.redis.keys("topics:list:*")
    if keys:
        await request.app.state.redis.delete(*keys)
    return
