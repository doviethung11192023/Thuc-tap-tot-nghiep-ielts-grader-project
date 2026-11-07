"""
Nộp bài Writing (UC-09, SD-02).

Function submit_writing_attempt của DB làm trong một transaction: khoá attempt (in_progress → grading),
lưu essay từng task, tạo 1 evaluation AI (pending) + 1 grading_run/task. Worker chấm sau.
"""
from typing import Any

from app.core.domain_errors import InvalidRequestError

from app.db.supabase import db
from app.services.practice.practice_attempt_lifecycle import ensure_can_submit, require_submitted
from app.services.writing.writing_test_content import load_writing_task_sections


def _pick_task_texts(sections: dict[int, str], task1: str, task2: str, essay_text: str) -> dict[int, str]:
    texts = {no: t.strip() for no, t in ((1, task1 or ""), (2, task2 or "")) if t and t.strip()}
    if not texts and essay_text and essay_text.strip():
        texts = {2 if 2 in sections else 1: essay_text.strip()}  # API cũ gửi 1 bài chung
    return {no: t for no, t in texts.items() if no in sections}


def submit_writing(attempt: dict[str, Any], task1: str, task2: str, essay_text: str) -> dict[str, Any]:
    ensure_can_submit(attempt)
    sections = load_writing_task_sections(attempt["test_id"])        # {task_no: section_id}
    texts = _pick_task_texts(sections, task1, task2, essay_text)
    if not texts:
        raise InvalidRequestError("Bài viết trống")
    tasks = [{"task_no": no, "section_id": sections[no], "content": text} for no, text in sorted(texts.items())]
    result = require_submitted(db().rpc("submit_writing_attempt", {
        "p_attempt_id": attempt["id"], "p_tasks": tasks,
    }).execute().data)
    return {"evaluation_id": result["evaluation_id"], "run_ids": [r["run_id"] for r in result["runs"]],
            "essays": sorted(result["essays"], key=lambda e: e["task_no"]), "submitted_at": result["submitted_at"]}
