"""
Dịch vụ Điều phối và Chấm bài của Chuyên gia (BR-11, FR-39..46, UC-15..16, SD-06..07).
"""
from datetime import datetime, timezone
import logging
from typing import Any, Dict

from app.core.domain_errors import DomainError
from app.db.supabase import db
from app.services.expert.expert_policy_config import TIER_PRIORITY_RANK
from app.services.expert.penalty_circuit_breaker import check_weekly_decline_penalty
from app.services.expert.review_submit_service import submit_final_review_impl
from app.services.expert.sla_service import (
    TZ_VN,
    calculate_review_due_at,
    get_sla_hours,
    is_within_decline_window,
)
from app.services.notification_service import notify_expert_assigned

logger = logging.getLogger(__name__)


def _parse_utc(raw: Any) -> datetime | None:
    if not raw:
        return None
    try:
        dt = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)
    except Exception:
        return None


async def auto_dispatch_pending_requests() -> int:
    """Điều phối bài đang chờ: Mock ưu tiên Top/High Performer, khóa Cooldown/Suspended."""
    waiting_requests = (
        db().table("review_request_details")
        .select("request_id, attempt_id, skill, source, requested_at")
        .eq("status", "waiting")
        .execute()
    )
    if not waiting_requests.data:
        return 0

    sorted_requests = sorted(
        waiting_requests.data,
        key=lambda r: (0 if r.get("source") == "mock" else 1, r.get("requested_at")),
    )
    available_experts = (
        db().table("expert_profiles")
        .select("user_id, max_active_reviews, is_available, tier, cooldown_until, is_suspended_by_penalty")
        .eq("is_available", True)
        .execute()
    )
    if not available_experts.data:
        return 0

    now_vn = datetime.now(TZ_VN)
    now_utc = now_vn.astimezone(timezone.utc)
    exp_ids = [e["user_id"] for e in available_experts.data if e.get("user_id")]
    prof_rows = db().table("profiles").select("id, is_active").in_("id", exp_ids).execute().data or []
    active_map = {p["id"]: bool(p.get("is_active", True)) for p in prof_rows}

    active_experts = []
    for e in available_experts.data:
        uid = e.get("user_id")
        if not uid or (active_map and not active_map.get(uid, False)):
            continue
        if e.get("is_suspended_by_penalty"):
            continue
        cd = _parse_utc(e.get("cooldown_until"))
        if cd and cd > now_utc:
            continue
        active_experts.append(e)
    if not active_experts:
        return 0

    due_hours, _ = get_sla_hours()
    open_rows = db().table("review_assignments").select("expert_id").is_("ended_at", "null").execute().data or []
    active_counts: Dict[str, int] = {}
    for row in open_rows:
        if eid := row.get("expert_id"):
            active_counts[eid] = active_counts.get(eid, 0) + 1

    assigned_count = 0
    for req in sorted_requests:
        request_id, attempt_id = req["request_id"], req["attempt_id"]
        is_mock = req.get("source") == "mock"
        history = db().table("review_assignments").select("expert_id, end_reason").eq("request_id", request_id).execute().data or []
        excluded = {h["expert_id"] for h in history if h.get("end_reason") in ("declined", "expired")}

        candidates = []
        for exp in active_experts:
            eid = exp["user_id"]
            if eid in excluded:
                continue
            max_rev = max(int(exp.get("max_active_reviews") or 5), 1)
            cur_load = active_counts.get(eid, 0)
            if cur_load >= max_rev:
                continue
            tier = str(exp.get("tier") or "standard")
            prio = TIER_PRIORITY_RANK.get(tier, 2)
            is_prob = 1 if tier == "probation" else 0
            eff_load = cur_load - (1 if (is_mock and tier in ("top_expert", "high_performer")) else 0)
            candidates.append((is_prob, eff_load if is_mock else cur_load, prio, cur_load / max_rev, eid))

        if not candidates:
            continue
        candidates.sort()
        chosen_expert = candidates[0][-1]
        active_counts[chosen_expert] = active_counts.get(chosen_expert, 0) + 1
        due_at = calculate_review_due_at(now_vn, due_hours)
        asgn_res = db().table("review_assignments").insert({
            "request_id": request_id, "attempt_id": attempt_id, "expert_id": chosen_expert,
            "assigned_at": now_vn.isoformat(), "due_at": due_at.isoformat(),
        }).execute()
        db().table("review_requests").update({"status": "assigned"}).eq("id", request_id).execute()
        assigned_id = (asgn_res.data or [{}])[0].get("id")
        notify_expert_assigned(assignment_id=assigned_id, attempt_id=attempt_id, expert_id=chosen_expert, reassigned=False)
        assigned_count += 1

    return assigned_count


