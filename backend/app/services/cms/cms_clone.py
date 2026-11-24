"""Nhân bản đề thi published/archived sang bản nháp mới để chỉnh sửa an toàn (BR-10, SYS-12)."""
from typing import Any

from app.core.domain_errors import NotFoundError
from app.db.supabase import db
from app.services.admin.staff_accounts import write_audit
from app.services.cms import cms_tests

_KIND_BY_SKILL = {
    "reading": "lr",
    "listening": "lr",
    "writing": "writing",
    "speaking": "speaking",
}


def _clone_lr_section(old_sec_id: str, new_sec_id: str) -> None:
    lr_rows = db().table("lr_sections").select("*").eq("section_id", old_sec_id).execute().data or []
    lr = lr_rows[0] if lr_rows else {}
    db().table("lr_sections").insert({
        "section_id": new_sec_id,
        "passage": lr.get("passage"),
        "audio_key": lr.get("audio_key"),
        "transcript": lr.get("transcript"),
    }).execute()

    groups = db().table("question_groups").select("*").eq("lr_section_id", old_sec_id).order("order_no").execute().data or []
    for grp in groups:
        grp_payload: dict[str, Any] = {
            "lr_section_id": new_sec_id,
            "order_no": grp["order_no"],
            "question_type": grp["question_type"],
            "subtype": grp.get("subtype"),
            "instructions": grp.get("instructions"),
            "template": grp.get("template"),
            "image_key": grp.get("image_key"),
            "select_count": grp.get("select_count"),
            "allow_reuse": bool(grp.get("allow_reuse", False)),
            "max_words": grp.get("max_words"),
        }
        new_grp = db().table("question_groups").insert(grp_payload).execute().data[0]
        new_grp_id = new_grp["id"]

        g_opts = db().table("group_options").select("label, text").eq("group_id", grp["id"]).execute().data or []
        if g_opts:
            db().table("group_options").insert([{**o, "group_id": new_grp_id} for o in g_opts]).execute()

        qs = db().table("questions").select("*").eq("group_id", grp["id"]).order("number").execute().data or []
        for q in qs:
            q_payload: dict[str, Any] = {
                "group_id": new_grp_id,
                "lr_section_id": new_sec_id,
                "number": q["number"],
                "prompt": q.get("prompt"),
            }
            if q.get("diagram_coordinate") is not None:
                q_payload["diagram_coordinate"] = q["diagram_coordinate"]
            new_q = db().table("questions").insert(q_payload).execute().data[0]
            new_q_id = new_q["id"]

            q_opts = db().table("question_options").select("label, text").eq("question_id", q["id"]).execute().data or []
            if q_opts:
                db().table("question_options").insert([{**o, "question_id": new_q_id} for o in q_opts]).execute()

            keys = db().table("question_keys").select("accepted_answers, explanation, evidence").eq("question_id", q["id"]).execute().data or []
            if keys and keys[0].get("accepted_answers"):
                k = keys[0]
                db().table("question_keys").insert({
                    "question_id": new_q_id,
                    "accepted_answers": k["accepted_answers"],
                    "explanation": k.get("explanation"),
                    "evidence": k.get("evidence"),
                }).execute()


def _clone_writing_section(old_sec_id: str, new_sec_id: str) -> None:
    rows = db().table("writing_tasks").select("*").eq("section_id", old_sec_id).execute().data or []
    if not rows:
        return
    wt = rows[0]
    db().table("writing_tasks").insert({
        "section_id": new_sec_id,
        "task_type": wt.get("task_type") or "task1",
        "prompt_category": wt.get("prompt_category"),
        "task_prompt": wt.get("task_prompt") or "",
        "chart_image_key": wt.get("chart_image_key"),
        "chart_description": wt.get("chart_description"),
        "min_words": wt.get("min_words") or 150,
    }).execute()


def _clone_speaking_section(old_sec_id: str, new_sec_id: str) -> None:
    rows = db().table("speaking_parts").select("*").eq("section_id", old_sec_id).execute().data or []
    sp = rows[0] if rows else {}
    db().table("speaking_parts").insert({
        "section_id": new_sec_id,
        "topic": sp.get("topic"),
        "prep_seconds": sp.get("prep_seconds") if sp.get("prep_seconds") is not None else 0,
        "answer_seconds": sp.get("answer_seconds") or 45,
    }).execute()

    sqs = db().table("speaking_questions").select("*").eq("speaking_part_id", old_sec_id).order("order_no").execute().data or []
    for sq in sqs:
        db().table("speaking_questions").insert({
            "speaking_part_id": new_sec_id,
            "order_no": sq["order_no"],
            "prompt": sq["prompt"],
            "audio_key": sq.get("audio_key"),
        }).execute()


def clone_test_to_draft(admin_id: str, test_id: str) -> dict[str, Any]:
    rows = db().table("tests").select("*").eq("id", test_id).execute().data or []
    if not rows:
        raise NotFoundError("Bài thi không tồn tại")
    orig = rows[0]
    skill = orig["skill"]
    kind = _KIND_BY_SKILL.get(skill, "lr")

    base_title = str(orig["title"]).removesuffix(" (Bản nháp)").strip()
    test_payload: dict[str, Any] = {
        "title": f"{base_title} (Bản nháp)",
        "skill": skill,
        "allowed_mode": orig.get("allowed_mode", "both"),
        "status": "draft",
        "version": int(orig.get("version") or 1) + 1,
        "previous_version_id": orig["id"],
        "duration_minutes": orig.get("duration_minutes"),
        "source_type": orig.get("source_type", "original"),
        "source_name": orig.get("source_name"),
        "license": orig.get("license"),
        "test_set_id": None,
        "author_id": admin_id,
        "author_role": "admin",
    }
    if orig.get("difficulty") is not None:
        test_payload["difficulty"] = orig["difficulty"]

    new_test = db().table("tests").insert(test_payload).execute().data[0]
    new_test_id = new_test["id"]

    sections = db().table("sections").select("*").eq("test_id", test_id).order("order_no").execute().data or []
    for sec in sections:
        sec_kind = sec.get("kind") or kind
        new_sec = db().table("sections").insert({
            "test_id": new_test_id,
            "skill": skill,
            "kind": sec_kind,
            "order_no": sec["order_no"],
            "title": sec.get("title"),
        }).execute().data[0]
        new_sec_id = new_sec["id"]
        if sec_kind == "lr":
            _clone_lr_section(sec["id"], new_sec_id)
        elif sec_kind == "writing":
            _clone_writing_section(sec["id"], new_sec_id)
        else:
            _clone_speaking_section(sec["id"], new_sec_id)

    write_audit(admin_id, "clone_test_draft", "tests", new_test_id, after={"source_test_id": test_id})
    return cms_tests.to_api(new_test)
