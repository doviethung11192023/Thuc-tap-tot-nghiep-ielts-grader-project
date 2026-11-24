"""Nộp bài Writing (chấm AI nền, UC-09) và Speaking (UC-10)."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from app.api.responses import ok
from app.core.security import User, get_optional_user
from app.services.practice.practice_attempt_lifecycle import get_owned_attempt, require_owned_attempt
from app.services.expert.mock_expert_review_request import request_mock_expert_review
from app.services.grading.attempt_retry_service import create_retry_job
from app.services.grading.grading_queue import enqueue_grading_run
from app.services.speaking.speaking_submission_service import submit_speaking
from app.services.writing.writing_attempt_service import submit_writing

router = APIRouter()


class WritingSubmissionRequest(BaseModel):
    task1_text: Optional[str] = None
    task2_text: Optional[str] = None
    essay_text: Optional[str] = None
    time_spent_sec: Optional[int] = None
    parts: Optional[str] = None       # Practice: task đã chọn ("1", "2", "1,2"); trống = cả bài, task bỏ trống = band 0


@router.post("/attempts/{attempt_id}/submit-writing")
async def submit_writing_attempt(attempt_id: str, req: WritingSubmissionRequest, request: Request,
                                 current_user: Optional[User] = Depends(get_optional_user)):
    """Nộp Task 1 / Task 2; bài đã lưu và job đã tạo trong DB, worker chấm từng task sau."""
    attempt = require_owned_attempt(attempt_id, current_user, "writing")
    sub = submit_writing(attempt, req.task1_text, req.task2_text, req.essay_text, parts=req.parts)
    for run_id in sub["run_ids"]:
        await enqueue_grading_run(request.app.state.redis, run_id, "writing")
    essays = sub["essays"]           # rỗng khi bài Mock nộp muộn mà chưa lưu chữ nào (abandoned)

    has_expert_review = await request_mock_expert_review(attempt, sub, getattr(request.app.state, "redis", None))

    return ok({
            "attempt_id": attempt_id,
            "essay_id": essays[-1]["essay_id"] if essays else None,
            "essay_ids": {f"task{e['task_no']}": e["essay_id"] for e in essays},
            "word_count": sum(e["word_count"] for e in essays),
            "status": sub["status"],
            "has_expert_review": has_expert_review,
            "submitted_at": sub["submitted_at"],
        }, message="Bài thi viết đã được nộp và chuyển sang pipeline AI chấm điểm")


@router.post("/attempts/{attempt_id}/retry-ai-grading")
async def retry_ai_grading(attempt_id: str, request: Request,
                           current_user: Optional[User] = Depends(get_optional_user)):
    """Chạy lại chấm điểm AI cho bài thi Writing hoặc Speaking nếu trước đó gặp lỗi hoặc bị kẹt (Chủ bài hoặc Admin)."""
    is_admin = bool(current_user and current_user.role == "admin")
    attempt = get_owned_attempt(attempt_id, current_user.id if current_user else None, is_admin)
    if not attempt or attempt["skill"] not in ("writing", "speaking"):
        raise HTTPException(status_code=404, detail="Phiên làm bài không tồn tại")

    skill = attempt["skill"]
    job = await run_in_threadpool(create_retry_job, attempt_id, skill)

    redis = getattr(request.app.state, "redis", None)
    for run in job.get("runs") or []:
        await enqueue_grading_run(redis, run["run_id"], skill)

    return ok({
            "attempt_id": attempt_id,
            "skill": skill,
            "evaluation_id": job.get("evaluation_id"),
            "runs": job.get("runs"),
        }, message="Đã bắt đầu chấm lại bài thi bằng AI")


@router.post("/attempts/{attempt_id}/submit-speaking")
async def submit_speaking_attempt(attempt_id: str, request: Request,
                                  current_user: Optional[User] = Depends(get_optional_user)):
    """Nộp bài Speaking: chỉ các câu đã confirm được chấm; worker chấm sau."""
    attempt = require_owned_attempt(attempt_id, current_user, "speaking")
    sub = submit_speaking(attempt)
    job = sub.pop("job")
    if job:
        await enqueue_grading_run(request.app.state.redis, job["runs"][0]["run_id"], "speaking")

    sub["has_expert_review"] = await request_mock_expert_review(attempt, sub, getattr(request.app.state, "redis", None))
    return ok(sub, message="Bài thi nói đã được ghi nhận")