async def decline_assignment_by_expert(assignment_id: str, expert_id: str, note: str) -> Dict[str, Any]:
    """Từ chối nhận bài trong 2h làm việc đầu (FR-39) & kiểm tra tỷ lệ từ chối 7 ngày."""
    res = db().table("review_assignments").select("*").eq("id", assignment_id).execute()
    if not res.data:
        raise DomainError("Assignment không tồn tại", 404)
    assignment = res.data[0]
    if assignment["expert_id"] != expert_id:
        raise DomainError("Bạn không có quyền từ chối bài chấm này", 403)
    if assignment.get("ended_at") is not None:
        raise DomainError("Bài chấm này đã kết thúc trước đó", 400)
    if assignment.get("started_at") is not None:
        raise DomainError("Bạn đã bấm bắt đầu chấm bài nên không thể từ chối", 400)

    assigned_at = datetime.fromisoformat(str(assignment["assigned_at"]).replace("Z", "+00:00"))
    now_vn = datetime.now(TZ_VN)
    _, decline_hours = get_sla_hours()
    if not is_within_decline_window(assigned_at, decline_hours, now_vn):
        raise DomainError(f"Đã quá {decline_hours:g} giờ làm việc kể từ lúc nhận bài, bạn không thể từ chối", 400)

    db().table("review_assignments").update({
        "ended_at": now_vn.isoformat(),
        "end_reason": "declined",
        "note": f"EXPERT_DECLINED: {note.strip()}",
    }).eq("id", assignment_id).execute()
    db().table("review_requests").update({"status": "waiting"}).eq("id", assignment["request_id"]).execute()
    try:
        check_weekly_decline_penalty(expert_id, now_vn)
    except Exception as exc:
        logger.warning("Weekly decline check failed for %s: %s", expert_id, exc)
    return {"status": "declined", "assignment_id": assignment_id}


async def start_expert_grading_draft(assignment_id: str, expert_id: str) -> Dict[str, Any]:
    """Bắt đầu chấm bài (UC-16): đánh dấu started_at và clone draft từ AI nếu chưa có."""
    res = db().table("review_assignments").select("*").eq("id", assignment_id).execute()
    if not res.data:
        raise DomainError("Assignment không tồn tại", 404)
    assignment = res.data[0]
    if assignment["expert_id"] != expert_id:
        raise DomainError("Bạn không có quyền chấm bài này", 403)

    now_vn = datetime.now(TZ_VN)
    attempt_id = assignment["attempt_id"]
    if not assignment.get("started_at"):
        db().table("review_assignments").update({"started_at": now_vn.isoformat()}).eq("id", assignment_id).execute()

    eval_res = db().table("evaluations").select("*").eq("attempt_id", attempt_id).eq("evaluator_type", "expert").execute()
    expert_eval = eval_res.data[0] if eval_res.data else None
    if not expert_eval:
        ai_res = db().table("evaluations").select("*").eq("attempt_id", attempt_id).eq("evaluator_type", "ai").order("created_at", desc=True).limit(1).execute()
        ai_eval = ai_res.data[0] if ai_res.data else None
        att_res = db().table("attempts").select("skill").eq("id", attempt_id).execute()
        skill = att_res.data[0]["skill"] if att_res.data else "writing"
        expert_eval = db().table("evaluations").insert({
            "attempt_id": attempt_id, "skill": skill, "evaluator_type": "expert", "status": "draft",
            "overall_band": ai_eval.get("overall_band") if ai_eval else None,
            "feedback": ai_eval.get("feedback") if ai_eval else "", "is_official": False,
        }).execute().data[0]
        db().table("review_assignments").update({"evaluation_id": expert_eval["id"], "evaluator_type": "expert"}).eq("id", assignment_id).execute()
        if ai_eval:
            crit_res = db().table("criterion_scores").select("criterion_id, task_no, skill, band, comment").eq("evaluation_id", ai_eval["id"]).execute()
            if crit_res.data:
                db().table("criterion_scores").insert([{**c, "evaluation_id": expert_eval["id"]} for c in crit_res.data]).execute()
            try:
                ann_res = db().table("annotations").select("type, category, title, original_text, corrected_text, explanation, start_pos, end_pos, essay_id").eq("evaluation_id", ai_eval["id"]).execute()
                if ann_res.data:
                    db().table("annotations").insert([{**a, "evaluation_id": expert_eval["id"], "attempt_id": attempt_id} for a in ann_res.data]).execute()
            except Exception as e:
                logger.warning("Không thể clone annotations từ AI: %s", e)

    return {"status": "draft_ready", "evaluation_id": expert_eval["id"]}


async def submit_expert_final_review(assignment_id: str, expert_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Expert nộp kết quả chấm chính thức (ủy quyền cho review_submit_service)."""
    return await submit_final_review_impl(assignment_id, expert_id, payload, start_expert_grading_draft, db_fn=db)
