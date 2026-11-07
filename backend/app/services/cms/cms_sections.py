"""
Soạn section cho Admin (UC-21 bước 2). Payload cũ (order_no, title, passage_text, audio_key,
transcript) → sections + bảng kiểu con theo kỹ năng của đề (ràng buộc 1):
- Listening/Reading → lr_sections (passage, audio_key, transcript)
- Writing → writing_tasks (task theo order_no: 1 → Task 1, 2 → Task 2; đề nhập ở nhóm câu hỏi)
- Speaking → speaking_parts (thời gian mặc định theo BR-13)
"""
from typing import Any, Optional

from app.core.domain_errors import DomainError, NotFoundError

from app.db.supabase import db
from app.services.cms.cms_tests import db_error

KIND = {"listening": "lr", "reading": "lr", "writing": "writing", "speaking": "speaking"}
SPEAKING_DEFAULTS = {1: (0, 45), 2: (60, 120), 3: (0, 90)}         # (prep, answer) giây — BR-13


def section_skill(section_id: str) -> Optional[dict[str, Any]]:
    rows = db().table("sections").select("id, test_id, skill, kind, order_no, title").eq("id", section_id).execute().data
    return rows[0] if rows else None


def _with_subtype(sec: dict[str, Any]) -> dict[str, Any]:
    out = dict(sec)
    if sec["kind"] == "lr":
        lr = db().table("lr_sections").select("passage, audio_key, transcript").eq("section_id", sec["id"]).execute().data
        lr = lr[0] if lr else {}
        out.update(passage_text=lr.get("passage"), audio_key=lr.get("audio_key"), transcript=lr.get("transcript"))
    return out


def create_section(test_id: str, data: dict[str, Any]) -> dict[str, Any]:
    test = db().table("tests").select("id, skill").eq("id", test_id).execute().data
    if not test:
        raise NotFoundError("Bài thi không tồn tại")
    skill, order_no = test[0]["skill"], data["order_no"]
    try:
        sec = db().table("sections").insert({"test_id": test_id, "skill": skill, "kind": KIND[skill],
                                             "order_no": order_no, "title": data.get("title")}).execute().data[0]
        if KIND[skill] == "lr":
            db().table("lr_sections").insert({"section_id": sec["id"], "passage": data.get("passage_text"),
                                              "audio_key": data.get("audio_key"),
                                              "transcript": data.get("transcript")}).execute()
        elif skill == "writing":
            task = "task1" if order_no == 1 else "task2"
            db().table("writing_tasks").insert({"section_id": sec["id"], "task_type": task,
                                                "task_prompt": data.get("passage_text") or "",
                                                "min_words": 150 if task == "task1" else 250}).execute()
        else:
            prep, answer = SPEAKING_DEFAULTS.get(order_no, (0, 45))
            db().table("speaking_parts").insert({"section_id": sec["id"], "topic": data.get("title"),
                                                 "prep_seconds": prep, "answer_seconds": answer}).execute()
    except DomainError:
        raise
    except Exception as e:
        raise db_error(e)
    return _with_subtype(sec)


def get_section(section_id: str) -> dict[str, Any]:
    sec = section_skill(section_id)
    if not sec:
        raise NotFoundError("Section không tồn tại")
    return _with_subtype(sec)


def update_section(section_id: str, data: dict[str, Any]) -> dict[str, Any]:
    sec = section_skill(section_id)
    if not sec:
        raise NotFoundError("Section không tồn tại")
    try:
        base = {k: data[k] for k in ("order_no", "title") if k in data}
        if base:
            db().table("sections").update(base).eq("id", section_id).execute()
        if sec["kind"] == "lr":
            lr = {col: data[k] for k, col in (("passage_text", "passage"), ("audio_key", "audio_key"),
                                              ("transcript", "transcript")) if k in data}
            if lr:
                db().table("lr_sections").update(lr).eq("section_id", section_id).execute()
        elif sec["kind"] == "writing" and "passage_text" in data:
            db().table("writing_tasks").update({"task_prompt": data["passage_text"] or ""}).eq("section_id", section_id).execute()
        elif sec["kind"] == "speaking" and "title" in data:
            db().table("speaking_parts").update({"topic": data["title"]}).eq("section_id", section_id).execute()
    except Exception as e:
        raise db_error(e)
    return get_section(section_id)


def delete_section(section_id: str) -> None:
    try:
        db().table("sections").delete().eq("id", section_id).execute()     # bảng kiểu con xoá theo cascade
    except Exception as e:
        raise db_error(e)
