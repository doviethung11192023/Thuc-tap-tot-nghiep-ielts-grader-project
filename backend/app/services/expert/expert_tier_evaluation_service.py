"""4-Tier Performance & Recognition Engine + Snapshots (Pillar 2 — FR-45..52, BR-22..25)."""
from calendar import monthrange
from datetime import datetime, timedelta, timezone
from typing import Any, Callable

from app.db.supabase import db
from app.services.admin.staff_accounts import write_audit
from app.services.expert.expert_policy_config import TIER_MAX_CAP, TIER_PRIORITY_RANK
from app.services.expert.sla_service import TZ_VN, remaining_business_hours
from app.services.notifications.notification_service import create_notification

_VALID_PERIOD_LEN = 7


def _parse_dt(val: Any) -> datetime | None:
    if not val:
        return None
    try:
        dt = datetime.fromisoformat(str(val).replace("Z", "+00:00"))
        return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)
    except Exception:
        return None


def _period_bounds(period: str, now_utc: datetime) -> tuple[datetime, datetime, str | None, str | None]:
    if len(period) == _VALID_PERIOD_LEN and period[4] == "-":
        y, m = int(period[:4]), int(period[5:7])
        last_day = monthrange(y, m)[1]
        start_vn = datetime(y, m, 1, 0, 0, tzinfo=TZ_VN)
        end_vn = datetime(y, m, last_day, 23, 59, 59, tzinfo=TZ_VN) + timedelta(seconds=1)
        return start_vn.astimezone(timezone.utc), end_vn.astimezone(timezone.utc), f"{y:04d}-{m:02d}-01", f"{y:04d}-{m:02d}-{last_day:02d}"
    return now_utc - timedelta(days=30), now_utc + timedelta(seconds=1), None, None


def _classify_tier(m: dict[str, Any], active_sla: int, denom: int) -> str:
    ontime = m["on_time_rate"] if m["on_time_rate"] is not None else 100.0
    if active_sla >= 2 or (denom >= 5 and ontime < 80.0) or m["rubber_stamp_count"] >= 3:
        return "probation"
    if m["completed_count"] < 5:
        return "standard"
    early = m["early_sla_rate"] or 0.0
    fpass = m["completeness_first_pass_rate"] if m["completeness_first_pass_rate"] is not None else 100.0
    if m["completed_count"] >= 15 and ontime >= 95.0 and early >= 50.0 and fpass >= 90.0 and active_sla == 0 and m["rubber_stamp_count"] == 0:
        return "top_expert"
    if m["completed_count"] >= 8 and ontime >= 90.0 and fpass >= 85.0 and active_sla == 0:
        return "high_performer"
    return "standard"


def _next_tier_reqs(tier: str, m: dict[str, Any], active_sla: int) -> list[dict[str, Any]]:
    if tier in ("probation", "standard"):
        return [
            {"label": "Hoàn thành tối thiểu 8 bài / 30 ngày", "current": f"{m['completed_count']}/8", "ok": m["completed_count"] >= 8},
            {"label": "Tỷ lệ đúng hạn SLA >= 90%", "current": f"{m['on_time_rate'] if m['on_time_rate'] is not None else 0}%", "ok": (m["on_time_rate"] or 0) >= 90},
            {"label": "Đủ điều kiện ngay lần đầu >= 85%", "current": f"{m['completeness_first_pass_rate'] if m['completeness_first_pass_rate'] is not None else 0}%", "ok": (m["completeness_first_pass_rate"] or 0) >= 85},
            {"label": "Không có vi phạm SLA đang hiệu lực", "current": f"{active_sla} lỗi", "ok": active_sla == 0},
        ]
    if tier == "high_performer":
        return [
            {"label": "Hoàn thành tối thiểu 15 bài / 30 ngày", "current": f"{m['completed_count']}/15", "ok": m["completed_count"] >= 15},
            {"label": "Đúng hạn SLA >= 95%", "current": f"{m['on_time_rate'] or 0}%", "ok": (m["on_time_rate"] or 0) >= 95},
            {"label": "Chấm sớm (<= 24h) >= 50%", "current": f"{m['early_sla_rate'] or 0}%", "ok": (m["early_sla_rate"] or 0) >= 50},
            {"label": "Không có cảnh báo rubber-stamp", "current": f"{m['rubber_stamp_count']} lần", "ok": m["rubber_stamp_count"] == 0},
        ]
    return []


