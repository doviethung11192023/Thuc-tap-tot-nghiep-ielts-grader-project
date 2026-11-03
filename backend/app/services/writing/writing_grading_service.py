"""
Worker chấm 1 task Writing (SD-02 bước 14–21).

grading_run (đã tạo lúc nộp, status running) → gọi AI engine → criterion_scores (4 tiêu chí),
annotations, grading_runs.output → tổng hợp evaluation khi mọi task xong.
"""
import time
from datetime import datetime, timezone
from typing import Any

from app.db.supabase import db
from app.services.writing.writing_bands import to_half_band
from app.services.writing.writing_evaluation_finalizer import finalize_writing_evaluation
from app.services.writing.writing_test_content import chart_image_url
from app.services.writing.annotation_alignment import align_annotation_coordinates
from app.worker.ai_engine_client import call_ai_grade

ANNOTATION_TYPES = {"error", "upgrade", "logic_issue", "strength"}
# Khoá điểm trong JSON AI engine → mã tiêu chí (TA cho Task 1, TR cho Task 2)
SCORE_KEYS = (
    ("task_response", "TASK", ("task_response",)),
    ("coherence_cohesion", "CC", ("coherence_cohesion",)),
    ("lexical_resource", "LR", ("lexical_resource",)),
    ("grammatical_range_and_accuracy", "GRA", ("grammatical_range_and_accuracy", "grammar_accuracy")),
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _criteria_ids() -> dict[str, str]:
    rows = db().table("criteria").select("id, code").eq("skill", "writing").execute().data or []
    return {r["code"]: r["id"] for r in rows}


def _comment(analysis: Any) -> str | None:
    """strengths / areas_to_improve của AI → 1 đoạn nhận xét cho criterion_scores.comment."""
    if not isinstance(analysis, dict):
        return None
    if isinstance(analysis.get("feedback"), dict):        # AI engine: {feedback: {strengths, areas_to_improve}}
        analysis = analysis["feedback"]
    parts = []
    for label, key in (("Strengths", "strengths"), ("To improve", "areas_to_improve")):
        items = [s.strip() for s in analysis.get(key) or [] if isinstance(s, str) and s.strip()]
        if items:
            parts.append(f"{label}: " + "; ".join(items))
    return "\n".join(parts) or None


def _load_task(essay_id: str) -> dict[str, Any]:
    essay = db().table("essays").select("id, attempt_id, content, section_id").eq("id", essay_id).execute().data[0]
    task = db().table("writing_tasks").select("task_prompt, chart_image_key") \
        .eq("section_id", essay["section_id"]).execute().data[0]
    return {**essay, **task}


def _store_scores(evaluation_id: str, task_no: int, ai: dict[str, Any]) -> None:
    ids = _criteria_ids()
    scores, analysis = ai.get("scores") or {}, ai.get("criteria_analysis") or {}
    rows = []
    for score_key, code, analysis_keys in SCORE_KEYS:
        band = to_half_band(scores.get(score_key))
        if band is None:
            raise ValueError(f"AI response missing score '{score_key}'")
        code = ("TA" if task_no == 1 else "TR") if code == "TASK" else code
        comment = next((_comment(analysis.get(k)) for k in analysis_keys if analysis.get(k)), None)
        rows.append({"evaluation_id": evaluation_id, "criterion_id": ids[code], "task_no": task_no,
                     "skill": "writing", "band": band, "comment": comment})
    db().table("criterion_scores").upsert(rows, on_conflict="evaluation_id,criterion_id,task_no").execute()


def _store_annotations(evaluation_id: str, essay: dict[str, Any], task_no: int, ai: dict[str, Any]) -> int:
    content = essay["content"] or ""
    rows = []
    for ann in ai.get("inline_annotations") or []:
        original = (ann.get("original_text") or "").strip()
        category = str(ann.get("category") or "").upper()
        if category in ("TR", "TA"):
            category = "TA" if task_no == 1 else "TR"
        if not original or category not in ("TA", "TR", "CC", "LR", "GRA"):
            continue
        start, end = align_annotation_coordinates(content, original, int(ann.get("position_start") or 0))
        if start < 0 or end < start:
            continue
        rows.append({
            "evaluation_id": evaluation_id, "attempt_id": essay["attempt_id"], "essay_id": essay["id"],
            "type": ann.get("type") if ann.get("type") in ANNOTATION_TYPES else "error",
            "category": category, "title": ann.get("title") or None, "original_text": original,
            "corrected_text": ann.get("corrected_text") or None,
            "explanation": ann.get("explanation") or ann.get("title") or "-",
            "start_pos": start, "end_pos": end,
        })
    db().table("annotations").delete().eq("evaluation_id", evaluation_id).eq("essay_id", essay["id"]).execute()
    if rows:
        db().table("annotations").insert(rows).execute()
    return len(rows)


async def grade_writing_task(ctx, evaluation_id: str, run_id: str, essay_id: str, task_no: int):
    """Background job: chấm 1 essay; lỗi được ghi vào grading_runs.error (FR-30)."""
    print(f"🔧 [Worker] evaluation={evaluation_id} task={task_no} essay={essay_id}")
    started = time.monotonic()
    try:
        essay = _load_task(essay_id)
        ai = await call_ai_grade(essay["task_prompt"], essay["content"], task_no,
                                 chart_image_url(essay.get("chart_image_key")))
        _store_scores(evaluation_id, task_no, ai)
        n_ann = _store_annotations(evaluation_id, essay, task_no, ai)
        db().table("grading_runs").update({
            "status": "done", "output": ai, "finished_at": _now_iso(),
            "latency_ms": int((time.monotonic() - started) * 1000),
        }).eq("id", run_id).execute()
        print(f"✅ [Worker] task {task_no} done ({n_ann} annotations)")
    except Exception as e:
        print(f"❌ [Worker] task {task_no} failed: {e}")
        db().table("grading_runs").update({
            "status": "failed", "error": str(e)[:2000], "finished_at": _now_iso(),
            "latency_ms": int((time.monotonic() - started) * 1000),
        }).eq("id", run_id).execute()
    finally:
        try:
            finalize_writing_evaluation(evaluation_id)
        except Exception as e:
            print(f"⚠️ [Worker] finalize {evaluation_id} failed: {e}")
