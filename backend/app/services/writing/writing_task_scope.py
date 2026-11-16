"""
Phạm vi task của một bài Writing (BR-04): những task Learner phải làm trong attempt này.

- Mock: luôn cả 2 task.
- Practice: các task Learner chọn lúc vào phòng thi (query `parts`, ví dụ "1", "2", "1,2"); không chọn = cả bài.

Autosave và nộp bài chỉ ghi essay cho task trong phạm vi, nên attempt_sections của attempt là phạm vi đó.
Task trong phạm vi mà bỏ trống tính band 0 khi tổng hợp band (writing_evaluation_finalizer).
"""
from typing import Any, Optional

from app.db.supabase import db
from app.services.writing.writing_test_content import load_writing_task_sections


def task_scope(mode: Optional[str], task_nos: set[int], parts: Optional[str]) -> set[int]:
    """Pure: task_nos là các task đề có; parts lạ hoặc rỗng → cả bài."""
    if mode == "mock" or not parts:
        return set(task_nos)
    chosen = {int(p) for p in str(parts).split(",") if p.strip() in ("1", "2")} & set(task_nos)
    return chosen or set(task_nos)


def expected_task_nos(attempt: dict[str, Any]) -> set[int]:
    """Phạm vi đã ghi nhận của attempt: Mock = mọi task của đề; Practice = task có trong attempt_sections."""
    sections = load_writing_task_sections(attempt["test_id"])          # {task_no: section_id}
    if attempt.get("mode") == "mock":
        return set(sections)
    rows = db().table("attempt_sections").select("section_id").eq("attempt_id", attempt["id"]).execute().data or []
    touched = {str(r["section_id"]) for r in rows}
    return {no for no, section_id in sections.items() if str(section_id) in touched}
