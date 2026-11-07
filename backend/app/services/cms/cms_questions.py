"""
Soạn nhóm câu hỏi và câu hỏi (UC-21 bước 2). Payload cũ → bảng theo loại section:

- Section L/R: question_groups (subtype = content.ui_question_type, template = content.template,
  options_pool → group_options), questions (+ question_options, question_keys, diagram_coordinate).
- Section Writing: "nhóm" writing_task1/2 = chính writing_tasks của section (id nhóm = id section);
  câu hỏi = đề bài (task_prompt); image_key = biểu đồ; content.min_words.
- Section Speaking: "nhóm" speaking_partN = speaking_parts (id nhóm = id section);
  câu hỏi = speaking_questions (number → order_no, prompt_audio_key → audio_key).
"""
from typing import Any, Optional

from app.core.domain_errors import DomainError, NotFoundError

from app.db.supabase import db
from app.services.cms.cms_sections import section_skill
from app.services.cms.cms_tests import db_error


def _opts(items: Any) -> list[dict[str, str]]:
    return [{"label": str(o["key"]), "text": str(o.get("text") or o["key"])}
            for o in items or [] if isinstance(o, dict) and o.get("key") is not None]


def _save_lr_question(group: dict[str, Any], q: dict[str, Any], question_id: Optional[str] = None) -> str:
    opts = q.get("options") if isinstance(q.get("options"), list) else []
    coord = next((o.get("diagram_coordinate") for o in opts if isinstance(o, dict) and o.get("diagram_coordinate")), None)
    row = {"number": q["number"], "prompt": q.get("prompt"), "diagram_coordinate": coord}
    if question_id:
        db().table("questions").update(row).eq("id", question_id).execute()
        db().table("question_options").delete().eq("question_id", question_id).execute()
    else:
        question_id = db().table("questions").insert({**row, "group_id": group["id"]}).execute().data[0]["id"]
    if _opts(opts):
        db().table("question_options").insert([{**o, "question_id": question_id} for o in _opts(opts)]).execute()
    key = q.get("answer_key")
    if key and key.get("accepted_answers"):
        db().table("question_keys").upsert({
            "question_id": question_id, "accepted_answers": [str(a) for a in key["accepted_answers"]],
            "explanation": key.get("explanation"), "evidence": key.get("evidence")}, on_conflict="question_id").execute()
    if q.get("max_words") and (not group.get("max_words") or q["max_words"] > group["max_words"]):
        db().table("question_groups").update({"max_words": q["max_words"]}).eq("id", group["id"]).execute()
        group["max_words"] = q["max_words"]
    return question_id


def _save_writing(sec: dict[str, Any], grp: dict[str, Any]) -> None:
    content = grp.get("content") or {}
    task = "task1" if grp.get("question_type") == "writing_task1" else ("task2" if grp.get("question_type") == "writing_task2"
                                                                       else None)
    row = {k: v for k, v in {"task_type": task, "prompt_category": grp.get("question_subtype"),
                             "chart_image_key": grp.get("image_key") or content.get("diagram_image_url"),
                             "min_words": content.get("min_words")}.items() if v}
    prompt = next((q.get("prompt") for q in grp.get("questions") or [] if q.get("prompt")), None)
    if prompt:
        row["task_prompt"] = prompt
    if row:
        db().table("writing_tasks").update(row).eq("section_id", sec["id"]).execute()


def _save_speaking_question(part_id: str, q: dict[str, Any], question_id: Optional[str] = None) -> str:
    row = {"order_no": q["number"], "prompt": q.get("prompt") or "", "audio_key": q.get("prompt_audio_key")}
    if question_id:
        db().table("speaking_questions").update(row).eq("id", question_id).execute()
        return question_id
    timing = {k: q[s] for k, s in (("prep_seconds", "prep_time_sec"), ("answer_seconds", "answer_time_sec")) if q.get(s)}
    if timing:
        db().table("speaking_parts").update(timing).eq("section_id", part_id).execute()
    return db().table("speaking_questions").insert({**row, "speaking_part_id": part_id}).execute().data[0]["id"]


