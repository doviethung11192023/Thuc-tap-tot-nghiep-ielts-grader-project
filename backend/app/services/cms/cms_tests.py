"""
Quản lý đề thi cho Admin (UC-21, UC-36, FR-26/27, BR-10, BR-18, BR-19).

API giữ hình dạng cũ mà giao diện admin dùng (duration_min, origin, created_by, reviewed_by,
test_sections lồng nhau); bảng thật là tests / sections / lr_sections / writing_tasks / speaking_parts.
- Publish: ghi reviewer + thời điểm (DB yêu cầu khi status khác draft).
- Đề published/archived bị DB khoá sửa (trigger block_published_edit, BR-10) → 409.
- Nội dung do AI tạo bị từ chối (BR-19).
"""
from datetime import datetime, timezone
from typing import Any, Optional

from app.core.domain_errors import ConflictError, DomainError, InvalidRequestError, NotFoundError
from app.db.supabase import db
from app.services.admin.staff_accounts import write_audit

ORIGIN_TO_SOURCE = {"manual": "original", "open_license": "open_licence"}
SOURCE_TO_ORIGIN = {v: k for k, v in ORIGIN_TO_SOURCE.items()} | {"public_domain": "open_license"}
SORTS = {"oldest": ("created_at", False), "title_asc": ("title", False), "title_desc": ("title", True),
         "duration_desc": ("duration_minutes", True)}


def to_api(t: dict[str, Any]) -> dict[str, Any]:
    """Dòng tests → hình dạng API cũ."""
    out = {k: v for k, v in t.items() if k not in ("duration_minutes", "source_type", "author_id", "author_role",
                                                   "reviewer_id", "reviewer_role")}
    return {**out, "duration_min": t.get("duration_minutes"), "origin": SOURCE_TO_ORIGIN.get(t.get("source_type"), "manual"),
            "created_by": t.get("author_id"), "reviewed_by": t.get("reviewer_id")}


def db_error(e: Exception) -> DomainError:
    msg = str(e)
    if "BR-10" in msg or "new version" in msg:
        return ConflictError("Đề đã xuất bản/lưu trữ không sửa được — hãy tạo phiên bản mới (BR-10)")
    if "tests_test_set_id_skill_key" in msg:
        return ConflictError("Bộ đề Mock chỉ có 1 đề cho mỗi kỹ năng (FR-36)")
    if "foreign key" in msg and "attempts" in msg:
        return ConflictError("Đề đã có bài làm, không xoá được — hãy lưu trữ (archive)")
    return InvalidRequestError(msg[:300])


def _payload(data: dict[str, Any]) -> dict[str, Any]:
    if data.get("origin") == "ai_generated":
        raise InvalidRequestError("Không dùng nội dung đề do AI tạo (BR-19)")
    out = {k: data[k] for k in ("title", "skill", "test_set_id", "allowed_mode", "difficulty", "source_name", "license")
           if k in data}
    if "duration_min" in data:
        out["duration_minutes"] = data["duration_min"]
    if "origin" in data:
        out["source_type"] = ORIGIN_TO_SOURCE.get(data["origin"], "original")
    return out


def list_tests(page: int, limit: int, filters: dict[str, Any], sort_by: Optional[str], search: Optional[str],
               test_format: Optional[str]) -> dict[str, Any]:
    q = db().table("tests").select("*, test_sets(id, name)", count="exact")
    for col, val in filters.items():
        if val:
            q = q.eq(col, "draft" if (col == "status" and val == "pending_review") else val)
    if search and search.strip():
        q = q.ilike("title", f"%{search.strip()}%")
    if test_format == "full":
        q = q.or_("source_name.is.null,source_name.neq.micro_exercise")
    elif test_format == "exercise":
        q = q.eq("source_name", "micro_exercise")
    col, desc = SORTS.get(sort_by or "", ("created_at", True))
    offset = (page - 1) * limit
    res = q.order(col, desc=desc).range(offset, offset + limit - 1).execute()
    return {"items": [to_api(t) for t in res.data or []],
            "total": res.count if getattr(res, "count", None) is not None else len(res.data or [])}


