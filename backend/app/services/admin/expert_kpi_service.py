"""Tổng hợp KPI & báo cáo hiệu suất 4-Tier Chuyên gia cho Dashboard Admin (FR-29, FR-50, FR-51)."""
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from app.db.supabase import db
from app.services.expert.expert_tier_evaluation_service import compute_expert_performance_metrics
from app.services.expert.sla_service import TZ_VN


def _available_periods(limit: int = 6) -> list[str]:
    now_vn = datetime.now(TZ_VN)
    periods: list[str] = []
    cur = now_vn.replace(day=15)
    for i in range(limit):
        dt = cur - timedelta(days=i * 30)
        ym = dt.strftime("%Y-%m")
        if ym not in periods:
            periods.append(ym)
    return periods


def get_expert_kpis(
    period: str = "30d",
    tier_filter: Optional[str] = None,
    flagged_only: bool = False,
) -> list[dict[str, Any]]:
    """Tính tải, 6 chỉ số vận hành 4-Tier, rubber-stamp & vi phạm đang hiệu lực."""
    experts = db().table("expert_profiles").select("*").execute().data or []
    if not experts:
        return []
    uids = [e["user_id"] for e in experts]
    metrics_map = compute_expert_performance_metrics(uids, period=period, db_fn=db)
    profiles = {
        p["id"]: p
        for p in (db().table("profiles").select("id, full_name, email, is_active").in_("id", uids).execute().data or [])
    }
    open_rows = db().table("review_assignments").select("expert_id").is_("ended_at", "null").execute().data or []
    active_counts: dict[str, int] = {}
    for row in open_rows:
        if eid := row.get("expert_id"):
            active_counts[eid] = active_counts.get(eid, 0) + 1

    all_asgns = db().table("review_assignments").select("expert_id, end_reason").in_("expert_id", uids).execute().data or []
    tot_completed: dict[str, int] = {}
    tot_expired: dict[str, int] = {}
    for row in all_asgns:
        eid = row.get("expert_id")
        if not eid:
            continue
        if row.get("end_reason") == "completed":
            tot_completed[eid] = tot_completed.get(eid, 0) + 1
        elif row.get("end_reason") == "expired":
            tot_expired[eid] = tot_expired.get(eid, 0) + 1

    kpis: list[dict[str, Any]] = []
    for exp in experts:
        uid = exp["user_id"]
        prof = profiles.get(uid) or {}
        if prof.get("is_active") is False:
            continue
        m = metrics_map.get(uid) or {}
        tier = str(m.get("tier") or exp.get("tier") or "standard")
        if tier_filter and tier != tier_filter:
            continue
        rubber_cnt = int(m.get("rubber_stamp_count") or 0)
        if flagged_only and rubber_cnt == 0:
            continue
        kpis.append({
            "expert_id": uid,
            "full_name": prof.get("full_name") or prof.get("email") or "Chuyên gia",
            "email": prof.get("email") or "",
            "is_available": bool(exp.get("is_available", False)),
            "active_reviews": active_counts.get(uid, 0),
            "max_active_reviews": int(exp.get("max_active_reviews") or 5),
            "completed_total": tot_completed.get(uid, 0),
            "completed_period": int(m.get("completed_count") or 0),
            "on_time_rate": m.get("on_time_rate"),
            "early_sla_rate": m.get("early_sla_rate"),
            "completeness_first_pass_rate": m.get("completeness_first_pass_rate"),
            "decline_rate": m.get("decline_rate", 0.0),
            "expired_count": tot_expired.get(uid, 0),
            "avg_turnaround_hours": m.get("avg_turnaround_hours"),
            "tier": tier,
            "tier_max_reviews": m.get("tier_max_reviews", 5),
            "rubber_stamp_count": rubber_cnt,
            "helpfulness_rate": m.get("helpfulness_rate"),
            "helpfulness_count": int(m.get("helpfulness_count") or 0),
            "active_penalties_30d": int(m.get("active_penalties_30d") or 0),
            "active_penalties": m.get("active_penalties") or [],
            "cooldown_until": m.get("cooldown_until"),
            "is_suspended_by_penalty": bool(m.get("is_suspended_by_penalty", False)),
            "rps_score": m.get("rps_score", 100.0),
            "rps_tier": m.get("rps_tier", "standard"),
            "overdue_30d": m.get("overdue_30d", 0),
            "penalty_level": m.get("penalty_level", 0),
        })
    kpis.sort(key=lambda x: (-x["completed_period"], -x["completed_total"], x["full_name"]))
    return kpis


def get_expert_performance_report(
    period: str = "30d",
    tier: Optional[str] = None,
    flagged_only: bool = False,
) -> dict[str, Any]:
    items = get_expert_kpis(period=period, tier_filter=tier, flagged_only=flagged_only)
    tier_counts = {"top_expert": 0, "high_performer": 0, "standard": 0, "probation": 0}
    for it in items:
        t = it.get("tier") or "standard"
        if t in tier_counts:
            tier_counts[t] += 1
    return {
        "period": period,
        "available_periods": _available_periods(),
        "items": items,
        "summary": {
            "total": len(items),
            "flagged_rubber_stamp": sum(1 for it in items if it.get("rubber_stamp_count", 0) > 0),
            "active_penalties": sum(it.get("active_penalties_30d", 0) for it in items),
            "tier_counts": tier_counts,
        },
    }
