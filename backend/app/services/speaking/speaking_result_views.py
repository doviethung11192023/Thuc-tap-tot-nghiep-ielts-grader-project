"""
Kết quả Speaking cho Learner (UC-11). Điểm AI luôn là ước lượng (NFR-06).

/summary được poll khi đang chấm nên không ký URL; audio chỉ có ở /detail, bằng URL ngắn hạn,
và chỉ của chính chủ bài vì endpoint đã kiểm quyền.
"""
from typing import Any, Optional

from app.db.supabase import db
from app.services.r2_storage import r2_storage
from app.services.speaking.speaking_grading_service import CRITERION_CODES, load_answers

GRADING_STATES = ("submitted", "grading")
AUDIO_URL_SECONDS = 600
_CODE_ORDER = {code: index for index, code in enumerate(CRITERION_CODES.values())}


def _current_evaluation(attempt_id: str) -> Optional[dict[str, Any]]:
    """Bản chính thức nếu có; không thì lượt chấm mới nhất (để hiện trạng thái lỗi)."""
    rows = db().table("evaluations").select("id, status, overall_band, is_official, feedback, created_at") \
        .eq("attempt_id", attempt_id).eq("evaluator_type", "ai").order("created_at", desc=True).execute().data or []
    return next((row for row in rows if row.get("is_official")), rows[0] if rows else None)


def _criteria(evaluation_id: str) -> list[dict[str, Any]]:
    rows = db().table("criterion_scores").select("band, comment, criteria(code, name)") \
        .eq("evaluation_id", evaluation_id).execute().data or []
    items = [{"code": r["criteria"]["code"], "name": r["criteria"]["name"], "band": float(r["band"]),
              "comment": r.get("comment")} for r in rows if r.get("criteria")]
    return sorted(items, key=lambda item: _CODE_ORDER.get(item["code"], 99))


def _run_output(evaluation_id: str) -> dict[str, Any]:
    rows = db().table("grading_runs").select("output").eq("evaluation_id", evaluation_id).execute().data or []
    return (rows[0].get("output") if rows else None) or {}


def build_speaking_summary(attempt: dict[str, Any]) -> dict[str, Any]:
    title = db().table("tests").select("title").eq("id", attempt["test_id"]).execute().data
    evaluation = _current_evaluation(attempt["id"])
    done = bool(evaluation and evaluation["status"] == "done")
    output = _run_output(evaluation["id"]) if done else {}
    return {
        "attempt_id": attempt["id"], "test_id": attempt["test_id"],
        "title": (title[0]["title"] if title else None) or "IELTS Speaking Test", "skill": "speaking",
        "mode": attempt["mode"], "status": attempt["status"],
        "overall_band": float(evaluation["overall_band"]) if done and evaluation.get("overall_band") is not None else None,
        "correct_count": 0, "total_questions": 0,
        "submitted_at": attempt.get("submitted_at") or attempt.get("started_at"), "task_formats_result": [],
        "speaking": {
            "grading_done": attempt["status"] not in GRADING_STATES,
            "criteria": _criteria(evaluation["id"]) if done else [],
            "feedback": evaluation.get("feedback") if done else None,
            "overall": output.get("overall"),
            "pronunciation": output.get("pronunciation"),
            "speech_metrics": output.get("speech_metrics"),
        },
    }


def _criterion_details(output: dict[str, Any]) -> dict[str, Any]:
    criteria = output.get("criteria") or {}
    return {CRITERION_CODES[key]: value for key, value in criteria.items() if key in CRITERION_CODES}


def _metrics_by_response(response_ids: list[str]) -> dict[str, dict[str, float]]:
    if not response_ids:
        return {}
    rows = db().table("speech_metrics").select("response_id, name, value").in_("response_id", response_ids).execute().data or []
    grouped: dict[str, dict[str, float]] = {}
    for row in rows:
        grouped.setdefault(row["response_id"], {})[row["name"]] = float(row["value"])
    return grouped


def build_speaking_detail(attempt: dict[str, Any]) -> dict[str, Any]:
    summary = build_speaking_summary(attempt)
    answers = load_answers(attempt["id"])
    ids = [a["response_id"] for a in answers]
    rows = db().table("speaking_responses").select("id, transcript, audio_deleted_at").in_("id", ids).execute().data if ids else []
    response_by_id = {r["id"]: r for r in rows or []}
    metrics = _metrics_by_response(ids)
    evaluation = _current_evaluation(attempt["id"])
    done = bool(evaluation and evaluation["status"] == "done")
    output = _run_output(evaluation["id"]) if done else {}
    items = []
    for answer in answers:
        response = response_by_id.get(answer["response_id"]) or {}
        audio_available = not response.get("audio_deleted_at") and r2_storage.private_bucket_configured
        items.append({
            "response_id": answer["response_id"], "part": answer["part"], "question": answer["question"],
            "transcript": response.get("transcript"), "duration_ms": answer["duration_ms"],
            "metrics": metrics.get(answer["response_id"], {}),
            "audio_url": r2_storage.presign_private_get(answer["audio_key"], AUDIO_URL_SECONDS) if audio_available else None,
        })
    return {**summary, "answers": items, "parts": output.get("parts"), "criteria_detail": _criterion_details(output)}
