"""
Nộp bài Speaking (UC-10, SD-03 bước 19–21).

Lưu từng câu trả lời đã ghi âm (speaking_responses) rồi khoá attempt:
- không có bản ghi nào → no_speech (UC-10 E4: không gọi LLM);
- có bản ghi → grading, chờ pipeline chấm Speaking (STT + phát âm + LLM) — CHƯA được xây.
Không bao giờ tự gán band giả.
"""
from typing import Any, Optional

from fastapi import HTTPException

from app.db.supabase import db
from app.services.practice.practice_attempt_lifecycle import lock_for_submit


def submit_speaking(attempt: dict[str, Any], recordings: Optional[list[dict[str, Any]]]) -> dict[str, Any]:
    recs = [r for r in recordings or [] if r.get("question_id") and (r.get("audio_url") or r.get("audio_key"))]
    if recs:
        rows = db().table("speaking_questions").select("id, speaking_part_id") \
            .in_("id", [r["question_id"] for r in recs]).execute().data or []
        part_of = {q["id"]: q["speaking_part_id"] for q in rows}
        if len(part_of) != len({r["question_id"] for r in recs}):
            raise HTTPException(status_code=400, detail="Câu hỏi Speaking không thuộc đề này")
    submitted_at = lock_for_submit(attempt, "grading" if recs else "no_speech")
    if recs:
        db().table("attempt_sections").upsert([
            {"attempt_id": attempt["id"], "section_id": sid, "test_id": attempt["test_id"],
             "started_at": attempt["started_at"], "finished_at": submitted_at} for sid in set(part_of.values())
        ], on_conflict="attempt_id,section_id").execute()
        db().table("speaking_responses").upsert([{
            "attempt_id": attempt["id"], "speaking_question_id": r["question_id"],
            "section_id": part_of[r["question_id"]], "audio_key": r.get("audio_key") or r.get("audio_url"),
            "duration_ms": int(float(r.get("duration_sec") or 0) * 1000), "confirmed_at": submitted_at,
        } for r in recs], on_conflict="attempt_id,speaking_question_id").execute()
    return {"attempt_id": attempt["id"], "band": None,
            "status": "grading" if recs else "no_speech", "submitted_at": submitted_at}
