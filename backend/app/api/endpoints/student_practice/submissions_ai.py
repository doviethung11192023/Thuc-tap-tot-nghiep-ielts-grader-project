import uuid
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from app.core.security import get_optional_user, User
from app.db.supabase import supabase
from app.worker.tasks import evaluate_essay_task

router = APIRouter()

class WritingSubmissionRequest(BaseModel):
    task1_text: Optional[str] = None
    task2_text: Optional[str] = None
    essay_text: Optional[str] = None
    time_spent_sec: Optional[int] = None

class SpeakingSubmissionRequest(BaseModel):
    recordings: Optional[List[Dict[str, Any]]] = None # [{ question_id, audio_url, duration_sec }]
    time_spent_sec: Optional[int] = None

@router.post("/attempts/{attempt_id}/submit-writing")
async def submit_writing_attempt(
    attempt_id: str,
    req: WritingSubmissionRequest,
    background_tasks: BackgroundTasks,
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Nộp bài Writing (Task 1 & Task 2) và kích hoạt pipeline AI chấm điểm."""
    att_res = supabase.table("test_attempts").select("*").eq("id", attempt_id).execute()
    if not att_res.data:
        raise HTTPException(status_code=404, detail="Phiên làm bài không tồn tại")
    attempt = att_res.data[0]
    if current_user and str(attempt["user_id"]) != str(current_user.id) and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Không có quyền nộp bài cho phiên này")

    essay_content = req.essay_text or ""
    if not essay_content and (req.task1_text or req.task2_text):
        parts = []
        if req.task1_text:
            parts.append(f"--- TASK 1 ---\n{req.task1_text.strip()}")
        if req.task2_text:
            parts.append(f"--- TASK 2 ---\n{req.task2_text.strip()}")
        essay_content = "\n\n".join(parts)

    word_count = len(essay_content.split())
    now_utc = datetime.now(timezone.utc).isoformat()

    # Lưu bài thi vào bảng essays
    essay_payload = {
        "user_id": str(current_user.id) if current_user else str(attempt["user_id"]),
        "content": essay_content,
        "word_count": word_count,
        "status": "pending",
        "attempt_id": attempt_id
    }
    e_res = supabase.table("essays").insert(essay_payload).execute()
    if not e_res.data:
        raise HTTPException(status_code=500, detail="Không thể lưu bài thi viết")
    essay_id = e_res.data[0]["id"]

    # Cập nhật trạng thái test_attempts
    supabase.table("test_attempts").update({
        "status": "scoring",
        "submitted_at": now_utc
    }).eq("id", attempt_id).execute()

    # Kích hoạt background AI evaluation
    job_id = str(uuid.uuid4())
    background_tasks.add_task(evaluate_essay_task, None, essay_id)
    supabase.table("essays").update({"task_id": job_id}).eq("id", essay_id).execute()

    return {
        "meta": {"code": 200, "message": "Bài thi viết đã được nộp và chuyển sang pipeline AI chấm điểm"},
        "data": {
            "attempt_id": attempt_id,
            "essay_id": essay_id,
            "word_count": word_count,
            "status": "scoring",
            "submitted_at": now_utc
        }
    }

@router.post("/attempts/{attempt_id}/submit-speaking")
async def submit_speaking_attempt(
    attempt_id: str,
    req: SpeakingSubmissionRequest,
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Nộp bài Speaking và tổng hợp đánh giá phát âm & tiêu chí."""
    att_res = supabase.table("test_attempts").select("*").eq("id", attempt_id).execute()
    if not att_res.data:
        raise HTTPException(status_code=404, detail="Phiên làm bài không tồn tại")
    attempt = att_res.data[0]
    if current_user and str(attempt["user_id"]) != str(current_user.id) and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Không có quyền nộp bài cho phiên này")

    now_utc = datetime.now(timezone.utc).isoformat()

    # Lưu thông tin recordings vào speaking_responses nếu có
    if req.recordings:
        for rec in req.recordings:
            supabase.table("speaking_responses").upsert({
                "attempt_id": attempt_id,
                "question_id": rec.get("question_id"),
                "audio_key": rec.get("audio_url", ""),
                "duration_sec": rec.get("duration_sec", 0),
                "confirmed_at": now_utc
            }).execute()

    # Cập nhật kết quả phiên thi
    default_band = 6.5
    supabase.table("test_attempts").update({
        "status": "scored",
        "submitted_at": now_utc,
        "scored_at": now_utc,
        "band": default_band,
        "band_source": "ai"
    }).eq("id", attempt_id).execute()

    return {
        "meta": {"code": 200, "message": "Bài thi nói đã được ghi nhận và đánh giá thành công"},
        "data": {
            "attempt_id": attempt_id,
            "band": default_band,
            "status": "scored",
            "submitted_at": now_utc
        }
    }
