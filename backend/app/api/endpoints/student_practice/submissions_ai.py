"""Nộp bài Writing (chấm AI nền, UC-09) và Speaking (UC-10)."""
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel

from app.core.security import User, get_optional_user
from app.services.practice.practice_attempt_lifecycle import get_owned_attempt
from app.services.speaking.speaking_submission_service import submit_speaking
from app.services.writing.writing_attempt_service import submit_writing
from app.services.writing.writing_grading_service import grade_writing_task

router = APIRouter()


class WritingSubmissionRequest(BaseModel):
    task1_text: Optional[str] = None
    task2_text: Optional[str] = None
    essay_text: Optional[str] = None
    time_spent_sec: Optional[int] = None


class SpeakingSubmissionRequest(BaseModel):
    recordings: Optional[List[Dict[str, Any]]] = None  # [{question_id, audio_key|audio_url, duration_sec}]
    time_spent_sec: Optional[int] = None


def _owned(attempt_id: str, current_user: Optional[User], skill: str) -> dict:
    if not current_user:
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập để nộp bài")
    attempt = get_owned_attempt(attempt_id, current_user.id)          # chỉ chủ bài được nộp
    if not attempt or attempt["skill"] != skill:
        raise HTTPException(status_code=404, detail="Phiên làm bài không tồn tại")
    return attempt


@router.post("/attempts/{attempt_id}/submit-writing")
async def submit_writing_attempt(attempt_id: str, req: WritingSubmissionRequest, background_tasks: BackgroundTasks,
                                 current_user: Optional[User] = Depends(get_optional_user)):
    """Nộp Task 1 / Task 2 rồi chấm AI nền từng task."""
    attempt = _owned(attempt_id, current_user, "writing")
    sub = submit_writing(attempt, req.task1_text, req.task2_text, req.essay_text)
    for job in sub["jobs"]:
        background_tasks.add_task(grade_writing_task, None, sub["evaluation_id"], job["run_id"],
                                  job["essay_id"], job["task_no"])
    return {
        "meta": {"code": 200, "message": "Bài thi viết đã được nộp và chuyển sang pipeline AI chấm điểm"},
        "data": {
            "attempt_id": attempt_id,
            "essay_id": sub["jobs"][-1]["essay_id"],
            "essay_ids": {f"task{j['task_no']}": j["essay_id"] for j in sub["jobs"]},
            "word_count": sum(j["word_count"] for j in sub["jobs"]),
            "status": "grading",
            "submitted_at": sub["submitted_at"],
        },
    }


@router.post("/attempts/{attempt_id}/submit-speaking")
async def submit_speaking_attempt(attempt_id: str, req: SpeakingSubmissionRequest,
                                  current_user: Optional[User] = Depends(get_optional_user)):
    """Nộp bài Speaking. Chưa có pipeline chấm Speaking nên không trả band."""
    attempt = _owned(attempt_id, current_user, "speaking")
    data = submit_speaking(attempt, req.recordings)
    return {"meta": {"code": 200, "message": "Bài thi nói đã được ghi nhận"}, "data": data}
