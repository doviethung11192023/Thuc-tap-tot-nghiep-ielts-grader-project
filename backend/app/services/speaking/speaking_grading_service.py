"""
Chấm Speaking nền (SD-03): gửi URL ký ngắn hạn cho AI engine, lưu transcript, số đo, 4 điểm tiêu chí.

AI engine không truy cập DB và không giữ khoá R2 (ADR-01). Lỗi được ghi vào grading_runs.error (FR-30).
"""
import time
from datetime import datetime, timezone
from typing import Any

from app.db.supabase import db
from app.services.practice.ai_evaluation_outcome import fail_ai_evaluation
from app.services.r2_storage import r2_storage
from app.services.speaking.speaking_evaluation_finalizer import finalize_speaking_evaluation
from app.services.speaking.speaking_test_content import speaking_part_number
from app.services.writing.writing_bands import to_half_band
from app.clients.ai_engine_client import call_ai_grade_speaking

# Khoá trong JSON AI engine → mã tiêu chí trong bảng criteria
CRITERION_CODES = {"fc": "FC", "lr": "LR", "gra": "GRA", "pr": "P"}
AUDIO_URL_SECONDS = 1800    # đủ cho hàng đợi GPU, ngắn để hạn chế rủi ro lộ link


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_answers(attempt_id: str) -> list[dict[str, Any]]:
    """Câu đã confirm theo đúng thứ tự Part 1 → 3; chưa có URL audio."""
    conn = db()
    responses = conn.table("speaking_responses").select("id, audio_key, speaking_question_id, section_id, duration_ms") \
        .eq("attempt_id", attempt_id).not_.is_("confirmed_at", "null").execute().data or []
    if not responses:
        return []
    questions = conn.table("speaking_questions").select("id, order_no, prompt") \
        .in_("id", [r["speaking_question_id"] for r in responses]).execute().data or []
    sections = conn.table("sections").select("id, order_no, title") \
        .in_("id", list({r["section_id"] for r in responses})).execute().data or []
    question_by_id = {q["id"]: q for q in questions}
    part_by_section = {s["id"]: speaking_part_number(s) for s in sections}
    answers = [{
        "response_id": r["id"], "audio_key": r["audio_key"], "duration_ms": r.get("duration_ms"),
        "part": part_by_section[r["section_id"]], "question": question_by_id[r["speaking_question_id"]]["prompt"],
        "order_no": question_by_id[r["speaking_question_id"]]["order_no"],
    } for r in responses]
    return sorted(answers, key=lambda a: (a["part"], a["order_no"]))


def _request_answers(answers: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [{"response_id": a["response_id"], "part": a["part"], "question": a["question"],
             "duration_ms": a["duration_ms"],
             "audio_url": r2_storage.presign_private_get(a["audio_key"], AUDIO_URL_SECONDS)} for a in answers]


def _store_responses(result: dict[str, Any]) -> None:
    conn = db()
    for row in result.get("responses") or []:
        conn.table("speaking_responses").update({"transcript": row.get("transcript") or None}) \
            .eq("id", row["response_id"]).execute()
        metrics = [{"response_id": row["response_id"], "name": name, "value": value}
                   for name, value in (row.get("metrics") or {}).items() if isinstance(value, (int, float))]
        if metrics:
            conn.table("speech_metrics").upsert(metrics, on_conflict="response_id,name").execute()


def _store_scores(evaluation_id: str, result: dict[str, Any]) -> None:
    rows = db().table("criteria").select("id, code").eq("skill", "speaking").execute().data or []
    id_by_code = {row["code"]: row["id"] for row in rows}
    scores = []
    for key, code in CRITERION_CODES.items():
        item = (result.get("criteria") or {}).get(key) or {}
        band = to_half_band(item.get("band"))
        if band is None:
            raise ValueError(f"AI response missing score '{key}'")
        scores.append({"evaluation_id": evaluation_id, "criterion_id": id_by_code[code], "task_no": 0,
                       "skill": "speaking", "band": band, "comment": item.get("summary")})
    db().table("criterion_scores").upsert(scores, on_conflict="evaluation_id,criterion_id,task_no").execute()


async def grade_speaking_attempt(attempt_id: str, evaluation_id: str, run_id: str) -> None:
    print(f"🔧 [Worker] speaking attempt={attempt_id} evaluation={evaluation_id}")
    started = time.monotonic()
    try:
        answers = load_answers(attempt_id)
        title_rows = db().table("attempts").select("tests(title)").eq("id", attempt_id).execute().data
        title = ((title_rows[0].get("tests") or {}).get("title") if title_rows else None) or "IELTS Speaking Test"
        result = await call_ai_grade_speaking(title, _request_answers(answers))
        _store_responses(result)
        if result.get("no_speech"):
            fail_ai_evaluation(evaluation_id, attempt_id, "no_speech")   # mọi câu đều im lặng (ST_attempt)
        else:
            _store_scores(evaluation_id, result)
            summary = ((result.get("overall") or {}).get("overall_summary"))
            if summary:
                db().table("evaluations").update({"feedback": summary}).eq("id", evaluation_id).execute()
        db().table("grading_runs").update({
            "status": "done", "output": result, "model": result.get("model"),
            "prompt_versions": result.get("prompt_versions"), "finished_at": _now_iso(),
            "latency_ms": int((time.monotonic() - started) * 1000),
        }).eq("id", run_id).execute()
        print(f"✅ [Worker] speaking attempt {attempt_id} done")
    except Exception as e:
        print(f"❌ [Worker] speaking attempt {attempt_id} failed: {e}")
        db().table("grading_runs").update({
            "status": "failed", "error": str(e)[:2000], "finished_at": _now_iso(),
            "latency_ms": int((time.monotonic() - started) * 1000),
        }).eq("id", run_id).execute()
    finally:
        try:
            finalize_speaking_evaluation(evaluation_id)
        except Exception as e:
            print(f"⚠️ [Worker] finalize {evaluation_id} failed: {e}")