def compute_expert_performance_metrics(
    expert_ids: list[str],
    period: str = "30d",
    now_utc: datetime | None = None,
    db_fn: Callable[[], Any] | None = None,
) -> dict[str, dict[str, Any]]:
    """Tính 6 chỉ số vận hành trực tiếp, phân hạng 4-Tier, Helpful % & active penalties."""
    if not expert_ids:
        return {}
    client = (db_fn or db)()
    now_dt = now_utc or datetime.now(timezone.utc)
    start_dt, end_dt, snap_start, snap_end = _period_bounds(period, now_dt)

    exp_rows = {r["user_id"]: r for r in (client.table("expert_profiles").select("*").in_("user_id", expert_ids).execute().data or [])}
    asgns = [
        r for r in (client.table("review_assignments").select("*").in_("expert_id", expert_ids).execute().data or [])
        if (dt := _parse_dt(r.get("assigned_at"))) is not None and start_dt <= dt < end_dt
    ]
    all_pens = [
        p for p in (client.table("expert_penalties").select("*").in_("expert_id", expert_ids).execute().data or [])
        if (dt := _parse_dt(p.get("created_at"))) is not None and start_dt <= dt < end_dt
    ]
    ratings = [
        rt for rt in (client.table("expert_helpfulness_ratings").select("*").in_("expert_id", expert_ids).execute().data or [])
        if (dt := _parse_dt(rt.get("created_at"))) is not None and start_dt <= dt < end_dt
    ]
    snaps: dict[str, dict[str, Any]] = {}
    if snap_start and snap_end:
        for s in (client.table("expert_performance_snapshots").select("*").in_("expert_id", expert_ids).eq("period_start", snap_start).eq("period_end", snap_end).execute().data or []):
            snaps[s["expert_id"]] = s

    out: dict[str, dict[str, Any]] = {}
    for eid in expert_ids:
        ep = exp_rows.get(eid) or {}
        rows = [r for r in asgns if r.get("expert_id") == eid]
        e_pens = [p for p in all_pens if p.get("expert_id") == eid]
        active_pens = [p for p in e_pens if p.get("waived_at") is None]
        waived_exp_ids = {p.get("assignment_id") for p in e_pens if p.get("waived_at") is not None and p.get("assignment_id")}
        active_sla = sum(1 for p in active_pens if p.get("reason") == "sla_expired")

        completed = [r for r in rows if r.get("end_reason") == "completed"]
        declined = sum(1 for r in rows if r.get("end_reason") == "declined")
        unwaived_exp = sum(1 for r in rows if r.get("end_reason") == "expired" and r.get("id") not in waived_exp_ids)

        on_time, early, first_pass = 0, 0, 0
        turns: list[float] = []
        for r in completed:
            a_dt, e_dt, d_dt = _parse_dt(r.get("assigned_at")), _parse_dt(r.get("ended_at")), _parse_dt(r.get("due_at"))
            if e_dt and d_dt and e_dt <= d_dt:
                on_time += 1
            if r.get("is_early_sla") or (a_dt and e_dt and remaining_business_hours(a_dt.astimezone(TZ_VN), e_dt.astimezone(TZ_VN)) <= 24.0):
                early += 1
            if int(r.get("completeness_reject_count") or 0) == 0:
                first_pass += 1
            if a_dt and e_dt and e_dt >= a_dt:
                turns.append((e_dt - a_dt).total_seconds() / 3600.0)

        denom = len(completed) + unwaived_exp
        m = {
            "completed_count": len(completed),
            "on_time_rate": round(on_time / denom * 100.0, 1) if denom > 0 else None,
            "early_sla_rate": round(early / len(completed) * 100.0, 1) if completed else None,
            "completeness_first_pass_rate": round(first_pass / len(completed) * 100.0, 1) if completed else None,
            "avg_turnaround_hours": round(sum(turns) / len(turns), 1) if turns else None,
            "decline_rate": round(declined / len(rows) * 100.0, 1) if rows else 0.0,
            "rubber_stamp_count": sum(1 for r in completed if r.get("rubber_stamp_flag")),
        }

        e_rat = [rt for rt in ratings if rt.get("expert_id") == eid]
        h_cnt = len(e_rat)
        h_rate = round(sum(1 for rt in e_rat if rt.get("is_helpful")) / h_cnt * 100.0, 1) if h_cnt >= 5 else None

        snap = snaps.get(eid)
        if snap:
            for k in ("completed_count", "on_time_rate", "early_sla_rate", "completeness_first_pass_rate", "avg_turnaround_hours", "decline_rate", "rubber_stamp_count"):
                if snap.get(k) is not None:
                    m[k] = float(snap[k]) if isinstance(m.get(k), float) or k.endswith("_rate") or k.endswith("_hours") else int(snap[k])
            tier = snap["tier"]
        else:
            tier = _classify_tier(m, active_sla, denom)

        score_base = (m["on_time_rate"] if m["on_time_rate"] is not None else 100.0) * 0.5 + (m["completeness_first_pass_rate"] if m["completeness_first_pass_rate"] is not None else 100.0) * 0.35 + (m["early_sla_rate"] if m["early_sla_rate"] is not None else 50.0) * 0.15
        rps_legacy = round(max(0.0, min(100.0, score_base - active_sla * 10.0)), 1)
        out[eid] = {
            **m,
            "tier": tier,
            "tier_max_reviews": TIER_MAX_CAP.get(tier, 5),
            "priority_rank": TIER_PRIORITY_RANK.get(tier, 2),
            "active_penalties_30d": len(active_pens),
            "active_sla_penalties_30d": active_sla,
            "active_penalties": sorted(active_pens, key=lambda x: str(x.get("created_at") or ""), reverse=True),
            "helpfulness_count": h_cnt,
            "helpfulness_rate": h_rate if not snap else (float(snap["helpfulness_rate"]) if snap.get("helpfulness_rate") is not None else h_rate),
            "cooldown_until": ep.get("cooldown_until"),
            "is_suspended_by_penalty": bool(ep.get("is_suspended_by_penalty", False)),
            "consecutive_clean_reviews": int(ep.get("consecutive_clean_reviews") or 0),
            "next_tier_requirements": _next_tier_reqs(tier, m, active_sla),
            "rps_score": rps_legacy,
            "rps_tier": "gold" if tier == "top_expert" else ("watchlist" if tier == "probation" else "standard"),
            "overdue_30d": unwaived_exp,
            "penalty_level": min(3, active_sla),
            "completed_30d": m["completed_count"],
        }
    return out


