"""
Dashboard hệ thống (UC-23, FR-29) và giám sát chấm AI (UC-24, FR-30: lượt chạy lỗi, độ trễ).

Bài viết = essays (bài Writing trong attempt) + free_essays (Chấm bài tự do).
Tỉ lệ lỗi AI và thời gian xử lý lấy từ grading_runs (NFR-05).
"""
from datetime import datetime, timedelta, timezone
from typing import Any

from app.db.supabase import db

RUN_STATUS_LABEL = {"done": "COMPLETED", "failed": "FAILED", "running": "RUNNING"}


def _count(table: str, **filters) -> int:
    q = db().table(table).select("id", count="exact")
    for col, (op, val) in filters.items():
        q = getattr(q, op)(col, val)
    res = q.limit(1).execute()
    return res.count or 0


def system_statistics() -> dict[str, Any]:
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    runs = db().table("grading_runs").select("status, latency_ms").execute().data or []
    finished = [r for r in runs if r["status"] in ("done", "failed")]
    failed = sum(1 for r in finished if r["status"] == "failed")
    latencies = [r["latency_ms"] for r in runs if r["status"] == "done" and r.get("latency_ms")]

    trend = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        n = db().table("attempts").select("id", count="exact").gte("submitted_at", day.isoformat()) \
            .lt("submitted_at", (day + timedelta(days=1)).isoformat()).limit(1).execute().count or 0
        trend.append({"date": day.strftime("%d/%m"), "count": n})

    essays_today = (db().table("attempts").select("id", count="exact").eq("skill", "writing")
                    .gte("submitted_at", today.isoformat()).limit(1).execute().count or 0) \
        + _count("free_essays", submitted_at=("gte", today.isoformat()))
    return {
        "total_users": _count("profiles"),
        "total_essays": _count("essays") + _count("free_essays"),
        "essays_today": essays_today,
        "ai_error_rate": round(failed / len(finished) * 100, 2) if finished else 0.0,
        "avg_processing_time": round(sum(latencies) / len(latencies) / 1000, 1) if latencies else 0.0,
        "submissions_trend": trend,
    }


def grading_run_logs(page: int, limit: int) -> dict[str, Any]:
    offset = (page - 1) * limit
    res = db().table("grading_runs").select(
        "id, task_no, status, model, trace_id, error, latency_ms, started_at, "
        "evaluations(attempt_id, attempts(learner_id, tests(title)))", count="exact"
    ).order("started_at", desc=True).range(offset, offset + limit - 1).execute()
    rows = res.data or []
    learner_ids = {((r.get("evaluations") or {}).get("attempts") or {}).get("learner_id") for r in rows} - {None}
    emails = {p["id"]: p["email"] for p in db().table("profiles").select("id, email")
              .in_("id", list(learner_ids)).execute().data or []} if learner_ids else {}
    items = []
    for r in rows:
        attempt = (r.get("evaluations") or {}).get("attempts") or {}
        items.append({
            "id": r["id"], "status": RUN_STATUS_LABEL.get(r["status"], r["status"]), "created_at": r["started_at"],
            "task_no": r.get("task_no"), "error_message": r.get("error"), "latency_ms": r.get("latency_ms"),
            "trace_id": r.get("trace_id"), "model": r.get("model"),
            "essay": {"user": {"email": emails.get(attempt.get("learner_id"))},
                      "topic": {"title": (attempt.get("tests") or {}).get("title")}},
        })
    return {"items": items, "total": res.count if getattr(res, "count", None) is not None else len(items)}
