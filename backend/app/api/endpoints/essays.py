"""Kết quả chi tiết của một bài Writing trong attempt."""
from fastapi import APIRouter, Depends, HTTPException

from app.core.security import User, get_current_user
from app.services.writing.writing_result_views import build_essay_result

router = APIRouter()


@router.get("/{essay_id}/results")
async def get_evaluation_results(essay_id: str, current_user: User = Depends(get_current_user)):
    data = build_essay_result(essay_id, current_user.id, current_user.role == "admin")
    if data is None:
        raise HTTPException(status_code=404, detail="Essay not found")
    return {"meta": {"code": 200, "message": "Success"}, "data": data}
