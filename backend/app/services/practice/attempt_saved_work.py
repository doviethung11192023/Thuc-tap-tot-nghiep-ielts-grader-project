"""
Bài làm lưu trên server trong lúc làm bài (FR-11, NFR-03; spec 004).

- save_work: trình duyệt gửi định kỳ; L/R ghi vào answers (chưa có is_correct), Writing ghi vào essays.
  DB (save_lr_answers, save_writing_essays) khoá attempt và từ chối khi đã nộp hoặc quá deadline + 30 s.
- load_saved_work: trả bài đã lưu để mở lại trên máy bất kỳ.
- saved_lr_answers: đáp án đã lưu để chấm khi tự nộp hoặc nộp muộn (BR-21: làm bao nhiêu chấm bấy nhiêu).

Đáp án nhiều lựa chọn (list) lưu dạng JSON để khôi phục đúng kiểu; lúc nộp, submit_lr ghi lại dạng chuẩn.
"""
import json
from functools import lru_cache
from typing import Any, Optional

from app.core.domain_errors import ConflictError, InvalidRequestError
from app.db.supabase import db
from app.services.listening_reading.lr_test_content import load_lr_test, lr_part
from app.services.practice.practice_attempt_lifecycle import past_deadline
from app.services.writing.writing_test_content import load_writing_task_sections

MAX_ESSAY_CHARS = 20000     # ~3.000 từ: chặn request quá cỡ (spec 004 FR-020)


def _encode(value: Any) -> Optional[str]:
    if value is None:
        return None
    return json.dumps(value) if isinstance(value, list) else str(value)


def _decode(text: Optional[str]) -> Any:
    if text and text.startswith("["):
        try:
            value = json.loads(text)
            if isinstance(value, list):
                return value
        except ValueError:
            pass
    return text


@lru_cache(maxsize=512)
def _lr_questions(test_id: str) -> tuple[tuple[str, str, int], ...]:
    """((section_id, question_id, số câu), ...) của cả đề. Tự lưu gọi mỗi vài giây cho mỗi Learner nên
    cache trong tiến trình: chỉ đề đã publish mới có attempt, và nội dung đề đã publish không đổi (BR-10)."""
    test = load_lr_test(test_id) or {}
    return tuple((s["id"], q["id"], q["number"]) for s in test.get("sections") or []
                 for g in (lr_part(s).get("question_groups") or []) for q in g.get("questions") or [])


def _run_save(function: str, params: dict[str, Any]) -> str:
    try:
        return db().rpc(function, params).execute().data
    except Exception as e:      # lỗi do DB raise: attempt đã đóng / quá hạn (nộp ở tab khác, cron tự nộp)
        message = str(e)
        if "deadline_passed" in message:
            raise ConflictError("Đã quá thời gian làm bài")
        if "attempt_closed" in message:
            raise ConflictError("Bài thi đã được nộp")
        raise


def save_work(attempt: dict[str, Any], answers: Optional[dict[str, Any]],
              task1_text: Optional[str], task2_text: Optional[str]) -> str:
    if attempt["status"] != "in_progress":
        raise ConflictError("Bài thi đã được nộp")
    if past_deadline(attempt):
        raise ConflictError("Đã quá thời gian làm bài")

    if attempt["skill"] in ("listening", "reading"):
        given = answers or {}
        rows = [{"question_id": qid, "section_id": section_id,
                 "answer": _encode(given.get(qid, given.get(str(number))))}
                for section_id, qid, number in _lr_questions(attempt["test_id"])
                if qid in given or str(number) in given]
        if not rows:
            return attempt["started_at"]
        return _run_save("save_lr_answers", {"p_attempt_id": attempt["id"], "p_answers": rows})

    if attempt["skill"] == "writing":
        sections = load_writing_task_sections(attempt["test_id"])
        tasks = [{"section_id": sections[no], "content": text}
                 for no, text in ((1, task1_text), (2, task2_text)) if text is not None and no in sections]
        if any(len(t["content"]) > MAX_ESSAY_CHARS for t in tasks):
            raise InvalidRequestError("Bài viết quá dài")
        if not tasks:
            return attempt["started_at"]
        return _run_save("save_writing_essays", {"p_attempt_id": attempt["id"], "p_tasks": tasks})

    raise InvalidRequestError("Speaking lưu từng câu trả lời khi upload")


def saved_lr_answers(attempt_id: str) -> dict[str, Any]:
    """{question_id: câu trả lời} đã lưu."""
    rows = db().table("answers").select("question_id, answer").eq("attempt_id", attempt_id).execute().data or []
    return {r["question_id"]: _decode(r["answer"]) for r in rows if r.get("answer") not in (None, "")}


def load_saved_work(attempt: dict[str, Any]) -> dict[str, Any]:
    """L/R: {"answers": {số câu: câu trả lời}}; Writing: {"essays": {"1": ..., "2": ...}}."""
    if attempt["skill"] in ("listening", "reading"):
        saved = saved_lr_answers(attempt["id"])
        if not saved:
            return {}
        rows = db().table("questions").select("id, number").in_("id", list(saved)).execute().data or []
        return {"answers": {str(r["number"]): saved[r["id"]] for r in rows}}
    if attempt["skill"] == "writing":
        rows = db().table("essays").select("content, writing_tasks(task_type)") \
            .eq("attempt_id", attempt["id"]).execute().data or []
        essays = {("1" if (r.get("writing_tasks") or {}).get("task_type") == "task1" else "2"): r["content"]
                  for r in rows}
        return {"essays": essays} if essays else {}
    return {}
