"""Nộp bài Writing (chấm AI nền, UC-09) và Speaking (UC-10)."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.core.security import User, get_optional_user
from app.db.supabase import db
from app.services.practice.practice_attempt_lifecycle import get_owned_attempt, require_owned_attempt
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

    # Mock: tạo yêu cầu Expert nếu đã giữ chỗ / còn quota (BR-15, UC-32); bài bỏ trống không gửi Expert
    has_expert_review = False
    if attempt.get("mode") == "mock" and current_user and essays:
        try:
            from app.services.expert.quota_manager import confirm_mock_submission_slot
            from app.services.expert.dispatcher import auto_dispatch_pending_requests
            has_expert_review = await confirm_mock_submission_slot(
                current_user.id, attempt_id, "writing", getattr(request.app.state, "redis", None)
            )
            if has_expert_review:
                await auto_dispatch_pending_requests()
        except Exception as e:
            print(f"[MockExpertReview] Warning: {e}")

    return {
        "meta": {"code": 200, "message": "Bài thi viết đã được nộp và chuyển sang pipeline AI chấm điểm"},
        "data": {
            "attempt_id": attempt_id,
            "essay_id": essays[-1]["essay_id"] if essays else None,
            "essay_ids": {f"task{e['task_no']}": e["essay_id"] for e in essays},
            "word_count": sum(e["word_count"] for e in essays),
            "status": sub["status"],
            "has_expert_review": has_expert_review,
            "submitted_at": sub["submitted_at"],
        },
    }


@router.post("/attempts/{attempt_id}/retry-ai-grading")
async def retry_ai_grading(attempt_id: str, request: Request,
                           current_user: Optional[User] = Depends(get_optional_user)):
    """Chạy lại chấm điểm AI cho bài thi Writing hoặc Speaking nếu trước đó gặp lỗi hoặc bị kẹt (Chủ bài hoặc Admin)."""
    is_admin = bool(current_user and current_user.role == "admin")
    attempt = get_owned_attempt(attempt_id, current_user.id if current_user else None, is_admin)
    if not attempt or attempt["skill"] not in ("writing", "speaking"):
        raise HTTPException(status_code=404, detail="Phiên làm bài không tồn tại")

    skill = attempt["skill"]
    task_nos = None
    if skill == "writing":
        essays = db().table("essays").select("id, word_count, content, writing_tasks(task_type)") \
            .eq("attempt_id", attempt_id).execute().data or []
        non_empty = [e for e in essays if (e.get("word_count") or 0) > 0 or (e.get("content") or "").strip()]
        if not non_empty:
            raise HTTPException(status_code=400, detail="Bài viết trống, không thể chấm lại")
        task_nos = sorted({1 if (e.get("writing_tasks") or {}).get("task_type") == "task1" else 2 for e in non_empty})
    else:
        confirmed = db().table("speaking_responses").select("id") \
            .eq("attempt_id", attempt_id).not_.is_("confirmed_at", "null").limit(1).execute().data or []
        if not confirmed:
            raise HTTPException(status_code=400, detail="Bài nói chưa có câu trả lời nào được lưu, không thể chấm lại")

    res = db().rpc("create_ai_grading_job", {
        "p_attempt_id": attempt_id,
        "p_skill": skill,
        "p_task_nos": task_nos,
    }).execute()

    job = res.data or {}
    db().table("attempts").update({"status": "grading"}).eq("id", attempt_id).execute()

    redis = getattr(request.app.state, "redis", None)
    for run in job.get("runs") or []:
        await enqueue_grading_run(redis, run["run_id"], skill)

    return {
        "meta": {"code": 200, "message": "Đã bắt đầu chấm lại bài thi bằng AI"},
        "data": {
            "attempt_id": attempt_id,
            "skill": skill,
            "evaluation_id": job.get("evaluation_id"),
            "runs": job.get("runs"),
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

    # Nếu là Mock Test và có audio hợp lệ, tạo yêu cầu chấm Expert (BR-15, UC-32)
    has_expert_review = False
    if attempt.get("mode") == "mock" and current_user and sub.get("status") != "no_speech":
        try:
            from app.services.expert.quota_manager import confirm_mock_submission_slot
            from app.services.expert.dispatcher import auto_dispatch_pending_requests
            has_expert_review = await confirm_mock_submission_slot(
                current_user.id, attempt_id, "speaking", getattr(request.app.state, "redis", None)
            )
            if has_expert_review:
                await auto_dispatch_pending_requests()
        except Exception as e:
            print(f"[MockExpertSpeaking] Warning: {e}")

    sub["has_expert_review"] = has_expert_review
    return {"meta": {"code": 200, "message": "Bài thi nói đã được ghi nhận"}, "data": sub}
