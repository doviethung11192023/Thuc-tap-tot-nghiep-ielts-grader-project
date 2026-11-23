"""Trạng thái ngân sách tháng so với chi phí đã ghi (FR-019): cảnh báo ở 80%, vượt ở 100%, không chặn chấm bài."""
from typing import Any, Optional

WARNING_RATIO = 0.8


def budget_status(month_cost_usd: float, budget_usd: Optional[float]) -> dict[str, Any]:
    """state: off (không đặt ngân sách) | ok | warning (≥80%) | exceeded (≥100%)."""
    if not budget_usd or budget_usd <= 0:
        return {"state": "off", "budget_usd": None, "month_cost_usd": round(month_cost_usd, 6), "percent": None}
    ratio = month_cost_usd / budget_usd
    state = "exceeded" if ratio >= 1 else "warning" if ratio >= WARNING_RATIO else "ok"
    return {"state": state, "budget_usd": budget_usd, "month_cost_usd": round(month_cost_usd, 6),
            "percent": round(ratio * 100, 1)}
