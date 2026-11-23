"""Dịch vụ Admin theo dõi và điều phối (gán / chuyển giao) bài chấm Chuyên gia."""
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.core.domain_errors import DomainError
from app.db.supabase import db
from app.services.expert.sla_service import TZ_VN, calculate_review_due_at
from app.services.notifications.notification_service import notify_expert_assigned


def _build_experts_workload() -> List[Dict[str, Any]]:
    """Lấy toàn bộ Expert cùng trạng thái sẵn sàng và số bài đang mở."""
    exp_rows = db().table("expert_profiles").select("user_id, is_available, max_active_reviews").execute().data or []
    if not exp_rows:
        return []

    user_ids = [r["user_id"] for r in exp_rows]
    prof_rows = (
        db().table("profiles")
        .select("id, email, full_name, is_active")
        .in_("id", user_ids)
        .execute()
        .data
        or []
    )
    prof_map = {p["id"]: p for p in prof_rows}

    open_rows = (
        db().table("review_assignments")
        .select("expert_id")
        .is_("ended_at", "null")
        .execute()
        .data
        or []
    )
    active_counts: Dict[str, int] = {}
    for row in open_rows:
        eid = row.get("expert_id")
        if eid:
            active_counts[eid] = active_counts.get(eid, 0) + 1

    experts: List[Dict[str, Any]] = []
    for exp in exp_rows:
        uid = exp["user_id"]
        prof = prof_map.get(uid, {})
        experts.append({
            "user_id": uid,
            "email": prof.get("email", ""),
            "full_name": prof.get("full_name") or prof.get("email") or "Expert",
            "is_active": bool(prof.get("is_active", True)),
            "is_available": bool(exp.get("is_available", False)),
            "max_active_reviews": int(exp.get("max_active_reviews") or 5),
            "active_open": active_counts.get(uid, 0),
        })

    experts.sort(key=lambda e: (not e["is_active"], not e["is_available"], e["active_open"], e["email"]))
    return experts


def list_admin_reviews(
    page: int = 1,
    limit: int = 20,
    status_filter: Optional[str] = None,
    skill: Optional[str] = None,
    expert_id: Optional[str] = None,
    search: Optional[str] = None,
) -> Dict[str, Any]:
    """Liệt kê tất cả review_requests kèm Expert đang giữ và danh sách tải Expert."""
    experts = _build_experts_workload()
    expert_map = {e["user_id"]: e for e in experts}

    all_reqs = (
        db().table("review_requests")
        .select("id, attempt_id, learner_id, status, requested_at")
        .order("requested_at", desc=True)
        .execute()
        .data
        or []
    )

    req_ids = [r["id"] for r in all_reqs]
    attempt_ids = list({r["attempt_id"] for r in all_reqs if r.get("attempt_id")})
    learner_ids = list({r["learner_id"] for r in all_reqs if r.get("learner_id")})

    attempts_map: Dict[str, Dict[str, Any]] = {}
    tests_map: Dict[str, str] = {}
    if attempt_ids:
        att_rows = (
            db().table("attempts")
            .select("id, skill, mode, status, test_id")
            .in_("id", attempt_ids)
            .execute()
            .data
            or []
        )
        attempts_map = {a["id"]: a for a in att_rows}
        test_ids = list({a["test_id"] for a in att_rows if a.get("test_id")})
        if test_ids:
            test_rows = db().table("tests").select("id, title").in_("id", test_ids).execute().data or []
            tests_map = {t["id"]: t.get("title") or "IELTS Test" for t in test_rows}

    learners_map: Dict[str, Dict[str, Any]] = {}
    if learner_ids:
        l_rows = db().table("profiles").select("id, email, full_name").in_("id", learner_ids).execute().data or []
        learners_map = {l["id"]: l for l in l_rows}

    asgn_by_req: Dict[str, List[Dict[str, Any]]] = {}
    if req_ids:
        asgn_rows = (
            db().table("review_assignments")
            .select("id, request_id, expert_id, assigned_at, due_at, started_at, ended_at, end_reason, note")
            .in_("request_id", req_ids)
            .order("assigned_at", desc=True)
            .execute()
            .data
            or []
        )
        for row in asgn_rows:
            asgn_by_req.setdefault(row["request_id"], []).append(row)

    summary = {
        "total": len(all_reqs),
        "waiting": sum(1 for r in all_reqs if r.get("status") == "waiting"),
        "assigned": sum(1 for r in all_reqs if r.get("status") in ("assigned", "in_progress")),
        "completed": sum(1 for r in all_reqs if r.get("status") == "completed"),
        "available_experts": sum(1 for e in experts if e["is_active"] and e["is_available"]),
    }

    enriched: List[Dict[str, Any]] = []
    q_text = (search or "").strip().lower()

    for req in all_reqs:
        att = attempts_map.get(req.get("attempt_id") or "", {})
        req_skill = att.get("skill") or "writing"
        learner = learners_map.get(req.get("learner_id") or "", {})
        test_title = tests_map.get(att.get("test_id") or "", "Đề luyện tập IELTS")
        asgns = asgn_by_req.get(req["id"], [])
        open_asgn = next((a for a in asgns if a.get("ended_at") is None), None)
        latest_asgn = open_asgn or (asgns[0] if asgns else None)

        cur_expert_id = open_asgn["expert_id"] if open_asgn else (latest_asgn["expert_id"] if latest_asgn and req.get("status") == "completed" else None)
        cur_expert = expert_map.get(cur_expert_id) if cur_expert_id else None

        if status_filter and req.get("status") != status_filter:
            continue
        if skill and req_skill != skill:
            continue
        if expert_id and cur_expert_id != expert_id:
            continue
        if q_text:
            haystack = " ".join([
                req["id"],
                req.get("attempt_id") or "",
                learner.get("email") or "",
                learner.get("full_name") or "",
                test_title,
                (cur_expert or {}).get("email") or "",
            ]).lower()
            if q_text not in haystack:
                continue

        enriched.append({
            "request_id": req["id"],
            "attempt_id": req.get("attempt_id"),
            "status": req.get("status"),
            "source": att.get("mode") or "practice",
            "skill": req_skill,
            "requested_at": req.get("requested_at"),
            "test_title": test_title,
            "learner": {
                "id": req.get("learner_id"),
                "email": learner.get("email") or "",
                "full_name": learner.get("full_name") or learner.get("email") or "Học viên",
            },
            "current_assignment": {
                "id": (open_asgn or latest_asgn)["id"],
                "expert_id": cur_expert_id,
                "expert_email": (cur_expert or {}).get("email", ""),
                "expert_name": (cur_expert or {}).get("full_name", "Expert"),
                "assigned_at": (open_asgn or latest_asgn).get("assigned_at"),
                "due_at": (open_asgn or latest_asgn).get("due_at"),
                "started_at": (open_asgn or latest_asgn).get("started_at"),
                "ended_at": (open_asgn or latest_asgn).get("ended_at"),
                "end_reason": (open_asgn or latest_asgn).get("end_reason"),
            } if (open_asgn or latest_asgn) and cur_expert_id else None,
            "reassigned_count": sum(1 for a in asgns if a.get("end_reason") == "reassigned"),
        })

    total = len(enriched)
    start = (page - 1) * limit
    paged = enriched[start : start + limit]

    return {
        "items": paged,
        "total": total,
        "page": page,
        "limit": limit,
        "summary": summary,
        "experts": experts,
    }


