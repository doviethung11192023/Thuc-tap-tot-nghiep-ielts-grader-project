"""
Kết quả Speaking cho Learner (UC-11). Điểm AI luôn là ước lượng (NFR-06).

/summary được poll khi đang chấm nên không ký URL; audio chỉ có ở /detail, bằng URL ngắn hạn,
và chỉ của chính chủ bài vì endpoint đã kiểm quyền.
"""
from typing import Any, Optional

from app.db.supabase import db
from app.services.r2_storage import r2_storage
from app.services.speaking.speaking_grading_service import CRITERION_CODES, load_answers
from app.services.speaking.speaking_test_content import speaking_part, speaking_part_number

GRADING_STATES = ("submitted", "grading")
AUDIO_URL_SECONDS = 600
_CODE_ORDER = {code: index for index, code in enumerate(CRITERION_CODES.values())}


def _load_evaluations(attempt_id: str) -> tuple[Optional[dict[str, Any]], Optional[dict[str, Any]], Optional[dict[str, Any]]]:
    """Trả về (evaluation đang áp dụng, AI evaluation mới nhất, Expert evaluation chính thức nếu có)."""
    rows = db().table("evaluations").select("id, evaluator_type, status, overall_band, is_official, feedback, created_at") \
        .eq("attempt_id", attempt_id).order("created_at", desc=True).execute().data or []
    official = next((row for row in rows if row.get("is_official") and row.get("status") == "done"), None)
    ai_eval = next((row for row in rows if row.get("evaluator_type") == "ai" and row.get("status") == "done"), None)
    expert_eval = next((row for row in rows if row.get("evaluator_type") == "expert" and row.get("status") == "done"), None)
    current = official or ai_eval or next((row for row in rows if row.get("evaluator_type") == "ai"), rows[0] if rows else None)
    return current, ai_eval, expert_eval


def _current_evaluation(attempt_id: str) -> Optional[dict[str, Any]]:
    return _load_evaluations(attempt_id)[0]


def _ai_evaluation_id(attempt_id: str) -> Optional[str]:
    rows = db().table("evaluations").select("id, status").eq("attempt_id", attempt_id) \
        .eq("evaluator_type", "ai").eq("status", "done").order("created_at", desc=True).limit(1).execute().data or []
    return rows[0]["id"] if rows else None


def _criteria(evaluation_id: str) -> list[dict[str, Any]]:
    rows = db().table("criterion_scores").select("band, comment, criteria(code, name)") \
        .eq("evaluation_id", evaluation_id).execute().data or []
    items = [{"code": r["criteria"]["code"], "name": r["criteria"]["name"], "band": float(r["band"]),
              "comment": r.get("comment")} for r in rows if r.get("criteria")]
    return sorted(items, key=lambda item: _CODE_ORDER.get(item["code"], 99))


def _run_output(attempt_id: str, evaluation: Optional[dict[str, Any]]) -> dict[str, Any]:
    if not evaluation:
        return {}
    eval_id = evaluation["id"] if evaluation.get("evaluator_type") == "ai" else _ai_evaluation_id(attempt_id)
    if not eval_id:
        return {}
    rows = db().table("grading_runs").select("output").eq("evaluation_id", eval_id).order("started_at", desc=True).limit(1).execute().data or []
    return (rows[0].get("output") if rows else None) or {}


def _review_request_meta(attempt_id: str) -> tuple[Optional[str], Optional[str]]:
    try:
        rows = db().table("review_requests").select("status").eq("attempt_id", attempt_id).limit(1).execute().data or []
        if not rows:
            return None, None
        st = rows[0].get("status")
        due_at = None
        if st in ("waiting", "assigned"):
            asgns = (
                db().table("review_assignments")
                .select("due_at, ended_at")
                .eq("attempt_id", attempt_id)
                .is_("ended_at", "null")
                .limit(1)
                .execute()
                .data
                or []
            )
            due_at = asgns[0].get("due_at") if asgns else None
        return st, due_at
    except Exception:
        return None, None


def _expert_review_status(attempt_id: str) -> Optional[str]:
    return _review_request_meta(attempt_id)[0]


