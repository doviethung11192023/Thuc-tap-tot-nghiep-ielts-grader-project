"""
Dashboard hệ thống (UC-23, FR-29) và giám sát chấm AI (UC-24, FR-30: lượt chạy lỗi, độ trễ).

Bài viết = essays (bài Writing trong attempt).
Tỉ lệ lỗi AI và thời gian xử lý lấy từ grading_runs (NFR-05).
"""
from datetime import datetime, timedelta, timezone
from typing import Any

from app.db.supabase import db
from app.services.admin.expert_kpi_service import get_expert_kpis

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

    start_day = today - timedelta(days=6)
    end_day = today + timedelta(days=1)
    recent_attempts = (
        db().table("attempts").select("submitted_at")
        .gte("submitted_at", start_day.isoformat())
        .lt("submitted_at", end_day.isoformat())
        .execute().data or []
    )
    day_counts: dict[str, int] = {}
    for row in recent_attempts:
        sub_at = row.get("submitted_at")
        if sub_at:
            key = str(sub_at)[:10]
            day_counts[key] = day_counts.get(key, 0) + 1

    trend = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        trend.append({"date": day.strftime("%d/%m"), "count": day_counts.get(day.strftime("%Y-%m-%d"), 0)})

    essays_today = (db().table("attempts").select("id", count="exact").eq("skill", "writing")
                    .gte("submitted_at", today.isoformat()).limit(1).execute().count or 0)
    return {
        "total_users": _count("profiles"),
        "total_essays": _count("essays"),
        "essays_today": essays_today,
        "ai_error_rate": round(failed / len(finished) * 100, 2) if finished else 0.0,
        "avg_processing_time": round(sum(latencies) / len(latencies) / 1000, 1) if latencies else 0.0,
        "submissions_trend": trend,
        "monthly_cohort_progression": _monthly_cohort_progression(),
        "expert_kpis": get_expert_kpis(),
    }


def _monthly_cohort_progression(months: int = 6) -> list[dict[str, Any]]:
    vn_tz = timezone(timedelta(hours=7))
    now_vn = datetime.now(vn_tz)
    cutoff = (now_vn.replace(day=1) - timedelta(days=months * 31)).isoformat()
    rows = (
        db()
        .table("attempt_results")
        .select("learner_id, band, submitted_at, status")
        .eq("status", "scored")
        .gte("submitted_at", cutoff)
        .execute()
        .data
        or []
    )
    buckets: dict[str, dict[str, Any]] = {}
    for i in range(months - 1, -1, -1):
        m_dt = (now_vn.replace(day=15) - timedelta(days=i * 30))
        ym = m_dt.strftime("%Y-%m")
        buckets[ym] = {"label": f"T{m_dt.month}/{str(m_dt.year)[2:]}", "bands": [], "learners": set()}
    for r in rows:
        sub_at = r.get("submitted_at")
        if not sub_at:
            continue
        try:
            dt = datetime.fromisoformat(str(sub_at).replace("Z", "+00:00"))
            ym = (dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt).astimezone(vn_tz).strftime("%Y-%m")
        except Exception:
            continue
        if ym in buckets:
            if r.get("band") is not None and float(r["band"]) > 0:
                buckets[ym]["bands"].append(float(r["band"]))
            if r.get("learner_id"):
                buckets[ym]["learners"].add(r["learner_id"])
    return [
        {
            "month": ym,
            "label": b["label"],
            "avg_band": round(sum(b["bands"]) / len(b["bands"]), 2) if b["bands"] else 0.0,
            "active_learners": len(b["learners"]),
            "total_attempts": len(b["bands"]),
        }
        for ym, b in sorted(buckets.items())
    ]


def grading_run_logs(page: int, limit: int, skill: str | None = None, run_status: str | None = None) -> dict[str, Any]:
    offset = (page - 1) * limit
    q = db().table("grading_runs").select(
        "id, task_no, status, model, trace_id, error, latency_ms, started_at, "
        "evaluations!inner(attempt_id, attempts!inner(skill, learner_id, tests(title)))", count="exact"
    )
    if skill in ("writing", "speaking"):
        q = q.eq("evaluations.attempts.skill", skill)
    if run_status in ("done", "failed", "running"):
        q = q.eq("status", run_status)
    res = q.order("started_at", desc=True).range(offset, offset + limit - 1).execute()
    rows = res.data or []
    learner_ids = {((r.get("evaluations") or {}).get("attempts") or {}).get("learner_id") for r in rows} - {None}
    emails = {p["id"]: p["email"] for p in db().table("profiles").select("id, email")
              .in_("id", list(learner_ids)).execute().data or []} if learner_ids else {}
    items = []
    for r in rows:
        eval_info = r.get("evaluations") or {}
        attempt = eval_info.get("attempts") or {}
        latency_ms = r.get("latency_ms")
        items.append({
            "id": r["id"], "attempt_id": eval_info.get("attempt_id"), "skill": attempt.get("skill"),
            "status": RUN_STATUS_LABEL.get(r["status"], r["status"]), "created_at": r["started_at"],
            "task_no": r.get("task_no"), "error_message": r.get("error"), "latency_ms": latency_ms,
            "processing_time": round(latency_ms / 1000, 1) if latency_ms else None,
            "trace_id": r.get("trace_id"), "model": r.get("model"),
            "essay": {"user": {"email": emails.get(attempt.get("learner_id"))},
                      "topic": {"title": (attempt.get("tests") or {}).get("title")}},
        })
    return {"items": items, "total": res.count if getattr(res, "count", None) is not None else len(items)}