def refresh_single_expert_tier(expert_id: str, now_utc: datetime | None = None) -> str:
    """Đồng bộ hạng 4-Tier, tự phục hồi Probation & nhả Cooldown cho 1 Chuyên gia."""
    now_dt = now_utc or datetime.now(timezone.utc)
    ep_rows = db().table("expert_profiles").select("*").eq("user_id", expert_id).limit(1).execute().data or []
    if not ep_rows:
        return "standard"
    ep = ep_rows[0]
    metrics = compute_expert_performance_metrics([expert_id], "30d", now_dt).get(expert_id, {})
    new_tier = metrics.get("tier", "standard")
    updates: dict[str, Any] = {}

    cd_dt = _parse_dt(ep.get("cooldown_until"))
    if cd_dt and cd_dt <= now_dt and not ep.get("is_suspended_by_penalty"):
        updates.update({"cooldown_until": None, "is_available": True})
        create_notification(
            user_id=expert_id,
            notification_type="expert_penalty_notice",
            title="Hết thời gian tạm nghỉ điều phối",
            message="Tài khoản của bạn đã được mở lại trạng thái Sẵn sàng nhận bài.",
            action_url="/expert/profile",
        )

    cur_tier = ep.get("tier") or "standard"
    if cur_tier == "probation" and not ep.get("is_suspended_by_penalty"):
        clean = int(ep.get("consecutive_clean_reviews") or 0) >= 3
        pens = metrics.get("active_penalties") or []
        latest_pen_dt = _parse_dt(pens[0].get("created_at")) if pens else None
        clean_14d = bool(latest_pen_dt and (now_dt - latest_pen_dt).days >= 14 and metrics.get("completed_count", 0) >= 1)
        if (clean or clean_14d) and new_tier == "probation" and metrics.get("active_sla_penalties_30d", 0) < 2:
            new_tier = "standard"
            updates["max_active_reviews"] = max(5, int(ep.get("max_active_reviews") or 2))

    if cur_tier == "probation" and new_tier != "probation":
        updates["max_active_reviews"] = min(TIER_MAX_CAP[new_tier], max(5, int(ep.get("max_active_reviews") or 2)))
    elif int(ep.get("max_active_reviews") or 5) > TIER_MAX_CAP[new_tier]:
        updates["max_active_reviews"] = TIER_MAX_CAP[new_tier]

    if new_tier != cur_tier:
        updates["tier"] = new_tier
        write_audit(None, "expert_tier_changed", "expert_profiles", expert_id, before={"tier": cur_tier}, after={"tier": new_tier})
    if updates:
        db().table("expert_profiles").update(updates).eq("user_id", expert_id).execute()
    return new_tier


def evaluate_all_expert_tiers(now_utc: datetime | None = None, close_previous_month: bool = False) -> int:
    """Quét toàn bộ Chuyên gia hằng ngày và chốt snapshot tháng cũ khi sang ngày 01."""
    now_dt = now_utc or datetime.now(timezone.utc)
    eids = [r["user_id"] for r in (db().table("expert_profiles").select("user_id").execute().data or [])]
    for eid in eids:
        refresh_single_expert_tier(eid, now_dt)
    if close_previous_month and eids:
        prev_day = now_dt.astimezone(TZ_VN).replace(day=1) - timedelta(days=1)
        ym = prev_day.strftime("%Y-%m")
        _, _, s_date, e_date = _period_bounds(ym, now_dt)
        snap_map = compute_expert_performance_metrics(eids, ym, now_dt)
        for eid, m in snap_map.items():
            db().table("expert_performance_snapshots").upsert({
                "expert_id": eid, "period_start": s_date, "period_end": e_date,
                "completed_count": m["completed_count"],
                "on_time_rate": m["on_time_rate"] if m["on_time_rate"] is not None else 100.0,
                "early_sla_rate": m["early_sla_rate"] or 0.0,
                "completeness_first_pass_rate": m["completeness_first_pass_rate"] if m["completeness_first_pass_rate"] is not None else 100.0,
                "avg_turnaround_hours": m["avg_turnaround_hours"],
                "decline_rate": m["decline_rate"],
                "rubber_stamp_count": m["rubber_stamp_count"],
                "helpfulness_rate": m["helpfulness_rate"],
                "helpfulness_count": m["helpfulness_count"],
                "tier": m["tier"],
            }, on_conflict="expert_id,period_start,period_end").execute()
    return len(eids)
