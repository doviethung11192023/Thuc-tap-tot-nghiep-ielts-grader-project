"""Tổng hợp evaluation Speaking sau lượt chấm: band = trung bình FC, LR, GRA, P (BR-05)."""
from app.db.supabase import db
from app.services.practice.ai_evaluation_outcome import fail_ai_evaluation, publish_ai_evaluation
from app.services.writing.writing_bands import task_band

CRITERIA_COUNT = 4


def finalize_speaking_evaluation(evaluation_id: str) -> None:
    conn = db()
    evaluation = conn.table("evaluations").select("id, attempt_id, status").eq("id", evaluation_id).execute().data[0]
    if evaluation["status"] in ("done", "failed"):   # no_speech đã kết thúc evaluation ở bước trước
        return
    attempt_id = evaluation["attempt_id"]
    runs = conn.table("grading_runs").select("status").eq("evaluation_id", evaluation_id).execute().data or []
    if not runs or any(r["status"] == "running" for r in runs):
        return
    scores = conn.table("criterion_scores").select("band").eq("evaluation_id", evaluation_id).execute().data or []
    if any(r["status"] == "failed" for r in runs) or len(scores) != CRITERIA_COUNT:
        fail_ai_evaluation(evaluation_id, attempt_id)
        print(f"❌ [Worker] speaking attempt {attempt_id} -> grading_failed")
        return
    band = task_band([float(s["band"]) for s in scores])
    publish_ai_evaluation(evaluation_id, attempt_id, band)
    print(f"✅ [Worker] speaking attempt {attempt_id} -> scored (band {band})")
