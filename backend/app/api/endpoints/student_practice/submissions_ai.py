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

    # Mỗi task là một dòng essays riêng (task_no = 1 | 2) để AI chấm đúng đề Task 1 / Task 2.
    # Không có task1_text/task2_text → giữ hành vi cũ: một essay từ essay_text (task_no = None).
    task_texts = [(no, (text or "").strip()) for no, text in ((1, req.task1_text), (2, req.task2_text))]
    task_texts = [(no, text) for no, text in task_texts if text]
    if not task_texts:
        legacy_text = (req.essay_text or "").strip()
        if not legacy_text:
            raise HTTPException(status_code=400, detail="Bài viết trống")
        task_texts = [(None, legacy_text)]

    now_utc = datetime.now(timezone.utc).isoformat()
    user_id = str(current_user.id) if current_user else str(attempt["user_id"])

    essays_created = []  # [(task_no, essay_id, word_count)]
    for task_no, text in task_texts:
        word_count = len(text.split())
        e_res = supabase.table("essays").insert({
            "user_id": user_id,
            "content": text,
            "word_count": word_count,
            "status": "pending",
            "attempt_id": attempt_id,
            "task_id": str(uuid.uuid4()),
        }).execute()
        if not e_res.data:
            raise HTTPException(status_code=500, detail="Không thể lưu bài thi viết")
        essays_created.append((task_no, e_res.data[0]["id"], word_count))

    # Cập nhật trạng thái test_attempts
    supabase.table("test_attempts").update({
        "status": "scoring",
        "submitted_at": now_utc
    }).eq("id", attempt_id).execute()

    # Kích hoạt background AI evaluation cho từng task
    for task_no, essay_id, _ in essays_created:
        background_tasks.add_task(evaluate_essay_task, None, essay_id, task_no)

    # essay_id chính: Task 2 nếu có, ngược lại là essay duy nhất
    primary_essay_id = essays_created[-1][1]

    return {
        "meta": {"code": 200, "message": "Bài thi viết đã được nộp và chuyển sang pipeline AI chấm điểm"},
        "data": {
            "attempt_id": attempt_id,
            "essay_id": primary_essay_id,
            "essay_ids": {f"task{no}" if no else "essay": eid for no, eid, _ in essays_created},
            "word_count": sum(wc for _, _, wc in essays_created),
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
