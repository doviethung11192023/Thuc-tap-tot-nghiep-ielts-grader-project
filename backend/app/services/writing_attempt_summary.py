"""
Writing block for GET /test-practice/attempts/{id}/summary.

One essay row exists per submitted task (see submissions_ai.submit_writing_attempt).
The essays table has no task column, so the task comes from the AI result
(raw_ai_response.task_type) once graded, otherwise from submission order
(Task 1 is inserted before Task 2).
"""
from __future__ import annotations

from typing import Any

from app.db.supabase import supabase

_PENDING = ("pending", "evaluating")


def _feedback_lines(raw: dict, key: str, limit: int = 2) -> list[str]:
    """First `limit` strengths / areas_to_improve across the four criteria."""
    out: list[str] = []
    for crit in (raw.get("criteria_analysis") or {}).values():
        for item in ((crit or {}).get("feedback") or {}).get(key) or []:
            if isinstance(item, str) and item.strip():
                out.append(item.strip())
    return out[:limit]


def build_writing_summary(attempt_id: str) -> dict[str, Any]:
    essays = (
        supabase.table("essays")
        .select("id, status, word_count, submitted_at")
        .eq("attempt_id", attempt_id)
        .order("submitted_at")
        .execute()
        .data
        or []
    )
    results = {}
    if essays:
        rows = (
            supabase.table("evaluation_results")
            .select("essay_id, overall_band, raw_ai_response")
            .in_("essay_id", [e["id"] for e in essays])
            .execute()
            .data
            or []
        )
        results = {r["essay_id"]: r for r in rows}

    tasks = []
    for idx, essay in enumerate(essays):
        raw = (results.get(essay["id"]) or {}).get("raw_ai_response") or {}
        fallback_task = f"task{idx + 1}" if len(essays) == 2 else "task2"
        tasks.append({
            "task": raw.get("task_type") or fallback_task,
            "essay_id": essay["id"],
            "status": essay["status"],
            "word_count": essay.get("word_count") or 0,
            "scores": raw.get("scores"),
            "task_subtype": raw.get("task_subtype"),
            "strengths": _feedback_lines(raw, "strengths"),
            "areas_to_improve": _feedback_lines(raw, "areas_to_improve"),
        })
    tasks.sort(key=lambda t: t["task"])
    return {
        "grading_done": bool(tasks) and all(t["status"] not in _PENDING for t in tasks),
        "tasks": tasks,
    }
