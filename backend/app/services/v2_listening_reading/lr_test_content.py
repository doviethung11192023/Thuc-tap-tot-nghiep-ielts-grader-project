"""
Nội dung đề Listening/Reading từ v2, trả về hình dạng cũ mà frontend dùng
(utils/exam-content-mapper.ts, exam-mapper-helpers.ts → mapQuestionGroup):
group.content = {ui_question_type, template, options_pool, diagram_image_url}, question.options = [{key, text}].

Đáp án (question_keys) và transcript KHÔNG có trong nội dung làm bài (ràng buộc 8, FR-14);
chỉ build_lr_sections(..., with_keys=True) dùng sau khi nộp mới gắn đáp án.
"""
from typing import Any, Optional

from app.services.v2_practice import v2db

LR_TREE_SELECT = (
    "id, title, skill, status, duration_minutes, "
    "sections(id, order_no, title, lr_sections(passage, audio_key, transcript, "
    "question_groups(id, order_no, question_type, subtype, instructions, template, image_key, "
    "select_count, allow_reuse, max_words, group_options(label, text), "
    "questions(id, number, prompt, question_options(label, text)))))"
)


def lr_part(section: dict[str, Any]) -> dict[str, Any]:
    """sections → lr_sections là quan hệ 1-1, nhưng PostgREST trả list (FK ghép (section_id, kind))."""
    lr = section.get("lr_sections")
    if isinstance(lr, list):
        lr = lr[0] if lr else None
    return lr or {}


def load_lr_test(test_id: str) -> Optional[dict[str, Any]]:
    res = v2db().table("tests").select(LR_TREE_SELECT).eq("id", test_id).in_("skill", ["reading", "listening"]).execute()
    return res.data[0] if res.data else None


def _options(rows: list[dict]) -> Optional[list[dict]]:
    return [{"key": o["label"], "text": o["text"]} for o in sorted(rows, key=lambda o: o["label"])] or None


def _group(g: dict[str, Any], keys: Optional[dict[str, dict]], answers: Optional[dict[str, dict]]) -> dict[str, Any]:
    questions = []
    for q in sorted(g.get("questions") or [], key=lambda q: q["number"]):
        item = {"id": q["id"], "number": q["number"], "prompt": q.get("prompt"),
                "options": _options(q.get("question_options") or []), "max_words": g.get("max_words")}
        if keys is not None:                              # chỉ sau khi nộp (detail)
            k = keys.get(q["id"]) or {}
            a = (answers or {}).get(q["id"]) or {}
            accepted = k.get("accepted_answers") or []
            item.update({
                "question_answer_keys": [{"accepted_answers": accepted, "explanation": k.get("explanation"),
                                          "evidence": k.get("evidence")}],
                "user_answer": a.get("answer") or "", "is_correct": bool(a.get("is_correct")),
                "correct_answer": accepted[0] if accepted else "",
                "explanation_4_steps": k.get("explanation") or "", "evidence_text": k.get("evidence") or "",
            })
        questions.append(item)
    return {
        "id": g["id"], "order_no": g["order_no"], "question_type": g["question_type"],
        "instructions": g.get("instructions"), "image_key": g.get("image_key"),
        "content": {"ui_question_type": g.get("subtype"), "template": g.get("template"),
                    "options_pool": _options(g.get("group_options") or []),
                    "diagram_image_url": g.get("image_key"), "select_count": g.get("select_count"),
                    "allow_reuse": g.get("allow_reuse")},
        "questions": questions,
    }


def build_lr_sections(test: dict[str, Any], with_keys: bool = False, answers: Optional[dict[str, dict]] = None,
                      only_sections: Optional[set[str]] = None) -> list[dict[str, Any]]:
    keys = None
    if with_keys:
        qids = [q["id"] for s in test.get("sections") or [] for g in (lr_part(s).get("question_groups") or [])
                for q in g.get("questions") or []]
        rows = v2db().table("question_keys").select("question_id, accepted_answers, explanation, evidence") \
            .in_("question_id", qids).execute().data if qids else []
        keys = {r["question_id"]: r for r in rows or []}
    sections = []
    for s in sorted(test.get("sections") or [], key=lambda s: s["order_no"]):
        if only_sections is not None and s["id"] not in only_sections:
            continue
        lr = lr_part(s)
        groups = sorted(lr.get("question_groups") or [], key=lambda g: g["order_no"])
        sec = {"id": s["id"], "order_no": s["order_no"], "title": s.get("title"),
               "passage_text": lr.get("passage"), "audio_key": lr.get("audio_key"),
               "question_groups": [_group(g, keys, answers) for g in groups]}
        if with_keys:
            sec["transcript"] = lr.get("transcript")
        sections.append(sec)
    return sections


def to_legacy_lr_content(test: dict[str, Any]) -> dict[str, Any]:
    return {"test_id": test["id"], "title": test["title"], "skill": test["skill"],
            "duration_min": test.get("duration_minutes") or 60, "sections": build_lr_sections(test)}