def admin_assign_review_request(
    request_id: str,
    target_expert_id: str,
    admin_user_id: str,
    note: Optional[str] = None,
) -> Dict[str, Any]:
    """Admin toàn quyền gán mới hoặc chuyển giao (reassign) yêu cầu chấm cho bất kỳ Expert nào đang hoạt động."""
    req_res = db().table("review_requests").select("id, attempt_id, status").eq("id", request_id).execute()
    if not req_res.data:
        raise DomainError("Yêu cầu chấm bài không tồn tại", 404)

    req = req_res.data[0]
    if req.get("status") in ("completed", "cancelled"):
        raise DomainError("Không thể chuyển giao yêu cầu đã hoàn thành hoặc đã hủy", 400)

    exp_res = db().table("expert_profiles").select("user_id, is_available, max_active_reviews").eq("user_id", target_expert_id).execute()
    if not exp_res.data:
        raise DomainError("Chuyên gia đích không tồn tại", 404)

    prof_res = db().table("profiles").select("id, email, full_name, is_active").eq("id", target_expert_id).execute()
    if not prof_res.data or not prof_res.data[0].get("is_active", True):
        raise DomainError("Tài khoản chuyên gia đích đang bị khóa", 400)

    target_prof = prof_res.data[0]
    now_vn = datetime.now(TZ_VN)

    open_res = (
        db().table("review_assignments")
        .select("id, expert_id")
        .eq("request_id", request_id)
        .is_("ended_at", "null")
        .execute()
    )
    open_asgns = open_res.data or []
    previous_expert_id: Optional[str] = None

    if open_asgns:
        if any(a.get("expert_id") == target_expert_id for a in open_asgns):
            raise DomainError("Bài chấm này hiện đang được giao cho chuyên gia này rồi", 400)
        previous_expert_id = open_asgns[0].get("expert_id")
        close_note = (note or "").strip() or f"Admin điều phối lại ({admin_user_id[:8]})"
        for a in open_asgns:
            db().table("review_assignments").update({
                "ended_at": now_vn.isoformat(),
                "end_reason": "reassigned",
                "note": close_note,
            }).eq("id", a["id"]).execute()

    due_at = calculate_review_due_at(now_vn, 48.0)
    new_asgn = db().table("review_assignments").insert({
        "request_id": request_id,
        "attempt_id": req["attempt_id"],
        "expert_id": target_expert_id,
        "assigned_at": now_vn.isoformat(),
        "due_at": due_at.isoformat(),
    }).execute()

    db().table("review_requests").update({"status": "assigned"}).eq("id", request_id).execute()

    assignment_id = (new_asgn.data or [{}])[0].get("id")
    notify_expert_assigned(
        assignment_id=assignment_id,
        attempt_id=req["attempt_id"],
        expert_id=target_expert_id,
        reassigned=bool(open_asgns),
    )

    return {
        "request_id": request_id,
        "attempt_id": req["attempt_id"],
        "assignment_id": assignment_id,
        "previous_expert_id": previous_expert_id,
        "expert_id": target_expert_id,
        "expert_email": target_prof.get("email"),
        "expert_name": target_prof.get("full_name"),
        "reassigned": bool(open_asgns),
    }
