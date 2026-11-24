"""
Dùng lại kết quả chấm của bài nộp trùng y nguyên (spec 006 US4).

Khoá = (task, section, nội dung bài đã bỏ khoảng trắng hai đầu, thời điểm duyệt đáp án, dấu vân tay cấu hình
chấm của AI engine). Chỉ dùng lại lượt chấm 'done'. Không dùng cache khi chấm lại (attempt đã có evaluation AI
khác) hoặc khi AI engine không trả được dấu vân tay. Kết quả được chép sang lượt chấm mới của attempt mới,
không ghi đè gì của lượt cũ (constitution II).
"""
import hashlib
import json
from typing import Any, Optional

from app.db.supabase import db


def input_hash(task_no: int, section_id: str, essay: str, key_reviewed_at: Optional[str],
               fingerprint: Optional[str]) -> Optional[str]:
    if not fingerprint:
        return None
    payload = {"task_no": task_no, "section_id": section_id, "essay": (essay or "").strip(),
               "key": key_reviewed_at, "engine": fingerprint}
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()


def is_first_ai_evaluation(evaluation_id: str) -> bool:
    """Evaluation AI thứ hai trở đi của cùng attempt là chấm lại: phải chấm thật."""
    ev = db().table("evaluations").select("attempt_id").eq("id", evaluation_id).execute().data
    if not ev:
        return False
    rows = db().table("evaluations").select("id").eq("attempt_id", ev[0]["attempt_id"]) \
        .eq("evaluator_type", "ai").execute().data or []
    return len(rows) <= 1


def find_cached_output(hash_value: Optional[str], run_id: str) -> Optional[tuple[str, dict[str, Any]]]:
    """(id lượt chấm cũ, output) của lượt 'done' cùng khoá, khác lượt hiện tại."""
    if not hash_value:
        return None
    rows = db().table("grading_runs").select("id, output").eq("input_hash", hash_value).eq("status", "done") \
        .neq("id", run_id).order("finished_at", desc=True).limit(1).execute().data or []
    if rows and isinstance(rows[0].get("output"), dict):
        return rows[0]["id"], rows[0]["output"]
    return None
