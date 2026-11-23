"""Token và chi phí AI theo ngày, model hoặc kỹ năng trong một tháng giờ VN, so với ngân sách (US4, FR-018)."""
from typing import Any, Optional

from app.core.domain_errors import InvalidRequestError
from app.db.supabase import db
from app.services.ai_monitoring import model_pricing
from app.services.ai_monitoring.ai_budget_status import budget_status
from app.services.ai_monitoring.ai_monitoring_time import month_window, vn_date_key
from app.services.ai_monitoring.paged_rows import fetch_all

GROUP_BY = ("day", "model", "skill")
UNKNOWN_MODEL = "unknown"


def _month_runs(start_iso: str, end_iso: str) -> list[dict[str, Any]]:
    """Lượt đã kết thúc trong khoảng; lượt đang chạy chưa có token và chi phí nên không tính."""
    return fetch_all(lambda: db().table("grading_runs")
                     .select("id, started_at, model, status, input_tokens, output_tokens, cost_usd, "
                             "usage:output->usage, evaluations!inner(skill)")
                     .in_("status", ["done", "failed"]).gte("started_at", start_iso).lt("started_at", end_iso)
                     .order("started_at"))


def _models_used(run: dict[str, Any]) -> set[str]:
    """Mọi model một lượt đã gọi (output.usage). Lượt trước spec 008 không có token: bỏ qua, vì cột model
    của chúng là nhãn cũ ("ta=a; cc,lr,gra=b") và chi phí của chúng không tính được dù có giá."""
    if run.get("input_tokens") is None:
        return set()
    usage = run.get("usage") if "usage" in run else (run.get("output") or {}).get("usage")
    models = {u.get("model") for u in usage or [] if isinstance(u, dict) and u.get("model")}
    return models or ({run["model"]} if run.get("model") else set())


def _group_key(run: dict[str, Any], group_by: str) -> str:
    if group_by == "day":
        return vn_date_key(run["started_at"])
    if group_by == "skill":
        return (run.get("evaluations") or {}).get("skill") or "unknown"
    return run.get("model") or UNKNOWN_MODEL


def _add(bucket: dict[str, Any], run: dict[str, Any]) -> None:
    bucket["input_tokens"] += run.get("input_tokens") or 0
    bucket["output_tokens"] += run.get("output_tokens") or 0
    bucket["runs"] += 1
    if run.get("cost_usd") is None:
        bucket["unknown_cost_runs"] += 1
        if run.get("input_tokens") is None:   # lượt trước khi có ghi token: có giá cũng không tính được
            bucket["no_usage_runs"] += 1
    else:
        bucket["cost_usd"] += float(run["cost_usd"])


def _empty(key: Optional[str] = None) -> dict[str, Any]:
    row = {"input_tokens": 0, "output_tokens": 0, "cost_usd": 0.0, "runs": 0, "unknown_cost_runs": 0,
           "no_usage_runs": 0}
    return {"key": key, **row} if key is not None else row


def _rounded(bucket: dict[str, Any]) -> dict[str, Any]:
    return {**bucket, "cost_usd": round(bucket["cost_usd"], 6)}


def month_cost_usd(month: Optional[str] = None) -> float:
    """Tổng chi phí đã biết của tháng (dùng cho badge ngân sách)."""
    _, start, end = month_window(month)
    return round(sum(float(r["cost_usd"]) for r in _month_runs(start.isoformat(), end.isoformat())
                     if r.get("cost_usd") is not None), 6)


def usage_report(month: Optional[str], group_by: str) -> dict[str, Any]:
    if group_by not in GROUP_BY:
        raise InvalidRequestError("group_by phải là day, model hoặc skill")
    label, start, end = month_window(month)
    runs = _month_runs(start.isoformat(), end.isoformat())
    prices = model_pricing.get_prices()
    total, groups = _empty(), {}
    for run in runs:
        _add(total, run)
        _add(groups.setdefault(_group_key(run, group_by), _empty()), run)
    rows = [_rounded({"key": key, **bucket}) for key, bucket in sorted(groups.items())]
    unpriced = sorted({m for r in runs for m in _models_used(r) if not model_pricing.is_priced(prices.get(m))})
    return {"month": label, "total": _rounded(total),
            "budget": budget_status(total["cost_usd"], model_pricing.get_budget()),
            "rows": rows, "models_without_price": unpriced}

