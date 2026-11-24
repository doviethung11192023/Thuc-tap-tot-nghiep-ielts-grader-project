"""
Dashboard hệ thống (UC-23, FR-29) và giám sát chấm AI (UC-24, FR-30: lượt chạy lỗi, độ trễ).

- "Hôm nay" và các ngày trong biểu đồ tính theo giờ Việt Nam (UTC+7), không theo UTC.
- Bài Writing = lượt làm Writing đã nộp (attempts skill=writing, submitted_at có giá trị); tổng và hôm nay
  cùng đơn vị. Biểu đồ xu hướng đếm lượt nộp của cả 4 kỹ năng.
- Tỉ lệ lỗi và thời gian xử lý tính trên grading_runs (NFR-05: một lượt = một task Writing hoặc một bài
  Speaking), gồm cả lượt lỗi rồi được chạy lại; trả kèm số lượt để giao diện ghi rõ mẫu số.
"""
from datetime import datetime, timedelta, timezone
from typing import Any

from app.db.supabase import db
from app.services.admin.expert_kpi_service import get_expert_kpis
from app.services.learner_journey.journey_constants import VN_TZ

RUN_STATUS_LABEL = {"done": "COMPLETED", "failed": "FAILED", "running": "RUNNING"}
TREND_DAYS = 7
PAGE_SIZE = 1000   # PostgREST trả tối đa 1000 dòng mỗi lần
EPOCH = datetime(1970, 1, 1, tzinfo=VN_TZ)


def _count(table: str, **filters) -> int:
    q = db().table(table).select("id", count="exact")
    for col, (op, val) in filters.items():
        q = getattr(q, op)(col, val)
    res = q.limit(1).execute()
    return res.count or 0


def _submitted(since: datetime, until: datetime | None = None, skill: str | None = None) -> int:
    q = db().table("attempts").select("id", count="exact").gte("submitted_at", since.isoformat())
    if until is not None:
        q = q.lt("submitted_at", until.isoformat())
    if skill:
        q = q.eq("skill", skill)
    return q.limit(1).execute().count or 0


def _done_latencies() -> list[int]:
    out, offset = [], 0
    while True:
        rows = (db().table("grading_runs").select("latency_ms").eq("status", "done")
                .range(offset, offset + PAGE_SIZE - 1).execute().data or [])
        out += [r["latency_ms"] for r in rows if r.get("latency_ms")]
        if len(rows) < PAGE_SIZE:
            return out
        offset += PAGE_SIZE


def _submitted_per_vn_day(since: datetime, until: datetime) -> dict[Any, int]:
    """Số lượt nộp theo ngày giờ VN trong [since, until): một lượt đọc thay vì một query mỗi ngày."""
    counts: dict[Any, int] = {}
    offset = 0
    while True:
        rows = (db().table("attempts").select("submitted_at")
                .gte("submitted_at", since.isoformat()).lt("submitted_at", until.isoformat())
                .order("submitted_at").range(offset, offset + PAGE_SIZE - 1).execute().data or [])
        for r in rows:
            day = datetime.fromisoformat(r["submitted_at"].replace("Z", "+00:00")).astimezone(VN_TZ).date()
            counts[day] = counts.get(day, 0) + 1
        if len(rows) < PAGE_SIZE:
            return counts
        offset += PAGE_SIZE


def system_statistics() -> dict[str, Any]:
    today = datetime.now(VN_TZ).replace(hour=0, minute=0, second=0, microsecond=0)
    day_counts = _submitted_per_vn_day(today - timedelta(days=TREND_DAYS - 1), today + timedelta(days=1))
    trend = []
    for i in range(TREND_DAYS - 1, -1, -1):
        day = today - timedelta(days=i)
        trend.append({"date": day.strftime("%d/%m"), "count": day_counts.get(day.date(), 0)})

    done_runs = _count("grading_runs", status=("eq", "done"))
    failed_runs = _count("grading_runs", status=("eq", "failed"))
    finished_runs = done_runs + failed_runs
    latencies = _done_latencies()
    return {
        "total_users": _count("profiles"),
        "total_essays": _submitted(EPOCH, skill="writing"),
        "essays_today": _submitted(today, skill="writing"),
        "ai_error_rate": round(failed_runs / finished_runs * 100, 2) if finished_runs else 0.0,
        "failed_runs": failed_runs,
        "finished_runs": finished_runs,
        "avg_processing_time": round(sum(latencies) / len(latencies) / 1000, 1) if latencies else 0.0,
        "submissions_trend": trend,
        "monthly_cohort_progression": _monthly_cohort_progression(),
        "expert_kpis": get_expert_kpis(),
    }


def _monthly_cohort_progression(months: int = 6) -> list[dict[str, Any]]:
    now_vn = datetime.now(VN_TZ)
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
            ym = (dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt).astimezone(VN_TZ).strftime("%Y-%m")
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
