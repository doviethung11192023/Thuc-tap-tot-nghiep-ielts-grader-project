"""
Chạy một lượt chấm từ hàng đợi: nhận lease rồi chuyển cho service của từng kỹ năng.

Job có thể chạy lặp (ARQ at-least-once, cron đẩy lại), nên phải nhận lease trước. Worker khác đang giữ
hoặc lượt đã xong thì bỏ qua. Lưu kết quả đã an toàn khi chạy lại: criterion_scores upsert, annotations
xoá trước khi ghi.
"""
import asyncio
from typing import Optional

from app.db.supabase import db
from app.services.grading.grading_queue import GRADING_LEASE_SECONDS
from app.services.speaking.speaking_grading_service import grade_speaking_attempt
from app.services.writing.writing_grading_service import grade_writing_task
from app.services.writing.writing_test_content import load_writing_task_sections


def _claim(run_id: str) -> bool:
    return bool(db().rpc("claim_grading_run", {
        "p_run_id": run_id, "p_lease_seconds": GRADING_LEASE_SECONDS,
    }).execute().data)


def _release(run_id: str) -> None:
    """Worker tắt có kiểm soát: trả lease để lần chạy sau không phải chờ hết hạn."""
    db().table("grading_runs").update({"claimed_at": None}).eq("id", run_id).eq("status", "running").execute()


def _essay_id(attempt_id: str, test_id: str, task_no: int) -> Optional[str]:
    section_id = load_writing_task_sections(test_id).get(task_no)
    rows = db().table("essays").select("id").eq("attempt_id", attempt_id).eq("section_id", section_id).execute().data
    return rows[0]["id"] if rows else None


async def _dispatch(run: dict, evaluation: dict) -> None:
    attempt_id = evaluation["attempt_id"]
    if evaluation["skill"] == "speaking":
        await grade_speaking_attempt(attempt_id, evaluation["id"], run["id"])
        return
    attempt = db().table("attempts").select("test_id").eq("id", attempt_id).execute().data[0]
    essay_id = _essay_id(attempt_id, attempt["test_id"], run["task_no"])
    await grade_writing_task(None, evaluation["id"], run["id"], essay_id, run["task_no"])


async def execute_grading_run(run_id: str) -> str:
    """Trả 'done' hoặc 'skipped'. Lỗi chấm đã được service ghi vào grading_runs, không raise ra đây."""
    if not _claim(run_id):
        return "skipped"
    run = db().table("grading_runs").select("id, evaluation_id, task_no").eq("id", run_id).execute().data[0]
    evaluation = db().table("evaluations").select("id, attempt_id, skill") \
        .eq("id", run["evaluation_id"]).execute().data[0]
    try:
        await _dispatch(run, evaluation)
    except asyncio.CancelledError:
        _release(run_id)
        raise
    return "done"
