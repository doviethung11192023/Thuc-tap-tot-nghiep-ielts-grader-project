"""
Kết quả Writing cho trang tổng kết và trang chi tiết essay:
- GET /test-practice/attempts/{id}/summary  (WritingSummaryResult, useWritingAttemptSummary)
- GET /essays/{essay_id}/results            (trang /results/{essayId}, lib/adapters.ts)
"""
from typing import Any, Optional

from app.db.supabase import db
from app.services.writing.writing_bands import task_band

RUN_TO_ESSAY_STATUS = {"running": "evaluating", "done": "completed", "failed": "failed"}
CODE_TO_SCORE_KEY = {"TA": "task_response", "TR": "task_response", "CC": "coherence_cohesion",
                     "LR": "lexical_resource", "GRA": "grammatical_range_and_accuracy"}


def _current_evaluation(attempt_id: str) -> Optional[dict[str, Any]]:
    """Bản chính thức nếu có, nếu không thì bản AI mới nhất."""
    rows = db().table("evaluations").select("id, status, overall_band, is_official, evaluator_type, created_at") \
        .eq("attempt_id", attempt_id).order("created_at", desc=True).execute().data or []
    return next((e for e in rows if e["is_official"]), None) or next(
        (e for e in rows if e["evaluator_type"] == "ai"), None)


def _task_scores(evaluation_id: str) -> dict[int, dict[str, float]]:
    rows = db().table("criterion_scores").select("task_no, band, criteria(code)") \
        .eq("evaluation_id", evaluation_id).execute().data or []
    out: dict[int, dict[str, float]] = {}
    for r in rows:
        out.setdefault(r["task_no"], {})[CODE_TO_SCORE_KEY[r["criteria"]["code"]]] = float(r["band"])
    for scores in out.values():
        if len(scores) == 4:
            scores["overall_band"] = task_band(list(scores.values()))
    return out


def _runs(evaluation_id: str) -> dict[int, dict[str, Any]]:
    rows = db().table("grading_runs").select("task_no, status, output, finished_at") \
        .eq("evaluation_id", evaluation_id).order("started_at").execute().data or []
    return {r["task_no"]: r for r in rows}


def _feedback(output: dict, key: str, limit: int = 2) -> list[str]:
    items = []
    for crit in (output.get("criteria_analysis") or {}).values():
        crit = crit or {}
        source = crit.get("feedback") if isinstance(crit.get("feedback"), dict) else crit   # AI: {feedback: {strengths: [...]}}
        items += [s.strip() for s in source.get(key) or [] if isinstance(s, str) and s.strip()]
    return items[:limit]


def _essays_with_task(attempt_id: str) -> list[dict[str, Any]]:
    rows = db().table("essays").select("id, content, word_count, updated_at, writing_tasks(task_type)") \
        .eq("attempt_id", attempt_id).execute().data or []
    for e in rows:
        e["task_no"] = 1 if (e.get("writing_tasks") or {}).get("task_type") == "task1" else 2
    return sorted(rows, key=lambda e: e["task_no"])


def build_attempt_summary(attempt: dict[str, Any]) -> dict[str, Any]:
    test = db().table("tests").select("title").eq("id", attempt["test_id"]).execute().data
    evaluation = _current_evaluation(attempt["id"])
    scores = _task_scores(evaluation["id"]) if evaluation else {}
    runs = _runs(evaluation["id"]) if evaluation else {}
    tasks = []
    for e in _essays_with_task(attempt["id"]):
        run = runs.get(e["task_no"]) or {}
        output = run.get("output") or {}
        tasks.append({
            "task": f"task{e['task_no']}", "essay_id": e["id"],
            "status": RUN_TO_ESSAY_STATUS.get(run.get("status"), "pending"),
            "word_count": e.get("word_count") or 0,
            "scores": scores.get(e["task_no"]) if run.get("status") == "done" else None,
            "task_subtype": output.get("task_subtype"),
            "strengths": _feedback(output, "strengths"),
            "areas_to_improve": _feedback(output, "areas_to_improve"),
        })
    done = bool(tasks) and evaluation is not None and evaluation["status"] in ("done", "failed")
    return {
        "attempt_id": attempt["id"], "test_id": attempt["test_id"],
        "title": (test[0]["title"] if test else None) or "IELTS Practice Test",
        "skill": "writing", "mode": attempt["mode"],
        "status": attempt["status"],
        "overall_band": float((evaluation or {}).get("overall_band") or 0.0) if done else 0.0,
        "correct_count": 0, "total_questions": 0,
        "submitted_at": attempt.get("submitted_at") or attempt.get("started_at"),
        "task_formats_result": [],
        "writing": {"grading_done": done, "tasks": tasks},
    }


def build_essay_result(essay_id: str, user_id: str, is_admin: bool) -> Optional[dict[str, Any]]:
    """None khi không có essay hoặc người xem không phải chủ (API trả 404)."""
    rows = db().table("essays").select("id, attempt_id, content, word_count, updated_at, writing_tasks(task_type)") \
        .eq("id", essay_id).execute().data
    if not rows:
        return None
    essay = rows[0]
    owner = db().table("attempts").select("learner_id").eq("id", essay["attempt_id"]).execute().data
    if not is_admin and (not owner or str(owner[0]["learner_id"]) != str(user_id)):
        return None
    task_no = 1 if (essay.get("writing_tasks") or {}).get("task_type") == "task1" else 2
    evaluation = _current_evaluation(essay["attempt_id"])
    run = (_runs(evaluation["id"]) if evaluation else {}).get(task_no) or {}
    scores = (_task_scores(evaluation["id"]) if evaluation else {}).get(task_no) or {}
    status = RUN_TO_ESSAY_STATUS.get(run.get("status"), "pending")

    result, annotations = None, []
    if status == "completed" and len(scores) == 5:
        output = run.get("output") or {}
        analysis = output.get("criteria_analysis") or {}
        result = {
            "overall_band": scores["overall_band"],
            "task_response_score": scores["task_response"],
            "coherence_cohesion_score": scores["coherence_cohesion"],
            "lexical_resource_score": scores["lexical_resource"],
            "grammar_accuracy_score": scores["grammatical_range_and_accuracy"],
            "overall_upgraded_essay": output.get("overall_upgraded_essay"),
            "criteria_analysis": {**analysis, "grammar_accuracy": analysis.get("grammatical_range_and_accuracy", {})},
            "is_score_overridden": False,
        }
        ann_rows = db().table("annotations").select("*").eq("evaluation_id", evaluation["id"]) \
            .eq("essay_id", essay_id).order("start_pos").execute().data or []
        annotations = [{
            "id": a["id"], "type": a["type"], "category": "TR" if a["category"] == "TA" else a["category"],
            "title": a.get("title") or "", "original_text": a["original_text"],
            "corrected_text": a.get("corrected_text"), "explanation": a["explanation"], "recommendation": None,
            "position_start": a["start_pos"], "position_end": a["end_pos"],
        } for a in ann_rows]

    return {
        "essay": {"id": essay["id"], "content": essay["content"], "word_count": essay.get("word_count") or 0,
                  "status": status, "evaluated_at": run.get("finished_at")},
        "result": result,
        "inline_annotations": annotations,
        "trace_info": None,
    }
