"""Rolling 30-day Review Performance Score (RPS 0-100) cho Chuyên gia (Wave 5 Pillar 2)."""
from datetime import datetime, timedelta, timezone
from typing import Any

from app.db.supabase import db
from app.services.expert.expert_policy_config import (
    get_completeness_rules,
    get_penalty_config,
    get_rps_config,
)


def _parse_dt(val: Any) -> datetime | None:
    if not val:
        return None
    try:
        dt = datetime.fromisoformat(str(val).replace("Z", "+00:00"))
        return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)
    except Exception:
        return None


def _classify_tier(score: float, cfg: dict[str, Any]) -> str:
    if score >= float(cfg.get("gold_threshold", 90)):
        return "gold"
    if score >= float(cfg.get("standard_threshold", 75)):
        return "standard"
    return "watchlist"


def _strike_deduction(expired_cnt: int, pcfg: dict[str, Any]) -> tuple[int, int]:
    if expired_cnt <= 0:
        return 0, 0
    if expired_cnt == 1:
        return 1, int(pcfg.get("strike1_rps_deduction", 10))
    if expired_cnt == 2:
        return 2, int(pcfg.get("strike2_rps_deduction", 20))
    return 3, int(pcfg.get("strike1_rps_deduction", 10)) + int(pcfg.get("strike2_rps_deduction", 20))


def _depth_score(ev: dict[str, Any] | None, cs_rows: list[dict[str, Any]], ann_cnt: int, rules: dict[str, Any]) -> float:
    if not ev:
        return 75.0
    min_fb = max(int(rules.get("min_overall_feedback_chars", 80)), 1)
    min_cc = max(int(rules.get("min_criterion_comment_chars", 40)), 1)
    fb_score = min(1.0, len(str(ev.get("feedback") or "").strip()) / min_fb) * 40.0
    avg_comment = sum(len(str(c.get("comment") or "").strip()) for c in cs_rows) / max(len(cs_rows), 1)
    crit_score = min(1.0, avg_comment / min_cc) * 40.0
    ann_score = min(1.0, ann_cnt / max(int(rules.get("min_writing_annotations", 3)), 1)) * 20.0
    return fb_score + crit_score + ann_score


def compute_expert_rps_map(expert_ids: list[str], now_utc: datetime | None = None) -> dict[str, dict[str, Any]]:
    """Tính RPS trượt 30 ngày (SLA 40% + Depth 30% + Consistency 20% + Speed 10% - Phạt quá hạn)."""
    if not expert_ids:
        return {}
    now_dt = now_utc or datetime.now(timezone.utc)
    cfg = get_rps_config()
    pcfg = get_penalty_config()
    rules = get_completeness_rules()
    cutoff_dt = now_dt - timedelta(days=int(cfg.get("window_days", 30)))

    raw_asgns = (
        db().table("review_assignments")
        .select("id, expert_id, attempt_id, evaluation_id, assigned_at, due_at, ended_at, end_reason, note")
        .in_("expert_id", expert_ids)
        .execute()
        .data
        or []
    )
    asgns = [
        a for a in raw_asgns
        if (_parse_dt(a.get("assigned_at")) or now_dt) >= cutoff_dt
    ]

    eval_ids = list({a["evaluation_id"] for a in asgns if a.get("evaluation_id")})
    eval_map: dict[str, dict[str, Any]] = {}
    crit_by_eval: dict[str, list[dict[str, Any]]] = {}
    ann_counts: dict[str, int] = {}
    if eval_ids:
        for ev in (db().table("evaluations").select("id, feedback, agrees_with_ai").in_("id", eval_ids).execute().data or []):
            eval_map[ev["id"]] = ev
        for cs in (db().table("criterion_scores").select("evaluation_id, comment").in_("evaluation_id", eval_ids).execute().data or []):
            crit_by_eval.setdefault(cs["evaluation_id"], []).append(cs)
        for an in (db().table("annotations").select("evaluation_id").in_("evaluation_id", eval_ids).execute().data or []):
            ann_counts[an["evaluation_id"]] = ann_counts.get(an["evaluation_id"], 0) + 1

    grouped: dict[str, list[dict[str, Any]]] = {eid: [] for eid in expert_ids}
    for row in asgns:
        eid = row.get("expert_id")
        if eid in grouped:
            grouped[eid].append(row)

    w_sla = float(cfg.get("weight_sla_pct", 40)) / 100.0
    w_depth = float(cfg.get("weight_depth_pct", 30)) / 100.0
    w_cons = float(cfg.get("weight_consistency_pct", 20)) / 100.0
    w_spd = float(cfg.get("weight_speed_pct", 10)) / 100.0
    target_h = max(float(cfg.get("target_turnaround_hours", 24)), 1.0)

    out: dict[str, dict[str, Any]] = {}
    for eid in expert_ids:
        rows = grouped[eid]
        completed = [r for r in rows if r.get("end_reason") == "completed"]
        expired = sum(1 for r in rows if r.get("end_reason") == "expired")
        reassigned_err = sum(1 for r in rows if r.get("end_reason") == "reassigned")

        denom = len(completed) + expired
        sla_score = (sum(1 for r in completed if _parse_dt(r.get("ended_at")) and _parse_dt(r.get("due_at")) and _parse_dt(r["ended_at"]) <= _parse_dt(r["due_at"])) / denom * 100.0) if denom > 0 else 100.0

        depth_vals = [_depth_score(eval_map.get(r.get("evaluation_id") or ""), crit_by_eval.get(r.get("evaluation_id") or "", []), ann_counts.get(r.get("evaluation_id") or "", 0), rules) for r in completed]
        depth_avg = (sum(depth_vals) / len(depth_vals)) if depth_vals else 100.0
        depth_avg = max(0.0, depth_avg - reassigned_err * 8.0)

        cons_hits = 0
        for r in completed:
            ev = eval_map.get(r.get("evaluation_id") or "")
            if not ev or ev.get("agrees_with_ai", True) or "CHANGE_REASON:" in str(r.get("note") or ""):
                cons_hits += 1
        cons_score = (cons_hits / len(completed) * 100.0) if completed else 100.0

        hours = [
            (_parse_dt(r["ended_at"]) - _parse_dt(r["assigned_at"])).total_seconds() / 3600.0
            for r in completed
            if _parse_dt(r.get("ended_at")) and _parse_dt(r.get("assigned_at")) and _parse_dt(r["ended_at"]) >= _parse_dt(r["assigned_at"])
        ]
        avg_h = (sum(hours) / len(hours)) if hours else target_h
        speed_score = 100.0 if avg_h <= target_h else max(0.0, 100.0 * (1.0 - (avg_h - target_h) / max(48.0 - target_h, 1.0)))

        raw_score = sla_score * w_sla + depth_avg * w_depth + cons_score * w_cons + speed_score * w_spd
        p_level, deduction = _strike_deduction(expired, pcfg)
        final_score = round(min(100.0, max(0.0, raw_score - deduction)), 1)
        tier = _classify_tier(final_score, cfg)
        out[eid] = {
            "rps_score": final_score,
            "rps_tier": tier,
            "priority_rank": 0 if tier == "gold" else (1 if tier == "standard" else 2),
            "overdue_30d": expired,
            "penalty_level": p_level,
            "completed_30d": len(completed),
            "breakdown": {
                "sla_score": round(sla_score, 1),
                "depth_score": round(depth_avg, 1),
                "consistency_score": round(cons_score, 1),
                "speed_score": round(speed_score, 1),
                "deduction": deduction,
            },
        }
    return out
