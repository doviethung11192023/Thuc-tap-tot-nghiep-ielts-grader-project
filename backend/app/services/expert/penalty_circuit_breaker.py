"""Progressive Penalty Circuit Breaker + BR-26 Pool Guard + Admin Waive (Pillar 3)."""
from datetime import datetime, timedelta, timezone
from typing import Any

from app.core.domain_errors import DomainError
from app.db.supabase import db
from app.services.admin.staff_accounts import write_audit
from app.services.expert.expert_policy_config import (
    get_cooldown_min_active_pool,
    get_penalty_config,
)
from app.services.expert.expert_tier_evaluation_service import refresh_single_expert_tier
from app.services.expert.sla_service import TZ_VN
from app.services.notification_service import create_notification


def _parse_dt(raw: Any) -> datetime | None:
    if not raw:
        return None
    try:
        dt = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)
    except Exception:
        return None


def _active_pool_excluding(expert_id: str, now_utc: datetime) -> int:
    ep_rows = db().table("expert_profiles").select("user_id, is_available, cooldown_until, is_suspended_by_penalty").execute().data or []
    prof_rows = db().table("profiles").select("id, is_active").execute().data or []
    active_map = {p["id"]: p.get("is_active", True) is not False for p in prof_rows}
    cnt = 0
    for ep in ep_rows:
        uid = ep.get("user_id")
        if not uid or uid == expert_id or not ep.get("is_available") or ep.get("is_suspended_by_penalty"):
            continue
        if prof_rows and not active_map.get(uid, True):
            continue
        cd = _parse_dt(ep.get("cooldown_until"))
        if cd and cd > now_utc:
            continue
        cnt += 1
    return cnt


def _notify_admins(title: str, message: str, expert_id: str, extra: dict[str, Any]) -> None:
    admins = db().table("profiles").select("id").eq("role", "admin").eq("is_active", True).execute().data or []
    for adm in admins:
        create_notification(
            user_id=adm["id"],
            notification_type="admin_expert_suspended",
            title=title,
            message=message,
            action_url="/admin/reviews",
            metadata={"expert_id": expert_id, **extra},
        )


def record_expert_penalty(
    expert_id: str,
    reason: str = "sla_expired",
    assignment_id: str | None = None,
    note: str | None = None,
    now_vn: datetime | None = None,
) -> dict[str, Any]:
    """Ghi nhận vi phạm vào expert_penalties (idempotent) và thi hành xử lý lũy tiến 30 ngày."""
    now_dt = (now_vn or datetime.now(TZ_VN)).astimezone(timezone.utc)
    if assignment_id:
        existing = [
            p for p in (db().table("expert_penalties").select("*").eq("assignment_id", assignment_id).eq("reason", reason).execute().data or [])
            if p.get("waived_at") is None
        ]
        if existing:
            return {"id": existing[0]["id"], "severity": existing[0]["severity"], "duplicate": True}

    cfg = get_penalty_config()
    cutoff = now_dt - timedelta(days=int(cfg.get("window_days", 30)))
    all_pens = db().table("expert_penalties").select("*").eq("expert_id", expert_id).execute().data or []
    active_sla = [
        p for p in all_pens
        if p.get("waived_at") is None and p.get("reason") == "sla_expired" and (_parse_dt(p.get("created_at")) or now_dt) >= cutoff
    ]
    strike_num = (len(active_sla) + 1) if reason == "sla_expired" else len(active_sla)

    if reason != "sla_expired" or strike_num <= 1:
        severity = "warning"
        cd_until = None
    elif strike_num == 2:
        severity = "throttle"
        cd_until = None
    else:
        min_pool = get_cooldown_min_active_pool()
        if _active_pool_excluding(expert_id, now_dt) < min_pool:
            severity = "throttle"
            cd_until = None
            note = f"{note or ''} [BR-26: Giữ nguyên pool < {min_pool} chuyên gia hoạt động]".strip()
        else:
            days = int(cfg.get("strike2_cooldown_days", 7)) if strike_num == 3 else int(cfg.get("strike3_cooldown_days", 14))
            severity = "cooldown" if strike_num == 3 else "suspended"
            cd_until = (now_dt + timedelta(days=days)).isoformat()

    ins = db().table("expert_penalties").insert({
        "expert_id": expert_id,
        "assignment_id": assignment_id,
        "reason": reason,
        "severity": severity,
        "cooldown_until": cd_until,
        "note": note,
    }).execute().data or [{}]
    pen_id = ins[0].get("id")

    if severity == "warning":
        db().table("expert_profiles").update({"consecutive_clean_reviews": 0}).eq("user_id", expert_id).execute()
        create_notification(
            user_id=expert_id,
            notification_type="expert_sla_expired" if reason == "sla_expired" else "expert_penalty_notice",
            title="Cảnh báo vi phạm SLA / Quy chế chấm bài (Mức 1)",
            message=note or "Bài chấm đã quá hạn SLA 48h và được thu hồi để điều phối lại.",
            action_url="/expert/profile",
            metadata={"penalty_id": pen_id, "strike": strike_num, "assignment_id": assignment_id},
        )
    elif severity == "throttle":
        db().table("expert_profiles").update({"tier": "probation", "max_active_reviews": 2, "consecutive_clean_reviews": 0}).eq("user_id", expert_id).execute()
        create_notification(
            user_id=expert_id,
            notification_type="expert_penalty_notice",
            title="Giảm giới hạn nhận bài (Mức Probation)",
            message="Hạng hiệu suất chuyển sang Probation (tối đa 2 bài/lượt). Hoàn thành 3 bài chuẩn liên tiếp để phục hồi.",
            action_url="/expert/profile",
            metadata={"penalty_id": pen_id, "strike": strike_num},
        )
        if strike_num >= 3:
            _notify_admins("Cảnh báo pool Chuyên gia chạm ngưỡng BR-26", f"Chuyên gia ({expert_id[:8]}) đạt {strike_num} lỗi SLA nhưng được giữ mở vì pool còn < {get_cooldown_min_active_pool()} người.", expert_id, {"strike": strike_num, "pool_guard": True})
    else:
        db().table("expert_profiles").update({
            "is_available": False, "tier": "probation", "max_active_reviews": 2,
            "cooldown_until": cd_until, "consecutive_clean_reviews": 0,
            "is_suspended_by_penalty": severity == "suspended",
        }).eq("user_id", expert_id).execute()
        create_notification(
            user_id=expert_id,
            notification_type="expert_penalty_notice",
            title="Tạm ngưng điều phối do quá hạn SLA liên tiếp",
            message="Tài khoản tạm nghỉ điều phối tự động do quá hạn SLA >= 3 lần trong 30 ngày.",
            action_url="/expert/profile",
            metadata={"penalty_id": pen_id, "strike": strike_num, "cooldown_until": cd_until},
        )
        _notify_admins("Chuyên gia tạm ngưng do vi phạm SLA", f"Chuyên gia ({expert_id[:8]}) đạt {strike_num} lần quá hạn 30d và đã chuyển cooldown ({severity}).", expert_id, {"strike": strike_num, "severity": severity})

    write_audit(None, f"expert_penalty_{severity}", "expert_penalties", pen_id, after={"expert_id": expert_id, "reason": reason, "strike": strike_num, "severity": severity})
    return {"id": pen_id, "severity": severity, "strike": strike_num, "cooldown_until": cd_until}


