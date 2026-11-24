"""
Tác vụ ARQ Cron cho SLA Chuyên gia (12h/6h warning + 48h expire) & Thu bài Mock quá hạn.
"""
from datetime import datetime, timedelta, timezone
import logging

from app.db.supabase import db
from app.services.admin.staff_accounts import write_audit
from app.services.expert.penalty_circuit_breaker import record_expert_penalty
from app.services.expert.sla_service import TZ_VN, remaining_business_hours
from app.services.notifications.notification_service import create_notification

logger = logging.getLogger(__name__)
MOCK_CRON_GRACE_MINUTES = 5


def _parse_due_vn(raw_due: object) -> datetime | None:
    if not raw_due:
        return None
    try:
        due_dt = datetime.fromisoformat(str(raw_due).replace("Z", "+00:00"))
        return due_dt.replace(tzinfo=TZ_VN) if due_dt.tzinfo is None else due_dt.astimezone(TZ_VN)
    except Exception:
        return None


def send_sla_deadline_warnings() -> int:
    """Gửi nhắc nhở SLA mốc <= 12h (stage 1) và <= 6h khẩn cấp (stage 2) không lặp lại."""
    now_vn = datetime.now(TZ_VN)
    open_rows = (
        db().table("review_assignments")
        .select("id, attempt_id, expert_id, due_at, reminder_stage")
        .is_("ended_at", "null")
        .execute()
        .data
        or []
    )
    sent = 0
    for row in open_rows:
        due_dt = _parse_due_vn(row.get("due_at"))
        eid = row.get("expert_id")
        if not due_dt or not eid:
            continue
        rem = remaining_business_hours(now_vn, due_dt)
        stage = int(row.get("reminder_stage") or 0)
        if rem <= 0:
            continue
        new_stage = 2 if rem <= 6.0 and stage < 2 else (1 if rem <= 12.0 and stage < 1 else 0)
        if not new_stage:
            continue
        db().table("review_assignments").update({"reminder_stage": new_stage}).eq("id", row["id"]).execute()
        urgent = new_stage == 2
        create_notification(
            user_id=str(eid),
            notification_type="expert_sla_warning",
            title=f"{'[KHẨN] ' if urgent else ''}Bài chấm còn {rem:g} giờ làm việc trước hạn SLA",
            message=f"Vui lòng hoàn tất bài #{str(row.get('attempt_id') or '')[:8]} trước {due_dt.strftime('%H:%M %d/%m')} để tránh vi phạm SLA.",
            action_url=f"/expert/assignments/{row['id']}",
            attempt_id=row.get("attempt_id"),
            metadata={"assignment_id": row["id"], "reminder_stage": new_stage, "remaining_hours": rem},
        )
        sent += 1
    return sent


def expire_overdue_assignments() -> int:
    """Thu hồi các review_assignments mở quá due_at -> expired và trả request về waiting (BR-11)."""
    now_vn = datetime.now(TZ_VN)
    open_rows = (
        db().table("review_assignments")
        .select("id, request_id, attempt_id, expert_id, due_at, ended_at")
        .is_("ended_at", "null")
        .execute()
        .data
        or []
    )
    expired_count = 0
    for row in open_rows:
        due_dt = _parse_due_vn(row.get("due_at"))
        if not due_dt or now_vn <= due_dt:
            continue
        asgn_id, req_id = row["id"], row["request_id"]
        db().table("review_assignments").update({
            "ended_at": now_vn.isoformat(),
            "end_reason": "expired",
            "note": f"SYSTEM_EXPIRED: Quá hạn SLA ({due_dt.strftime('%H:%M %d/%m/%Y')})",
        }).eq("id", asgn_id).is_("ended_at", "null").execute()
        db().table("review_requests").update({"status": "waiting"}).eq("id", req_id).eq("status", "assigned").execute()
        write_audit(None, "assignment_expired", "review_assignments", asgn_id, before={"expert_id": row.get("expert_id"), "due_at": row.get("due_at")}, after={"end_reason": "expired", "request_id": req_id})
        if row.get("expert_id"):
            try:
                record_expert_penalty(str(row["expert_id"]), reason="sla_expired", assignment_id=str(asgn_id), now_vn=now_vn)
            except Exception as exc:
                logger.warning("Failed overdue penalty for %s: %s", row.get("expert_id"), exc)
        expired_count += 1
    return expired_count


def auto_close_overdue_mock_attempts() -> int:
    """Đóng các phiên thi thử Mock quá deadline + ân hạn chưa nộp (FR-12) để giải phóng quota."""
    cutoff_utc = datetime.now(timezone.utc) - timedelta(minutes=MOCK_CRON_GRACE_MINUTES)
    rows = db().table("attempts").select("id, deadline_at, mode, status").eq("mode", "mock").eq("status", "in_progress").execute().data or []
    closed = 0
    for row in rows:
        raw_dl = row.get("deadline_at")
        if not raw_dl:
            continue
        try:
            dl_dt = datetime.fromisoformat(str(raw_dl).replace("Z", "+00:00"))
            dl_dt = dl_dt.replace(tzinfo=timezone.utc) if dl_dt.tzinfo is None else dl_dt
        except Exception:
            continue
        if dl_dt >= cutoff_utc:
            continue
        db().table("attempts").update({"status": "abandoned"}).eq("id", row["id"]).eq("status", "in_progress").execute()
        write_audit(None, "mock_attempt_timeout", "attempts", row["id"], after={"status": "abandoned", "deadline_at": raw_dl})
        closed += 1
    return closed
