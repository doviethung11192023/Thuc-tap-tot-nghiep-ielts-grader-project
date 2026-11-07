"""
Nộp bài Speaking (UC-10, SD-03).

Chỉ tính các câu đã confirm trên server; client không được chỉ định audio nào được chấm.
Function submit_speaking_attempt của DB làm trong một transaction:
- không có câu nào → no_speech (UC-10: không gọi LLM);
- có → grading, tạo evaluation AI (pending) + 1 grading_run (task_no NULL với Speaking).
Không bao giờ gán band giả.
"""
from typing import Any

from app.db.supabase import db
from app.services.practice.practice_attempt_lifecycle import ensure_can_submit, require_submitted


def create_grading_job(attempt_id: str) -> dict[str, Any]:
    """Evaluation mới cho mỗi lần chấm: kết quả cũ không bao giờ bị ghi đè (ADR-13)."""
    return db().rpc("create_ai_grading_job", {
        "p_attempt_id": attempt_id, "p_skill": "speaking", "p_task_nos": None,
    }).execute().data


def submit_speaking(attempt: dict[str, Any]) -> dict[str, Any]:
    ensure_can_submit(attempt)
    result = require_submitted(db().rpc("submit_speaking_attempt", {"p_attempt_id": attempt["id"]}).execute().data)
    return {"attempt_id": attempt["id"], "band": None, "status": result["status"],
            "submitted_at": result["submitted_at"], "job": result.get("job")}
