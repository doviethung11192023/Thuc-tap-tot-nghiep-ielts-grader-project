"""Số liệu cho badge cảnh báo trên dashboard Admin (US2, FR-008): attempt chấm lỗi, lượt treo, ngân sách tháng."""
from typing import Any

from app.db.supabase import db
from app.services.ai_monitoring import model_pricing
from app.services.ai_monitoring.ai_budget_status import budget_status
from app.services.ai_monitoring.ai_usage_report import month_cost_usd
from app.services.ai_monitoring.grading_run_queries import stuck_cutoff


def _count(query: Any) -> int:
    return query.limit(1).execute().count or 0


def alert_summary() -> dict[str, Any]:
    failed_attempts = _count(db().table("attempts").select("id", count="exact").eq("status", "grading_failed"))
    stuck_runs = _count(db().table("grading_runs").select("id", count="exact")
                        .eq("status", "running").lt("started_at", stuck_cutoff()))
    budget = budget_status(month_cost_usd(), model_pricing.get_budget())
    budget_alert = 1 if budget["state"] in ("warning", "exceeded") else 0
    return {"failed_attempts": failed_attempts, "stuck_runs": stuck_runs, "budget": budget,
            "total": failed_attempts + stuck_runs + budget_alert}