def check_weekly_decline_penalty(expert_id: str, now_vn: datetime | None = None) -> dict[str, Any] | None:
    """Phạt cảnh báo nếu tỷ lệ từ chối 7 ngày > 30% (tối thiểu 4 lượt nhận)."""
    now_dt = (now_vn or datetime.now(TZ_VN)).astimezone(timezone.utc)
    cutoff = now_dt - timedelta(days=7)
    recent_asgns = [
        r for r in (db().table("review_assignments").select("id, end_reason, assigned_at").eq("expert_id", expert_id).execute().data or [])
        if (_parse_dt(r.get("assigned_at")) or now_dt) >= cutoff
    ]
    if len(recent_asgns) < 4:
        return None
    declined = sum(1 for r in recent_asgns if r.get("end_reason") == "declined")
    if declined / len(recent_asgns) <= 0.30:
        return None
    recent_warn = [
        p for p in (db().table("expert_penalties").select("id, created_at, waived_at").eq("expert_id", expert_id).eq("reason", "high_decline_rate").execute().data or [])
        if p.get("waived_at") is None and (_parse_dt(p.get("created_at")) or now_dt) >= cutoff
    ]
    if recent_warn:
        return None
    return record_expert_penalty(
        expert_id=expert_id,
        reason="high_decline_rate",
        note=f"Tỷ lệ từ chối bài 7 ngày đạt {declined}/{len(recent_asgns)} (> 30%).",
        now_vn=now_dt.astimezone(TZ_VN),
    )


def waive_penalty(penalty_id: str, admin_id: str, waive_reason: str) -> dict[str, Any]:
    """Admin miễn phạt có giải trình (>= 10 ký tự), ghi audit và tính lại hạng/cooldown."""
    rows = db().table("expert_penalties").select("*").eq("id", penalty_id).limit(1).execute().data or []
    if not rows:
        raise DomainError("Không tìm thấy bản ghi vi phạm này", 404)
    pen = rows[0]
    if pen.get("waived_at") is not None:
        raise DomainError("Bản ghi vi phạm này đã được miễn phạt trước đó", 409)

    now_iso = datetime.now(timezone.utc).isoformat()
    db().table("expert_penalties").update({
        "waived_by": admin_id,
        "waived_at": now_iso,
        "waive_reason": waive_reason.strip(),
    }).eq("id", penalty_id).execute()

    expert_id = pen["expert_id"]
    now_dt = datetime.now(timezone.utc)
    cutoff = now_dt - timedelta(days=30)
    rem_sla = sum(
        1 for p in (db().table("expert_penalties").select("*").eq("expert_id", expert_id).execute().data or [])
        if p.get("waived_at") is None and p.get("reason") == "sla_expired" and (_parse_dt(p.get("created_at")) or now_dt) >= cutoff
    )
    ep_fix: dict[str, Any] = {}
    if rem_sla < 3:
        ep_fix.update({"cooldown_until": None, "is_suspended_by_penalty": False, "is_available": True})
    if rem_sla < 2:
        ep_fix["max_active_reviews"] = 5
    if ep_fix:
        db().table("expert_profiles").update(ep_fix).eq("user_id", expert_id).execute()

    new_tier = refresh_single_expert_tier(expert_id, now_dt)
    write_audit(admin_id, "expert_penalty_waived", "expert_penalties", penalty_id, before={"waived_at": None}, after={"waive_reason": waive_reason.strip(), "new_tier": new_tier})
    create_notification(
        user_id=expert_id,
        notification_type="expert_penalty_notice",
        title="Admin đã gỡ bỏ ghi nhận vi phạm",
        message=f"Admin đã miễn phạt với lý do: {waive_reason.strip()}. Hạng hiện tại: {new_tier}.",
        action_url="/expert/profile",
        metadata={"penalty_id": penalty_id, "new_tier": new_tier},
    )
    return {"penalty_id": penalty_id, "expert_id": expert_id, "waived_at": now_iso, "new_tier": new_tier, "remaining_sla_strikes_30d": rem_sla}
