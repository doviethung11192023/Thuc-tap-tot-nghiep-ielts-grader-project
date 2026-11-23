"""Danh sách và chi tiết lượt chấm AI cho Admin (US1, FR-005..FR-007).

"Treo" = đang chạy quá 25 phút (cùng ngưỡng lease của hàng đợi chấm, R6). "Cần chú ý" = lượt lỗi của attempt
đang grading_failed, hoặc lượt treo (badge trên dashboard dẫn vào đây).
"""
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from app.core.config import settings
from app.core.domain_errors import InvalidRequestError, NotFoundError
from app.db.supabase import db
from app.services.ai_monitoring import model_pricing
from app.services.ai_monitoring.ai_monitoring_time import day_range, parse_iso

STUCK_MINUTES = 25
ERROR_SHORT_CHARS = 200
STATUSES = ("running", "done", "failed", "stuck", "attention")
# Khoá trong prompt_versions của engine (ta, cc, lr, gra, grade, fc, pr...); chỉ nhận dạng an toàn để ghép vào đường dẫn JSON
_PROMPT_KEY = re.compile(r"^[a-z0-9_]{1,30}$")
_KNOWN_PROMPT_KEYS = ("ta", "cc", "lr", "gra", "grade", "fc", "pr", "overall")
_LIST_SELECT = ("id, evaluation_id, task_no, status, model, prompt_versions, trace_id, error, input_tokens, "
                "output_tokens, cost_usd, latency_ms, started_at, finished_at, "
                "evaluations!inner(attempt_id, skill, attempts!inner(mode))")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def stuck_cutoff() -> str:
    return (_now() - timedelta(minutes=STUCK_MINUTES)).isoformat()


def is_stuck(run: dict[str, Any]) -> bool:
    started = parse_iso(run.get("started_at"))
    return run.get("status") == "running" and started is not None and started < _now() - timedelta(minutes=STUCK_MINUTES)


def trace_url(trace_id: Optional[str], started_at: Optional[str], view_days: int) -> Optional[str]:
    """Link Langfuse khi có trace id, đã cấu hình dự án và lượt còn trong thời hạn xem (FR-007)."""
    base = (getattr(settings, "LANGFUSE_BASE_URL", "") or "").rstrip("/")
    project = getattr(settings, "LANGFUSE_PROJECT_ID", "") or ""
    started = parse_iso(started_at)
    if not (trace_id and base and project and started):
        return None
    if started < _now() - timedelta(days=view_days):
        return None
    return f"{base}/project/{project}/traces/{trace_id}"


def _attention_filter() -> str:
    """Biểu thức `or` của PostgREST: lượt treo, hoặc lượt lỗi thuộc attempt đang grading_failed."""
    parts = [f"and(status.eq.running,started_at.lt.{stuck_cutoff()})"]
    attempts = [a["id"] for a in db().table("attempts").select("id").eq("status", "grading_failed").execute().data or []]
    evaluations = []
    for i in range(0, len(attempts), 100):
        evaluations += [e["id"] for e in db().table("evaluations").select("id")
                        .in_("attempt_id", attempts[i:i + 100]).execute().data or []]
    if evaluations:
        parts.append(f"and(status.eq.failed,evaluation_id.in.({','.join(evaluations)}))")
    return ",".join(parts)


def _apply_filters(query: Any, f: dict[str, Optional[str]]) -> Any:
    status = f.get("status")
    if status == "stuck":
        query = query.eq("status", "running").lt("started_at", stuck_cutoff())
    elif status == "attention":
        query = query.or_(_attention_filter())
    elif status:
        query = query.eq("status", status)
    start, end = day_range(f.get("date_from"), f.get("date_to"))
    if start:
        query = query.gte("started_at", start)
    if end:
        query = query.lt("started_at", end)
    for column, key in (("evaluations.skill", "skill"), ("model", "model"), ("evaluations.attempt_id", "attempt_id")):
        if f.get(key):
            query = query.eq(column, f[key])
    return _apply_prompt_filter(query, f.get("prompt_name"), f.get("prompt_version"))


def _apply_prompt_filter(query: Any, name: Optional[str], version: Optional[str]) -> Any:
    """prompt_versions là {khoá: số phiên bản}. Có tên thì lọc theo khoá đó; chỉ có số thì khớp bất kỳ khoá nào."""
    if name:
        if not _PROMPT_KEY.match(name):
            raise InvalidRequestError("prompt_name không hợp lệ")
        path = f"prompt_versions->>{name}"
        return query.eq(path, version) if version else query.not_.is_(path, "null")
    if version:
        return query.or_(",".join(f"prompt_versions->>{key}.eq.{version}" for key in _KNOWN_PROMPT_KEYS))
    return query


def _item(run: dict[str, Any], view_days: int) -> dict[str, Any]:
    evaluation = run.get("evaluations") or {}
    error = (run.get("error") or "").strip()
    return {
        "id": run["id"], "attempt_id": evaluation.get("attempt_id"), "evaluation_id": run["evaluation_id"],
        "skill": evaluation.get("skill"), "mode": (evaluation.get("attempts") or {}).get("mode"),
        "task_no": run.get("task_no"), "status": run["status"], "is_stuck": is_stuck(run),
        "model": run.get("model"), "prompt_versions": run.get("prompt_versions"),
        "input_tokens": run.get("input_tokens"), "output_tokens": run.get("output_tokens"),
        "cost_usd": run.get("cost_usd"), "latency_ms": run.get("latency_ms"),
        "started_at": run["started_at"], "finished_at": run.get("finished_at"),
        "error_short": error[:ERROR_SHORT_CHARS] or None,
        "trace_url": trace_url(run.get("trace_id"), run["started_at"], view_days),
    }


def list_runs(page: int, limit: int, filters: dict[str, Optional[str]]) -> dict[str, Any]:
    if filters.get("status") and filters["status"] not in STATUSES:
        raise InvalidRequestError("status phải là running, done, failed, stuck hoặc attention")
    query = _apply_filters(db().table("grading_runs").select(_LIST_SELECT, count="exact"), filters)
    offset = (page - 1) * limit
    res = query.order("started_at", desc=True).range(offset, offset + limit - 1).execute()
    view_days = model_pricing.get_trace_view_days()
    items = [_item(run, view_days) for run in res.data or []]
    total = getattr(res, "count", None)
    return {"items": items, "total": total if total is not None else len(items), "page": page, "limit": limit}


def run_detail(run_id: str) -> dict[str, Any]:
    rows = db().table("grading_runs").select(_LIST_SELECT + ", output").eq("id", run_id).execute().data
    if not rows:
        raise NotFoundError("Không tìm thấy lượt chấm")
    run = rows[0]
    item = _item(run, model_pricing.get_trace_view_days())
    evaluation = db().table("evaluations").select("id, status, is_official, overall_band") \
        .eq("id", run["evaluation_id"]).execute().data
    attempt = db().table("attempts").select("id, status, skill, mode, tests(title)") \
        .eq("id", item["attempt_id"]).execute().data
    attempt_row = attempt[0] if attempt else None
    return {**item, "error": run.get("error"), "output": run.get("output"),
            "evaluation": evaluation[0] if evaluation else None,
            "attempt": {"id": attempt_row["id"], "status": attempt_row["status"], "skill": attempt_row["skill"],
                        "mode": attempt_row["mode"], "test_title": (attempt_row.get("tests") or {}).get("title")}
            if attempt_row else None}
