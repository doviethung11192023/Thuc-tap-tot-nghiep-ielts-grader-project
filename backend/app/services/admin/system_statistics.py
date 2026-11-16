"""
Dashboard hệ thống (UC-23, FR-29) và giám sát chấm AI (UC-24, FR-30: lượt chạy lỗi, độ trễ).

- "Hôm nay" và các ngày trong biểu đồ tính theo giờ Việt Nam (UTC+7), không theo UTC.
- Bài Writing = lượt làm Writing đã nộp (attempts skill=writing, submitted_at có giá trị); tổng và hôm nay
  cùng đơn vị. Biểu đồ xu hướng đếm lượt nộp của cả 4 kỹ năng.
- Tỉ lệ lỗi và thời gian xử lý tính trên grading_runs (NFR-05: một lượt = một task Writing hoặc một bài
  Speaking), gồm cả lượt lỗi rồi được chạy lại; trả kèm số lượt để giao diện ghi rõ mẫu số.
"""
from datetime import datetime, timedelta
from typing import Any

from app.db.supabase import db
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


def system_statistics() -> dict[str, Any]:
    today = datetime.now(VN_TZ).replace(hour=0, minute=0, second=0, microsecond=0)
    trend = []
    for i in range(TREND_DAYS - 1, -1, -1):
        day = today - timedelta(days=i)
        trend.append({"date": day.strftime("%d/%m"), "count": _submitted(day, day + timedelta(days=1))})

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
