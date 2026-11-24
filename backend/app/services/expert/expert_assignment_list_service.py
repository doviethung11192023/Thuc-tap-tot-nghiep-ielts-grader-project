"""Danh sách bài chấm được phân công cho một Expert, kèm thông tin đề, học viên và hạn chót."""
from datetime import datetime
from typing import Any, Optional

from app.db.supabase import db
from app.schemas.expert import ExpertAssignmentItem
from app.services.expert.sla_service import (
    TZ_VN,
    get_sla_hours,
    is_within_decline_window,
    remaining_business_hours,
)


def list_expert_assignments(expert_id: str, status_filter: Optional[str] = "active") -> list[ExpertAssignmentItem]:
    """status_filter: 'active' (chưa kết thúc), 'completed' (đã kết thúc), khác = tất cả. Sắp theo hạn chót tăng dần."""
    query = db().table("review_assignments").select("*").eq("expert_id", expert_id)
    if status_filter == "active":
        query = query.is_("ended_at", "null")
    elif status_filter == "completed":
        query = query.not_.is_("ended_at", "null")

    query = query.order("due_at", desc=False)
    res = query.execute()

    rows = res.data or []
    attempt_ids = list({a["attempt_id"] for a in rows if a.get("attempt_id")})
    attempts_map: dict[str, dict[str, Any]] = {}
    learners_map: dict[str, dict[str, Any]] = {}

    if attempt_ids:
        att_res = (
            db().table("attempts")
            .select("id, skill, mode, test_id, learner_id, tests(title)")
            .in_("id", attempt_ids)
            .execute()
        )
        attempts_map = {att["id"]: att for att in (att_res.data or [])}
        learner_ids = list({att["learner_id"] for att in (att_res.data or []) if att.get("learner_id")})
        if learner_ids:
            prof_res = db().table("profiles").select("id, full_name, email").in_("id", learner_ids).execute()
            learners_map = {p["id"]: p for p in (prof_res.data or [])}

    items = []
    now_vn = datetime.now(TZ_VN)
    _, decline_hours = get_sla_hours()

    for a in rows:
        att = attempts_map.get(a["attempt_id"], {})
        test_info = att.get("tests", {}) if isinstance(att.get("tests"), dict) else {}
        test_title = test_info.get("title", f"Bài thi {att.get('skill', '').title()}")
        learner = learners_map.get(att.get("learner_id") or "", {})

        assigned_at_dt = datetime.fromisoformat(str(a["assigned_at"]).replace("Z", "+00:00"))
        due_at_dt = datetime.fromisoformat(str(a["due_at"]).replace("Z", "+00:00"))
        rem_hours = remaining_business_hours(now_vn, due_at_dt)

        can_decline = (
            a.get("ended_at") is None and
            a.get("started_at") is None and
            is_within_decline_window(assigned_at_dt, decline_hours, now_vn)
        )

        items.append(ExpertAssignmentItem(
            id=a["id"],
            request_id=a["request_id"],
            attempt_id=a["attempt_id"],
            expert_id=a["expert_id"],
            skill=att.get("skill", "writing"),
            source=att.get("mode", "mock"),
            test_title=test_title,
            learner_name=learner.get("full_name"),
            learner_email=learner.get("email"),
            assigned_at=a["assigned_at"],
            started_at=a.get("started_at"),
            due_at=a["due_at"],
            ended_at=a.get("ended_at"),
            end_reason=a.get("end_reason"),
            note=a.get("note"),
            evaluation_id=a.get("evaluation_id"),
            can_decline=can_decline,
            remaining_hours=rem_hours,
        ))

    return items
