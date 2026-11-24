"""
Tài liệu theo đề Writing (spec 006, ADR-30): đáp án số liệu Task 1, dàn ý, bài mẫu.

AI soạn nháp, Admin duyệt (BR-19 sửa 2026-11-11). Lưu bất kỳ trường nào là trường đó quay về nháp.
Learner chỉ nhận phần đã duyệt qua các hàm approved_* (FR-007); bảng không có RLS cho Learner.
"""
from datetime import datetime, timezone
from typing import Any, Optional

from app.clients.ai_engine_client import call_ai_draft_material
from app.core.domain_errors import DomainError, NotFoundError
from app.db.supabase import db
from app.services.writing.writing_test_content import chart_image_url

# kind → (cột nội dung, cột thời điểm duyệt, cột người duyệt)
KINDS = {
    "answer_key": ("answer_key", "answer_key_reviewed_at", "answer_key_reviewer_id"),
    "outline": ("outline", "outline_reviewed_at", "reviewer_id"),
    "sample": ("sample_essay", "sample_reviewed_at", "reviewer_id"),
}
EMPTY = {"answer_key": None, "answer_key_reviewed_at": None, "outline": None, "outline_reviewed_at": None,
         "sample_essay": None, "sample_reviewed_at": None}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _kind(kind: str) -> tuple[str, str, str]:
    if kind not in KINDS:
        raise DomainError(f"kind phải là một trong {sorted(KINDS)}")
    return KINDS[kind]


def _task(section_id: str) -> dict[str, Any]:
    rows = db().table("writing_tasks").select("section_id, task_type, task_prompt, chart_image_key") \
        .eq("section_id", section_id).execute().data
    if not rows:
        raise NotFoundError("Task Writing không tồn tại")
    return rows[0]


def get_material(section_id: str) -> dict[str, Any]:
    task = _task(section_id)
    rows = db().table("writing_task_materials").select("*").eq("section_id", section_id).execute().data
    return {**EMPTY, **(rows[0] if rows else {}), "section_id": section_id, "task_type": task["task_type"]}


def _upsert(section_id: str, row: dict[str, Any]) -> dict[str, Any]:
    """UPDATE khi đã có dòng, INSERT khi chưa. Không dùng upsert của PostgREST: INSERT ... ON CONFLICT kiểm CHECK
    trên dòng định chèn (chỉ có vài cột, phần còn lại NULL) nên duyệt một trường có sẵn sẽ vi phạm CHECK."""
    row = {**row, "updated_at": _now()}
    table = db().table("writing_task_materials")
    if not table.update(row).eq("section_id", section_id).execute().data:
        db().table("writing_task_materials").insert({"section_id": section_id, **row}).execute()
    return get_material(section_id)


def update_material(section_id: str, fields: dict[str, Any]) -> dict[str, Any]:
    """Admin sửa tay: trường nào đổi thì về nháp (phải duyệt lại)."""
    _task(section_id)
    row = {}
    for kind, (column, reviewed, _) in KINDS.items():
        if column in fields:
            row[column] = fields[column] or None
            row[reviewed] = None
    if not row:
        raise DomainError("Không có trường nào để lưu")
    if row.get("answer_key") is not None:
        _validate_key(row["answer_key"])
    return _upsert(section_id, row)


def _validate_key(key: Any) -> None:
    if not isinstance(key, dict) or not key.get("series") or not key.get("key_features"):
        raise DomainError("Đáp án phải có series và key_features")


async def draft_material(section_id: str, kind: str) -> dict[str, Any]:
    """Gọi AI soạn nháp rồi lưu ở trạng thái nháp."""
    column, reviewed, _ = _kind(kind)
    task = _task(section_id)
    approved_key = approved_answer_key(section_id)[0] if task["task_type"] == "task1" else None
    draft = await call_ai_draft_material(kind, task["task_type"], task["task_prompt"],
                                         chart_image_url(task.get("chart_image_key")), approved_key)
    return _upsert(section_id, {column: draft, reviewed: None})


def approve_material(section_id: str, kind: str, admin_id: str) -> dict[str, Any]:
    column, reviewed, reviewer = _kind(kind)
    current = get_material(section_id)
    if not current.get(column):
        raise DomainError("Chưa có nội dung để duyệt")
    if kind == "answer_key":
        _validate_key(current[column])
    return _upsert(section_id, {reviewed: _now(), reviewer: admin_id})


def clear_key_approval(section_id: str) -> None:
    """Ảnh biểu đồ đổi → đáp án cũ không còn chắc đúng."""
    db().table("writing_task_materials").update({"answer_key_reviewed_at": None}) \
        .eq("section_id", section_id).execute()


def _approved(section_id: str, column: str, reviewed: str) -> tuple[Optional[Any], Optional[str]]:
    rows = db().table("writing_task_materials").select(f"{column}, {reviewed}") \
        .eq("section_id", section_id).execute().data
    if rows and rows[0].get(reviewed) and rows[0].get(column):
        return rows[0][column], rows[0][reviewed]
    return None, None


def approved_answer_key(section_id: str) -> tuple[Optional[dict], Optional[str]]:
    """(đáp án, thời điểm duyệt) hoặc (None, None)."""
    return _approved(section_id, "answer_key", "answer_key_reviewed_at")


def approved_outline(section_id: str) -> Optional[str]:
    return _approved(section_id, "outline", "outline_reviewed_at")[0]


def approved_sample(section_id: str) -> Optional[str]:
    return _approved(section_id, "sample_essay", "sample_reviewed_at")[0]


def with_practice_outlines(content: dict[str, Any]) -> dict[str, Any]:
    """Gắn dàn ý đã duyệt vào nội dung đề Writing. Chỉ gọi cho Practice: Mock không có gợi ý (FR-007)."""
    for sec in content.get("sections") or []:
        outline = approved_outline(sec["id"])
        for grp in sec.get("question_groups") or []:
            if outline:
                grp.setdefault("content", {})["outline"] = outline
    return content
