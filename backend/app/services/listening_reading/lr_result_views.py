"""
Kết quả Listening/Reading:
- GET /test-practice/attempts/{id}/summary : band, số câu đúng, thống kê theo dạng câu
- GET /test-practice/attempts/{id}/detail  : đáp án, lời giải, dẫn chứng, transcript (FR-14, chỉ sau khi nộp)
"""
from collections import defaultdict
from typing import Any

from fastapi import HTTPException

from app.services.listening_reading.lr_test_content import build_lr_sections, load_lr_test
from app.db.supabase import db

def _title(test_id: str) -> str:
    rows = db().table("tests").select("title").eq("id", test_id).execute().data
    return (rows[0]["title"] if rows else None) or "IELTS Practice Test"


def _band(attempt: dict[str, Any]):
    return float(attempt["lr_band"]) if attempt.get("lr_band") is not None else None


def build_lr_summary(attempt: dict[str, Any]) -> dict[str, Any]:
    rows = db().table("answers").select("is_correct, questions(question_groups(question_type, subtype))") \
        .eq("attempt_id", attempt["id"]).execute().data or []
    stats: dict[str, dict[str, int]] = defaultdict(lambda: {"total": 0, "correct": 0})
    for a in rows:
        group = ((a.get("questions") or {}).get("question_groups") or {})
        code = group.get("question_type") or "other"
        stats[code]["total"] += 1
        stats[code]["correct"] += int(bool(a.get("is_correct")))
    formats = [{
        "code": code, "name": code.replace("_", " ").capitalize(),
        "total_questions": v["total"], "correct_answers": v["correct"],
        "correct_rate": round(v["correct"] / max(1, v["total"]) * 100, 1),
        "incorrect_rate": round(100 - v["correct"] / max(1, v["total"]) * 100, 1),
    } for code, v in stats.items()]
    return {
        "attempt_id": attempt["id"], "test_id": attempt["test_id"], "title": _title(attempt["test_id"]),
        "skill": attempt["skill"], "mode": attempt["mode"],
        "status": attempt["status"],
        "overall_band": _band(attempt),                      # None khi chưa đủ 40 câu (BR-03)
        "correct_count": attempt.get("raw_score") or 0,
        "total_questions": attempt.get("question_count") or len(rows),
        "submitted_at": attempt.get("submitted_at") or attempt.get("started_at"),
        "task_formats_result": formats,
    }


def build_lr_detail(attempt: dict[str, Any]) -> dict[str, Any]:
    if attempt["status"] in ("in_progress", "abandoned"):
        raise HTTPException(status_code=400, detail="Chỉ xem đáp án sau khi nộp bài")   # FR-14
    test = load_lr_test(attempt["test_id"])
    if not test:
        raise HTTPException(status_code=404, detail="Bài thi không tồn tại")
    answer_rows = db().table("answers").select("question_id, answer, is_correct") \
        .eq("attempt_id", attempt["id"]).execute().data or []
    practiced = {r["section_id"] for r in db().table("attempt_sections").select("section_id")
                 .eq("attempt_id", attempt["id"]).execute().data or []}
    sections = build_lr_sections(test, with_keys=True, answers={a["question_id"]: a for a in answer_rows},
                                 only_sections=practiced or None)
    return {
        "attempt_id": attempt["id"], "test_id": attempt["test_id"], "title": test["title"],
        "skill": attempt["skill"], "overall_band": _band(attempt),
        "correct_count": attempt.get("raw_score") or 0, "submitted_at": attempt.get("submitted_at"),
        "sections": sections,
    }