def create_group(section_id: str, grp: dict[str, Any]) -> dict[str, Any]:
    sec = section_skill(section_id)
    if not sec:
        raise NotFoundError("Section không tồn tại")
    try:
        if sec["kind"] == "writing":
            _save_writing(sec, grp)
            return {"id": section_id, "section_id": section_id, **{k: grp.get(k) for k in ("order_no", "question_type")}}
        if sec["kind"] == "speaking":
            for q in grp.get("questions") or []:
                _save_speaking_question(section_id, q)
            return {"id": section_id, "section_id": section_id, **{k: grp.get(k) for k in ("order_no", "question_type")}}
        content = grp.get("content") or {}
        group = db().table("question_groups").insert({
            "lr_section_id": section_id, "order_no": grp["order_no"], "question_type": grp["question_type"],
            "subtype": grp.get("question_subtype") or content.get("ui_question_type"),
            "instructions": grp.get("instructions"), "template": content.get("template"),
            "image_key": grp.get("image_key") or content.get("diagram_image_url"),
            "select_count": content.get("select_count"),
            "allow_reuse": bool(content.get("allow_reuse") or content.get("ui_question_type") == "matching_features"),
        }).execute().data[0]
        if _opts(content.get("options_pool")):
            db().table("group_options").insert([{**o, "group_id": group["id"]} for o in _opts(content["options_pool"])]).execute()
        for q in grp.get("questions") or []:
            _save_lr_question(group, q)
        return {**group, "section_id": section_id}
    except DomainError:
        raise
    except Exception as e:
        raise db_error(e)


def delete_group(group_id: str) -> None:
    try:
        if db().table("question_groups").select("id").eq("id", group_id).execute().data:
            db().table("question_groups").delete().eq("id", group_id).execute()
            return
        sec = section_skill(group_id)          # nhóm Writing/Speaking = section
        if sec and sec["kind"] == "speaking":
            db().table("speaking_questions").delete().eq("speaking_part_id", group_id).execute()
        elif sec and sec["kind"] == "writing":
            db().table("writing_tasks").update({"task_prompt": "", "chart_image_key": None}).eq("section_id", group_id).execute()
    except Exception as e:
        raise db_error(e)


def save_question(group_id: Optional[str], q: dict[str, Any], question_id: Optional[str] = None) -> dict[str, Any]:
    """Tạo (group_id) hoặc sửa (question_id) một câu hỏi; tự nhận biết L/R, Speaking, Writing."""
    try:
        if question_id:
            lr = db().table("questions").select("id, group_id, question_groups(id, max_words)").eq("id", question_id).execute().data
            if lr:
                return {"id": _save_lr_question(lr[0]["question_groups"], q, question_id)}
            if db().table("speaking_questions").select("id").eq("id", question_id).execute().data:
                return {"id": _save_speaking_question("", q, question_id)}
            if db().table("writing_tasks").select("section_id").eq("section_id", question_id).execute().data:
                db().table("writing_tasks").update({"task_prompt": q.get("prompt") or ""}).eq("section_id", question_id).execute()
                return {"id": question_id}
            raise NotFoundError("Câu hỏi không tồn tại")
        group = db().table("question_groups").select("id, max_words").eq("id", group_id).execute().data
        if group:
            return {"id": _save_lr_question(group[0], q)}
        sec = section_skill(group_id)
        if sec and sec["kind"] == "speaking":
            return {"id": _save_speaking_question(group_id, q)}
        if sec and sec["kind"] == "writing":
            db().table("writing_tasks").update({"task_prompt": q.get("prompt") or ""}).eq("section_id", group_id).execute()
            return {"id": group_id}
        raise NotFoundError("Nhóm câu hỏi không tồn tại")
    except DomainError:
        raise
    except Exception as e:
        raise db_error(e)


def delete_question(question_id: str) -> None:
    try:
        for table in ("questions", "speaking_questions"):
            if db().table(table).select("id").eq("id", question_id).execute().data:
                db().table(table).delete().eq("id", question_id).execute()
                return
    except Exception as e:
        raise db_error(e)
