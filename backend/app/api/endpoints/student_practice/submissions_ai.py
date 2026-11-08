"""Nộp bài Writing (chấm AI nền, UC-09) và Speaking (UC-10)."""
from typing import Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from app.core.security import User, get_optional_user
from app.services.practice.practice_attempt_lifecycle import require_owned_attempt
from app.services.grading.grading_queue import enqueue_grading_run
from app.services.speaking.speaking_submission_service import submit_speaking
from app.services.writing.writing_attempt_service import submit_writing

router = APIRouter()


class WritingSubmissionRequest(BaseModel):
    task1_text: Optional[str] = None
    task2_text: Optional[str] = None
    essay_text: Optional[str] = None
    time_spent_sec: Optional[int] = None


@router.post("/attempts/{attempt_id}/submit-writing")
async def submit_writing_attempt(attempt_id: str, req: WritingSubmissionRequest, request: Request,
                                 current_user: Optional[User] = Depends(get_optional_user)):
    """Nộp Task 1 / Task 2; bài đã lưu và job đã tạo trong DB, worker chấm từng task sau."""
    attempt = require_owned_attempt(attempt_id, current_user, "writing")
    sub = submit_writing(attempt, req.task1_text, req.task2_text, req.essay_text)
    for run_id in sub["run_ids"]:
        await enqueue_grading_run(request.app.state.redis, run_id, "writing")
    essays = sub["essays"]           # rỗng khi bài Mock nộp muộn mà chưa lưu chữ nào (abandoned)
    return {
        "meta": {"code": 200, "message": "Bài thi viết đã được nộp và chuyển sang pipeline AI chấm điểm"},
        "data": {
            "attempt_id": attempt_id,
            "essay_id": essays[-1]["essay_id"] if essays else None,
            "essay_ids": {f"task{e['task_no']}": e["essay_id"] for e in essays},
            "word_count": sum(e["word_count"] for e in essays),
            "status": sub["status"],
            "submitted_at": sub["submitted_at"],
        },
    }


@router.post("/attempts/{attempt_id}/submit-speaking")
async def submit_speaking_attempt(attempt_id: str, request: Request,
                                  current_user: Optional[User] = Depends(get_optional_user)):
    """Nộp bài Speaking: chỉ các câu đã confirm được chấm; worker chấm sau."""
    attempt = require_owned_attempt(attempt_id, current_user, "speaking")
    sub = submit_speaking(attempt)
    job = sub.pop("job")
    if job:
        await enqueue_grading_run(request.app.state.redis, job["runs"][0]["run_id"], "speaking")
    return {"meta": {"code": 200, "message": "Bài thi nói đã được ghi nhận"}, "data": sub}
