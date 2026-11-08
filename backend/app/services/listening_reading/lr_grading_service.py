"""
Nộp và chấm Listening/Reading (SD-04): chấm ngay trong request.

- Section được chấm: các part đã chọn (req.parts theo order_no), mặc định cả đề.
- Mọi câu trong các section đó được lưu vào answers (câu bỏ trống = sai).
- Band chỉ khi bài phủ đủ 40 câu (BR-03, ADR-19); làm lẻ thì chỉ có "x / y câu đúng".
- Nộp lần 2 trả lại kết quả lần đầu (SD-04: double submission returns the first result).
- Quá deadline + 30 s (tự nộp hoặc nộp muộn): chấm đáp án đã lưu trên server, bỏ qua đáp án client gửi
  (BR-21). Điểm thô, số câu và band do DB tính lại từ các dòng đã ghi.
"""
from typing import Any, Optional

from app.core.domain_errors import InvalidRequestError, NotFoundError

from app.services.listening_reading.lr_answer_matching import is_correct
from app.services.listening_reading.lr_test_content import load_lr_test, lr_part
from app.db.supabase import db
from app.services.practice.attempt_saved_work import saved_lr_answers
from app.services.practice.practice_attempt_lifecycle import past_deadline, require_submitted


def lookup_band(skill: str, raw_score: int) -> Optional[float]:
    rows = db().table("band_conversions").select("band").eq("skill", skill) \
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
              time_spent: Optional[int] = None, auto: bool = False) -> dict[str, Any]:
    if attempt["status"] == "scored":
        return _result(attempt, time_spent)
    test = load_lr_test(attempt["test_id"])
    if not test:
        raise NotFoundError("Bài thi không tồn tại")
    sections = [s for s in test.get("sections") or [] if not parts or s["order_no"] in parts]
    if not sections:
        raise InvalidRequestError("Không có phần thi nào được chọn")

    late = auto or past_deadline(attempt)
    if late:
        answers = saved_lr_answers(attempt["id"])
    questions = [(s["id"], g, q) for s in sections for g in (lr_part(s).get("question_groups") or [])
                 for q in g.get("questions") or []]
    qids = [q["id"] for _, _, q in questions]
    keys = {r["question_id"]: r["accepted_answers"] for r in (db().table("question_keys")
            .select("question_id, accepted_answers").in_("question_id", qids).execute().data or [])} if qids else {}

    rows, raw = [], 0
    for section_id, group, q in questions:
        given = answers.get(q["id"], answers.get(str(q["number"])))
        text = ",".join(map(str, given)) if isinstance(given, list) else (str(given) if given is not None else None)
        ok = is_correct(given, keys.get(q["id"]) or [], group.get("max_words"))
        raw += ok
        rows.append({"question_id": q["id"], "section_id": section_id, "answer": text, "is_correct": ok})

    count = len(questions)
    band = lookup_band(attempt["skill"], raw) if count == 40 else None
    updated = require_submitted(db().rpc("submit_lr_attempt", {
        "p_attempt_id": attempt["id"], "p_section_ids": [s["id"] for s in sections], "p_answers": rows,
        "p_raw_score": raw, "p_question_count": count, "p_band": band, "p_auto": late,
    }).execute().data)
    return _result(updated, time_spent)
