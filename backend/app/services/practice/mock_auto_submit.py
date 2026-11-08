"""
Tự nộp bài Mock quá hạn (FR-12, BR-21, UC-26; spec 004 US3).

Cron chạy mỗi phút: mọi attempt Mock còn in_progress quá deadline + 30 s được nộp bằng phần đã lưu trên
server, dù Learner còn mở trang hay không. Chấm như nộp tay: L/R chấm ngay, W/S đẩy job chấm AI.

Nộp tay và cron cùng lúc: function submit_* của DB khoá dòng attempt, chỉ lần đầu có hiệu lực, lần sau
nhận NULL (ConflictError) và được bỏ qua ở đây.
"""
from datetime import timedelta
from typing import Any

from app.core.domain_errors import ConflictError
from app.db.supabase import db
from app.services.grading.grading_queue import enqueue_grading_run
from app.services.listening_reading.lr_grading_service import submit_lr
from app.services.practice.practice_attempt_lifecycle import LATE_GRACE_SECONDS, now_utc
from app.services.speaking.speaking_submission_service import submit_speaking
from app.services.writing.writing_attempt_service import submit_writing

BATCH_SIZE = 200    # còn sót thì phút sau làm tiếp


def overdue_mock_attempts() -> list[dict[str, Any]]:
    cutoff = now_utc() - timedelta(seconds=LATE_GRACE_SECONDS)
    return db().table("attempts").select("*").eq("mode", "mock").eq("status", "in_progress") \
        .lt("deadline_at", cutoff.isoformat()).order("deadline_at").limit(BATCH_SIZE).execute().data or []


async def _submit(redis: Any, attempt: dict[str, Any]) -> str:
    skill = attempt["skill"]
    if skill in ("listening", "reading"):
        submit_lr(attempt, {}, None, auto=True)
        return "scored"
    if skill == "writing":
        sub = submit_writing(attempt, None, None, None, auto=True)
        for run_id in sub["run_ids"]:
            await enqueue_grading_run(redis, run_id, "writing")
        return sub["status"]
    sub = submit_speaking(attempt, auto=True)
    if sub.get("job"):
        await enqueue_grading_run(redis, sub["job"]["runs"][0]["run_id"], "speaking")
    return sub["status"]


async def auto_submit_overdue_mocks(redis: Any) -> dict[str, int]:
    """Đếm theo kết quả: scored, grading, no_speech, abandoned, skipped (đã nộp ở nơi khác), failed."""
    counts: dict[str, int] = {}
    for attempt in overdue_mock_attempts():
        try:
            outcome = await _submit(redis, attempt)
        except ConflictError:
            outcome = "skipped"
        except Exception as e:     # một bài lỗi không chặn các bài khác; phút sau thử lại
            print(f"⚠️ [AutoSubmit] attempt {attempt['id']} failed: {e}")
            outcome = "failed"
        counts[outcome] = counts.get(outcome, 0) + 1
    return counts
