"""
Nội dung đề Speaking (sections → speaking_parts → speaking_questions), theo hình dạng mà
frontend dùng (utils/exam-content-mapper.ts → mapToSpeakingExamData):
sections[i] = Part i, question_groups[0].questions[j] = {id, prompt, prompt_audio_key, prep/answer seconds}.
"""
from typing import Any, Optional

from app.db.supabase import db
from app.services.r2_storage import r2_storage

SPEAKING_TREE_SELECT = (
    "id, title, skill, status, duration_minutes, "
    "sections(id, order_no, title, speaking_parts(topic, prep_seconds, answer_seconds, "
    "speaking_questions(id, order_no, prompt, audio_key)))"
)


def _audio_url(key: Optional[str]) -> Optional[str]:
    if not key or key.startswith(("http://", "https://")):
        return key
    url = r2_storage.get_file_url(key)
    return url if url.startswith(("http://", "https://")) else None


def speaking_part(section: dict[str, Any]) -> dict[str, Any]:
    """sections → speaking_parts là 1-1 nhưng PostgREST trả list (FK ghép (section_id, kind))."""
    part = section.get("speaking_parts")
    if isinstance(part, list):
        part = part[0] if part else None
    return part or {}


def load_speaking_test(test_id: str) -> Optional[dict[str, Any]]:
    res = db().table("tests").select(SPEAKING_TREE_SELECT).eq("id", test_id).eq("skill", "speaking").execute()
    return res.data[0] if res.data else None


def to_speaking_content(test: dict[str, Any]) -> dict[str, Any]:
    sections = []
    for s in sorted(test.get("sections") or [], key=lambda s: s["order_no"]):
        part = speaking_part(s)
        questions = [{
            "id": q["id"], "number": q["order_no"], "prompt": q["prompt"], "options": None,
            "prompt_audio_key": _audio_url(q.get("audio_key")),
            "prep_time_sec": part.get("prep_seconds"), "answer_time_sec": part.get("answer_seconds"),
        } for q in sorted(part.get("speaking_questions") or [], key=lambda q: q["order_no"])]
        sections.append({
            "id": s["id"], "order_no": s["order_no"], "title": s.get("title") or f"Part {s['order_no']}",
            "passage_text": None, "audio_key": None,
            "question_groups": [{"id": s["id"], "order_no": 1, "question_type": f"speaking_part{s['order_no']}",
                                 "instructions": part.get("topic"), "image_key": None, "content": None,
                                 "questions": questions}],
        })
    return {"test_id": test["id"], "title": test["title"], "skill": "speaking",
            "duration_min": test.get("duration_minutes") or 14, "sections": sections}