def _speaking_test_prompts(test_id: str) -> list[dict[str, Any]]:
    rows = db().table("sections").select(
        "id, order_no, title, speaking_parts(topic, speaking_questions(id, order_no, prompt))"
    ).eq("test_id", test_id).order("order_no").execute().data or []
    sections = []
    for s in rows:
        part = speaking_part(s)
        part_no = speaking_part_number(s)
        qs = sorted(part.get("speaking_questions") or [], key=lambda q: q["order_no"])
        sections.append({
            "part_number": part_no,
            "title": s.get("title") or f"Part {part_no}",
            "questions": [{"id": q["id"], "order_no": q["order_no"], "prompt": q["prompt"]} for q in qs],
        })
    return sorted(sections, key=lambda x: x["part_number"])


def build_speaking_summary(attempt: dict[str, Any]) -> dict[str, Any]:
    title = db().table("tests").select("title").eq("id", attempt["test_id"]).execute().data
    evaluation, ai_eval, expert_eval = _load_evaluations(attempt["id"])
    done = bool(evaluation and evaluation["status"] == "done")
    output = _run_output(attempt["id"], evaluation) if done else {}
    cur_criteria = _criteria(evaluation["id"]) if done else []
    rev_status, rev_due_at = _review_request_meta(attempt["id"])
    ai_payload = (
        {
            "overall_band": float(ai_eval["overall_band"]),
            "criteria": _criteria(ai_eval["id"]) if ai_eval["id"] != (evaluation or {}).get("id") else cur_criteria,
            "feedback": ai_eval.get("feedback"),
        }
        if ai_eval and ai_eval.get("overall_band") is not None
        else None
    )
    expert_payload = (
        {
            "overall_band": float(expert_eval["overall_band"]),
            "criteria": _criteria(expert_eval["id"]) if expert_eval["id"] != (evaluation or {}).get("id") else cur_criteria,
            "feedback": expert_eval.get("feedback"),
        }
        if expert_eval and expert_eval.get("overall_band") is not None
        else None
    )
    return {
        "attempt_id": attempt["id"], "test_id": attempt["test_id"],
        "title": (title[0]["title"] if title else None) or "IELTS Speaking Test", "skill": "speaking",
        "mode": attempt["mode"], "status": attempt["status"],
        "overall_band": float(evaluation["overall_band"]) if done and evaluation.get("overall_band") is not None else None,
        "evaluator_type": evaluation.get("evaluator_type") if done else None,
        "expert_review_status": rev_status,
        "expert_review_due_at": rev_due_at,
        "ai_evaluation": ai_payload,
        "expert_review": expert_payload,
        "correct_count": 0, "total_questions": 0,
        "submitted_at": attempt.get("submitted_at") or attempt.get("started_at"), "task_formats_result": [],
        "test_sections": _speaking_test_prompts(attempt["test_id"]),
        "speaking": {
            "grading_done": attempt["status"] not in GRADING_STATES,
            "criteria": cur_criteria,
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


def _annotations_by_response(evaluation_id: str) -> dict[str, list[dict[str, Any]]]:
    try:
        rows = db().table("annotations").select(
            "id, response_id, type, category, title, original_text, corrected_text, explanation, start_ms, end_ms"
        ).eq("evaluation_id", evaluation_id).order("start_ms").execute().data or []
    except Exception:
        return {}
    grouped: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        if row.get("response_id"):
            grouped.setdefault(row["response_id"], []).append(row)
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
    output = _run_output(attempt["id"], evaluation) if done else {}
    ann_map = _annotations_by_response(evaluation["id"]) if done and evaluation else {}
    items = []
    for answer in answers:
        response = response_by_id.get(answer["response_id"]) or {}
        audio_available = not response.get("audio_deleted_at") and r2_storage.private_bucket_configured
        items.append({
            "response_id": answer["response_id"], "part": answer["part"], "question": answer["question"],
            "transcript": response.get("transcript"), "duration_ms": answer["duration_ms"],
            "metrics": metrics.get(answer["response_id"], {}),
            "annotations": ann_map.get(answer["response_id"], []),
            "audio_url": r2_storage.presign_private_get(answer["audio_key"], AUDIO_URL_SECONDS) if audio_available else None,
        })
    return {**summary, "answers": items, "parts": output.get("parts"), "criteria_detail": _criterion_details(output)}
