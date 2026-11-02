"""
Nộp và chấm Listening/Reading trên v2 (SD-04): chấm ngay trong request.

- Section được chấm: các part đã chọn (req.parts theo order_no), mặc định cả đề.
- Mọi câu trong các section đó được lưu vào answers (câu bỏ trống = sai).
- Band chỉ khi bài phủ đủ 40 câu (BR-03, ADR-19); làm lẻ thì chỉ có "x / y câu đúng".
- Nộp lần 2 trả lại kết quả lần đầu (SD-04: double submission returns the first result).
"""
from typing import Any, Optional

from fastapi import HTTPException

from app.services.v2_listening_reading.lr_answer_matching import is_correct
from app.services.v2_listening_reading.lr_test_content import load_lr_test, lr_part
from app.services.v2_practice import v2db
from app.services.v2_practice.practice_attempt_lifecycle import lock_for_submit


def lookup_band(skill: str, raw_score: int) -> Optional[float]:
    rows = v2db().table("band_conversions").select("band").eq("skill", skill) \
        .lte("raw_min", raw_score).gte("raw_max", raw_score).limit(1).execute().data
    return float(rows[0]["band"]) if rows else None


def _result(attempt: dict[str, Any], time_spent: Optional[int] = None) -> dict[str, Any]:
    return {
        "attempt_id": attempt["id"], "test_id": attempt["test_id"], "skill": attempt["skill"],
        "raw_score": attempt.get("raw_score") or 0, "total_questions": attempt.get("question_count") or 0,
        "band": float(attempt["lr_band"]) if attempt.get("lr_band") is not None else None,
        "time_spent_sec": time_spent, "submitted_at": attempt.get("submitted_at"),
    }


def submit_lr(attempt: dict[str, Any], answers: dict[str, Any], parts: Optional[list[int]],
              time_spent: Optional[int] = None) -> dict[str, Any]:
    if attempt["status"] == "scored":
        return _result(attempt, time_spent)
    test = load_lr_test(attempt["test_id"])
    if not test:
        raise HTTPException(status_code=404, detail="Bài thi không tồn tại")
    sections = [s for s in test.get("sections") or [] if not parts or s["order_no"] in parts]
    if not sections:
        raise HTTPException(status_code=400, detail="Không có phần thi nào được chọn")

    submitted_at = lock_for_submit(attempt, "submitted")
    questions = [(s["id"], g, q) for s in sections for g in (lr_part(s).get("question_groups") or [])
                 for q in g.get("questions") or []]
    qids = [q["id"] for _, _, q in questions]
    keys = {r["question_id"]: r["accepted_answers"] for r in (v2db().table("question_keys")
            .select("question_id, accepted_answers").in_("question_id", qids).execute().data or [])} if qids else {}

    db = v2db()
    db.table("attempt_sections").upsert([
        {"attempt_id": attempt["id"], "section_id": s["id"], "test_id": attempt["test_id"],
         "started_at": attempt["started_at"], "finished_at": submitted_at} for s in sections
    ], on_conflict="attempt_id,section_id").execute()

    rows, raw = [], 0
    for section_id, group, q in questions:
        given = answers.get(q["id"], answers.get(str(q["number"])))
        text = ",".join(map(str, given)) if isinstance(given, list) else (str(given) if given is not None else None)
        ok = is_correct(given, keys.get(q["id"]) or [], group.get("max_words"))
        raw += ok
        rows.append({"attempt_id": attempt["id"], "question_id": q["id"], "section_id": section_id,
                     "answer": text, "is_correct": ok, "updated_at": submitted_at})
    if rows:
        db.table("answers").upsert(rows, on_conflict="attempt_id,question_id").execute()

    count = len(questions)
    band = lookup_band(attempt["skill"], raw) if count == 40 else None
    updated = db.table("attempts").update({
        "status": "scored", "raw_score": raw, "question_count": count, "lr_band": band,
    }).eq("id", attempt["id"]).execute().data[0]
    return _result(updated, time_spent)
