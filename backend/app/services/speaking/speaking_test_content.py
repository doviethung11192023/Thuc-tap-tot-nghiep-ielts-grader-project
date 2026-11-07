"""
Nội dung đề Speaking (sections → speaking_parts → speaking_questions), theo hình dạng mà
frontend dùng (utils/exam-content-mapper.ts → mapToSpeakingExamData):
sections[i] = một Part, question_groups[0].questions[j] = {id, prompt, prompt_audio_key, prep/answer seconds}.

Số Part lấy từ tiêu đề section ("Part 2"), không lấy từ order_no: importer đánh order_no theo
thứ tự xuất hiện nên đề chỉ có Part 2 + 3 sẽ có order_no 1, 2.
"""
import re
from typing import Any, Optional

from app.db.supabase import db
from app.services.r2_storage import r2_storage

SPEAKING_TREE_SELECT = (
    "id, title, skill, status, duration_minutes, "
    "sections(id, order_no, title, speaking_parts(topic, prep_seconds, answer_seconds, "
    "speaking_questions(id, order_no, prompt, audio_key)))"
)

# BR-13; Admin sửa ở system_settings.speaking_time_limits
DEFAULT_TIME_LIMITS = {"part1_answer": 45, "part2_prep": 60, "part2_answer": 120, "part3_answer": 90}
MAX_THINK_SECONDS = 5   # Part 1, 3 không có thời gian chuẩn bị; dataset có vài giá trị 180 s bất thường


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


def speaking_part_number(section: dict[str, Any]) -> int:
    match = re.search(r"part\s*([123])", section.get("title") or "", re.IGNORECASE)
    return int(match.group(1)) if match else section["order_no"]


def speaking_time_limits() -> dict[str, int]:
    rows = db().table("system_settings").select("value").eq("key", "speaking_time_limits").execute().data
    stored = rows[0]["value"] if rows and isinstance(rows[0].get("value"), dict) else {}
    return {**DEFAULT_TIME_LIMITS, **stored}


def _capped_seconds(part_number: int, part: dict[str, Any], limits: dict[str, int]) -> tuple[int, int]:
    """(chuẩn bị, trả lời) của một Part, không vượt BR-13."""
    prep_limit = limits["part2_prep"] if part_number == 2 else MAX_THINK_SECONDS
    answer_limit = limits[f"part{part_number}_answer"]
    prep = min(part.get("prep_seconds") or 0, prep_limit)
    answer = min(part.get("answer_seconds") or answer_limit, answer_limit)
    return prep, answer


def load_speaking_test(test_id: str) -> Optional[dict[str, Any]]:
    res = db().table("tests").select(SPEAKING_TREE_SELECT).eq("id", test_id).eq("skill", "speaking").execute()
    return res.data[0] if res.data else None


def to_speaking_content(test: dict[str, Any]) -> dict[str, Any]:
    limits = speaking_time_limits()
    sections = []
    for s in sorted(test.get("sections") or [], key=lambda s: s["order_no"]):
        part = speaking_part(s)
        part_number = speaking_part_number(s)
        prep, answer = _capped_seconds(part_number, part, limits)
        questions = [{
            "id": q["id"], "number": q["order_no"], "prompt": q["prompt"], "options": None,
            "prompt_audio_key": _audio_url(q.get("audio_key")),
            "prep_time_sec": prep, "answer_time_sec": answer,
        } for q in sorted(part.get("speaking_questions") or [], key=lambda q: q["order_no"])]
        sections.append({
            "id": s["id"], "order_no": s["order_no"], "part_number": part_number,
            "title": s.get("title") or f"Part {part_number}",
            "passage_text": None, "audio_key": None,
            "question_groups": [{"id": s["id"], "order_no": 1, "question_type": f"speaking_part{part_number}",
                                 "instructions": part.get("topic"), "image_key": None, "content": None,
                                 "questions": questions}],
        })
    return {"test_id": test["id"], "title": test["title"], "skill": "speaking",
            "duration_min": test.get("duration_minutes") or 14, "sections": sections}
