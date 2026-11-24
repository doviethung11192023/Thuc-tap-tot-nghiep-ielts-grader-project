"""Phạt lũy tiến khi Chuyên gia để quá hạn SLA 48h (Wave 5 Pillar 3)."""
from datetime import datetime, timedelta, timezone
from typing import Any

from app.db.supabase import db
from app.services.admin.staff_accounts import write_audit
from app.services.expert.expert_policy_config import get_penalty_config
from app.services.expert.sla_service import TZ_VN
from app.services.notification_service import create_notification


def _dt_vn(raw: Any) -> datetime | None:
    if not raw:
        return None
    try:
        dt = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        return dt.replace(tzinfo=TZ_VN) if dt.tzinfo is None else dt.astimezone(TZ_VN)
    except Exception:
        return None


def apply_overdue_penalty(expert_id: str, assignment_id: str, now_vn: datetime | None = None) -> dict[str, Any]:
    """Đếm số lần expired 30 ngày gần nhất và thi hành phạt cấp 1 / 2 / 3+."""
    now_dt = now_vn or datetime.now(TZ_VN)
    cfg = get_penalty_config()
    cutoff_dt = now_dt - timedelta(days=int(cfg.get("window_days", 30)))

    raw_expired = (
        db().table("review_assignments")
        .select("id, ended_at")
        .eq("expert_id", expert_id)
        .eq("end_reason", "expired")
        .execute()
        .data
        or []
    )
    expired_rows = [r for r in raw_expired if (_dt_vn(r.get("ended_at")) or now_dt) >= cutoff_dt]
    strikes = max(1, len(expired_rows))

    exp_rows = (
        db().table("expert_profiles")
        .select("is_available, max_active_reviews")
        .eq("user_id", expert_id)
        .limit(1)
        .execute()
        .data
        or []
    )
    exp_prof = exp_rows[0] if exp_rows else {}
    cur_max = max(int(exp_prof.get("max_active_reviews") or 5), 1)

    if strikes == 1:
        create_notification(
            user_id=expert_id,
            notification_type="expert_sla_expired",
            title="Cảnh báo quá hạn SLA 48h (Mức 1)",
            message=f"Bài chấm đã bị thu hồi do quá hạn 48h. RPS bị trừ {cfg.get('strike1_rps_deduction', 10)} điểm.",
            action_url="/expert/profile",
            metadata={"strike": 1, "assignment_id": assignment_id},
        )
        write_audit(None, "expert_sla_penalty_strike1", "expert_profiles", expert_id, after={"strikes_30d": strikes, "assignment_id": assignment_id})
        return {"strike": 1, "action": "warning"}

    if strikes == 2:
        new_max = max(1, int(cur_max * float(cfg.get("strike2_capacity_ratio", 0.5))))
        db().table("expert_profiles").update({"max_active_reviews": new_max}).eq("user_id", expert_id).execute()
        create_notification(
            user_id=expert_id,
            notification_type="expert_penalty_notice",
            title="Giảm giới hạn nhận bài do quá hạn SLA lần 2",
            message=f"Trần bài đang chấm đã giảm từ {cur_max} xuống {new_max} trong {cfg.get('strike2_cooldown_days', 7)} ngày.",
            action_url="/expert/profile",
            metadata={"strike": 2, "old_max": cur_max, "new_max": new_max},
        )
        write_audit(None, "expert_sla_penalty_strike2", "expert_profiles", expert_id, before={"max_active_reviews": cur_max}, after={"max_active_reviews": new_max, "strikes_30d": strikes})
        return {"strike": 2, "action": "throttle_capacity", "new_max": new_max}

    db().table("expert_profiles").update({"is_available": False}).eq("user_id", expert_id).execute()
    create_notification(
        user_id=expert_id,
        notification_type="expert_penalty_notice",
        title="Tạm ngắt điều phối tự động do quá hạn SLA (>= 3 lần)",
        message=f"Trạng thái nhận bài tự động đã chuyển sang Tạm ngưng ({cfg.get('strike3_cooldown_days', 14)} ngày). Liên hệ Admin để kích hoạt lại.",
        action_url="/expert/profile",
        metadata={"strike": strikes, "assignment_id": assignment_id},
    )
    admins = db().table("profiles").select("id").eq("role", "admin").eq("is_active", True).execute().data or []
    for adm in admins:
        create_notification(
            user_id=adm["id"],
            notification_type="admin_expert_suspended",
            title="Chuyên gia tạm ngưng do quá hạn SLA liên tiếp",
            message=f"Chuyên gia ({expert_id[:8]}) đạt {strikes} lần quá hạn trong 30 ngày và đã tự động chuyển is_available=false.",
            action_url="/admin/statistics",
            metadata={"expert_id": expert_id, "strikes_30d": strikes},
        )
    write_audit(None, "expert_sla_penalty_strike3", "expert_profiles", expert_id, before={"is_available": exp_prof.get("is_available", True)}, after={"is_available": False, "strikes_30d": strikes})
    return {"strike": strikes, "action": "suspend_availability"}
