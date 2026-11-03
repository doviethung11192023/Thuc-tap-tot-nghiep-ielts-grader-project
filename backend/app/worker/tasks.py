"""
Job nền của tính năng "Chấm bài tự do" (/exam, bảng topics + free_essays).

Tính năng này NẰM NGOÀI thiết kế 33 bảng (mọi bài viết trong thiết kế thuộc một attempt) và
đang chờ nhóm quyết định giữ/bỏ; logic giữ nguyên như cũ, chỉ đổi tên bảng essays → free_essays.
Chấm Writing theo attempt nằm ở app.services.writing.writing_grading_service.
"""
import os
import uuid
from datetime import datetime, timezone

from arq.connections import RedisSettings
from dotenv import load_dotenv

from app.db.supabase import db
from app.services.writing.annotation_alignment import align_annotation_coordinates
from app.worker.ai_engine_client import call_ai_grade

load_dotenv()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def evaluate_essay_task(ctx, essay_id: str, task_no: int | None = None):
    """Chấm 1 bài tự do: gọi AI engine → evaluation_results, essay_annotations, evaluation_logs."""
    print(f"🔧 [Free grading] essay {essay_id}")
    db().table("free_essays").update({"status": "evaluating"}).eq("id", essay_id).execute()
    rows = db().table("free_essays").select("content, topic_id").eq("id", essay_id).execute().data
    if not rows:
        return {"status": "failed", "error": "Essay not found"}
    content, topic_id = rows[0].get("content") or "", rows[0].get("topic_id")

    title = ""
    if topic_id:
        topic = db().table("topics").select("title").eq("id", topic_id).execute().data
        title = topic[0]["title"] if topic else ""

    try:
        ai = await call_ai_grade(title, content, None, None)
    except Exception as e:
        print(f"❌ [Free grading] {essay_id}: {e}")
        db().table("free_essays").update({"status": "failed"}).eq("id", essay_id).execute()
        db().table("evaluation_logs").insert({"essay_id": essay_id, "agent_name": "aggregator", "status": "failed",
                                              "error_message": str(e)[:2000]}).execute()
        return {"status": "failed", "error": str(e)}

    scores, raw_criteria = ai.get("scores") or {}, ai.get("criteria_analysis") or {}
    db().table("evaluation_results").upsert({
        "id": str(uuid.uuid4()), "essay_id": essay_id,
        "task_response_score": scores.get("task_response", 0),
        "coherence_cohesion_score": scores.get("coherence_cohesion", 0),
        "lexical_resource_score": scores.get("lexical_resource", 0),
        "grammar_accuracy_score": scores.get("grammatical_range_and_accuracy", 0),
        "overall_band": scores.get("overall_band", 0),
        "overall_upgraded_essay": ai.get("overall_upgraded_essay", ""),
        "criteria_analysis": {
            "task_response": raw_criteria.get("task_response", {}),
            "coherence_cohesion": raw_criteria.get("coherence_cohesion", {}),
            "lexical_resource": raw_criteria.get("lexical_resource", {}),
            "grammar_accuracy": raw_criteria.get("grammatical_range_and_accuracy", {}),
        },
        "raw_ai_response": ai,
    }, on_conflict="essay_id").execute()

    db().table("essay_annotations").delete().eq("essay_id", essay_id).execute()
    annotations = []
    for ann in ai.get("inline_annotations") or []:
        original = ann.get("original_text", "")
        start, end = align_annotation_coordinates(content, original, ann.get("position_start", 0))
        annotations.append({
            "essay_id": essay_id, "type": ann.get("type", "error"), "category": ann.get("category", "TR"),
            "title": ann.get("title", ""), "original_text": original, "corrected_text": ann.get("corrected_text", ""),
            "explanation": ann.get("explanation", ""), "recommendation": ann.get("recommendation", ""),
            "position_start": start, "position_end": end,
        })
    if annotations:
        db().table("essay_annotations").insert(annotations).execute()
    db().table("evaluation_logs").insert({"essay_id": essay_id, "agent_name": "aggregator", "status": "success"}).execute()
    db().table("free_essays").update({"status": "completed", "evaluated_at": _now_iso()}).eq("id", essay_id).execute()
    print(f"✅ [Free grading] essay {essay_id} completed")
    return {"status": "success", "essay_id": essay_id}


class WorkerSettings:
    functions = [evaluate_essay_task]
    redis_settings = RedisSettings.from_dsn(os.getenv("REDIS_URL", "redis://localhost:6379"))
