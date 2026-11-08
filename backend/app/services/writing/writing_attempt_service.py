"""
Nộp bài Writing (UC-09, SD-02).

Function submit_writing_attempt của DB làm trong một transaction: khoá attempt, lưu essay từng task,
đổi trạng thái sang grading, tạo 1 evaluation AI (pending) + 1 grading_run cho mỗi task có nội dung.

Quá deadline + 30 s (cron tự nộp, hoặc Learner nộp muộn): chấm các bài đã lưu trên server trước hạn,
không nhận chữ client gửi kèm (BR-21). Mock không có chữ nào thì thành abandoned, không có job chấm.
"""
from typing import Any, Optional

from app.core.domain_errors import InvalidRequestError

from app.db.supabase import db
from app.services.practice.practice_attempt_lifecycle import past_deadline, require_submitted
from app.services.writing.writing_test_content import load_writing_task_sections


def _pick_task_texts(sections: dict[int, str], task1: str, task2: str, essay_text: str) -> dict[int, str]:
    texts = {no: t.strip() for no, t in ((1, task1 or ""), (2, task2 or "")) if t and t.strip()}
    if not texts and essay_text and essay_text.strip():
        texts = {2 if 2 in sections else 1: essay_text.strip()}  # API cũ gửi 1 bài chung
    return {no: t for no, t in texts.items() if no in sections}


def submit_writing(attempt: dict[str, Any], task1: Optional[str], task2: Optional[str], essay_text: Optional[str],
                   auto: bool = False) -> dict[str, Any]:
    late = auto or past_deadline(attempt)
    tasks = None                      # None: DB chấm bài đã lưu
    if not late:
        sections = load_writing_task_sections(attempt["test_id"])        # {task_no: section_id}
        texts = _pick_task_texts(sections, task1, task2, essay_text)
        if not texts:
            raise InvalidRequestError("Bài viết trống")
        tasks = [{"task_no": no, "section_id": sections[no], "content": text} for no, text in sorted(texts.items())]
    result = require_submitted(db().rpc("submit_writing_attempt", {
        "p_attempt_id": attempt["id"], "p_tasks": tasks, "p_auto": late,
    }).execute().data)
    return {"status": result["status"], "evaluation_id": result.get("evaluation_id"),
            "run_ids": [r["run_id"] for r in result.get("runs") or []],
            "essays": sorted(result.get("essays") or [], key=lambda e: e["task_no"]),
            "submitted_at": result.get("submitted_at")}
