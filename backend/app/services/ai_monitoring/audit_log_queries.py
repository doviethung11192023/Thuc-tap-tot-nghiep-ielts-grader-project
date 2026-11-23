"""Đọc audit log (US7, FR-028): chỉ đọc, mới nhất trước, lọc theo người làm, hành động, đối tượng, ngày."""
from typing import Any, Optional

from app.core.domain_errors import NotFoundError
from app.db.supabase import db
from app.services.ai_monitoring.ai_monitoring_time import day_range

SYSTEM_ACTOR = "system"
_LIST_SELECT = "id, created_at, actor_type, admin_id, action, entity, entity_id"


def _admin_emails(rows: list[dict[str, Any]]) -> dict[str, str]:
    ids = sorted({r["admin_id"] for r in rows if r.get("admin_id")})
    if not ids:
        return {}
    profiles = db().table("profiles").select("id, email").in_("id", ids).execute().data or []
    return {p["id"]: p["email"] for p in profiles}


def _with_email(row: dict[str, Any], emails: dict[str, str]) -> dict[str, Any]:
    return {**row, "admin_email": emails.get(row.get("admin_id"))}


def list_audit_logs(page: int, limit: int, actor: Optional[str] = None, action: Optional[str] = None,
                    entity: Optional[str] = None, date_from: Optional[str] = None,
                    date_to: Optional[str] = None) -> dict[str, Any]:
    query = db().table("audit_logs").select(_LIST_SELECT, count="exact")
    if actor == SYSTEM_ACTOR:
        query = query.eq("actor_type", "system")
    elif actor:
        query = query.eq("admin_id", actor)
    for column, value in (("action", action), ("entity", entity)):
        if value:
            query = query.eq(column, value)
    start, end = day_range(date_from, date_to)
    if start:
        query = query.gte("created_at", start)
    if end:
        query = query.lt("created_at", end)
    offset = (page - 1) * limit
    res = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    rows = res.data or []
    emails = _admin_emails(rows)
    total = getattr(res, "count", None)
    return {"items": [_with_email(r, emails) for r in rows], "total": total if total is not None else len(rows),
            "page": page, "limit": limit}


def get_audit_log(log_id: str) -> dict[str, Any]:
    rows = db().table("audit_logs").select(_LIST_SELECT + ", before, after").eq("id", log_id).execute().data
    if not rows:
        raise NotFoundError("Không tìm thấy dòng audit log")
    return _with_email(rows[0], _admin_emails(rows))