def create_test(admin_id: str, data: dict[str, Any]) -> dict[str, Any]:
    status = data.get("status") or "draft"
    try:
        row = db().table("tests").insert({**_payload(data), "status": "draft", "author_id": admin_id,
                                          "author_role": "admin"}).execute().data[0]
    except Exception as e:   # FR-36 (UNIQUE test_set_id+skill), khoá ngoại bộ đề, kiểu số: trả 409/400 thay vì 500
        raise db_error(e)
    write_audit(admin_id, "create_test", "tests", row["id"], after={"title": row["title"], "skill": row["skill"]})
    if status == "published":
        return set_status(admin_id, row["id"], "published")
    return to_api(row)


def update_test(admin_id: str, test_id: str, data: dict[str, Any]) -> dict[str, Any]:
    status = data.pop("status", None)
    payload = _payload(data)
    row = None
    if payload:
        try:
            res = db().table("tests").update(payload).eq("id", test_id).execute()
        except Exception as e:
            raise db_error(e)
        if not res.data:
            raise NotFoundError("Bài thi không tồn tại")
        row = res.data[0]
        write_audit(admin_id, "update_test", "tests", test_id, after=payload)
    if status:
        return set_status(admin_id, test_id, status)
    if row is None:
        raise InvalidRequestError("Không có dữ liệu cập nhật")
    return to_api(row)


def set_status(admin_id: str, test_id: str, status: str) -> dict[str, Any]:
    status = "draft" if status == "pending_review" else status
    payload: dict[str, Any] = {"status": status}
    if status == "published":
        payload.update(reviewer_id=admin_id, reviewer_role="admin", reviewed_at=datetime.now(timezone.utc).isoformat())
    try:
        res = db().table("tests").update(payload).eq("id", test_id).execute()
    except Exception as e:
        raise db_error(e)
    if not res.data:
        raise NotFoundError("Bài thi không tồn tại")
    write_audit(admin_id, f"{status}_test", "tests", test_id, after={"status": status})
    return to_api(res.data[0])


def delete_test(admin_id: str, test_id: str) -> None:
    try:
        db().table("tests").delete().eq("id", test_id).execute()
    except Exception as e:
        err = db_error(e)
        if err.status_code == 409 and "BR-10" in str(err.detail):
            err.detail = "Đề đã xuất bản hoặc lưu trữ không xoá được (BR-10)"
        raise err
    write_audit(admin_id, "delete_test", "tests", test_id)


def test_tree(test_id: str) -> Optional[dict[str, Any]]:
    """Đề + toàn bộ nội dung kèm đáp án (chỉ Admin), theo hình dạng cây cũ (sections)."""
    rows = db().table("tests").select("*, test_sets(id, name)").eq("id", test_id).execute().data
    if not rows:
        return None
    test = rows[0]
    if test["skill"] in ("reading", "listening"):
        from app.services.listening_reading.lr_test_content import build_lr_sections, load_lr_test
        sections = build_lr_sections(load_lr_test(test_id) or {}, with_keys=True)
    elif test["skill"] == "writing":
        from app.services.writing.writing_test_content import load_writing_test, to_writing_content
        sections = to_writing_content(load_writing_test(test_id))["sections"]
        for sec in sections:  # ô "Đề bài Task" của CMS đọc passage_text; đề Writing nằm ở writing_tasks.task_prompt
            sec["passage_text"] = sec["question_groups"][0]["questions"][0]["prompt"]
    else:
        from app.services.speaking.speaking_test_content import load_speaking_test, to_speaking_content
        sections = to_speaking_content(load_speaking_test(test_id))["sections"]
    return {**to_api(test), "sections": sections}
