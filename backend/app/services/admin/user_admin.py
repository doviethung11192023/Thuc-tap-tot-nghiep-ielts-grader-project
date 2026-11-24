"""
Danh sách người dùng và khoá/mở khoá (UC-19, FR-04).

"Đã kích hoạt" = đã đăng nhập ít nhất một lần (Supabase Auth last_sign_in_at): thay cột
is_activated cũ.
"""
from time import monotonic
from typing import Any, Optional

from app.core.domain_errors import InvalidRequestError, NotFoundError

from app.db.supabase import db, supabase
from app.services.admin.staff_accounts import write_audit

_activated_cache: tuple[set[str], float] | None = None
_ACTIVATED_TTL_SEC = 60.0


def _activated_ids() -> set[str]:
    global _activated_cache
    now = monotonic()
    if _activated_cache is not None and now - _activated_cache[1] < _ACTIVATED_TTL_SEC:
        return _activated_cache[0]
    ids, page = set(), 1
    while True:
        try:
            users = supabase.auth.admin.list_users(page=page, per_page=1000)
        except Exception as e:
            print(f"⚠️ [Admin] list auth users: {e}")
            return _activated_cache[0] if _activated_cache else ids
        ids |= {str(u.id) for u in users or [] if getattr(u, "last_sign_in_at", None)}
        if not users or len(users) < 1000:
            _activated_cache = (ids, now)
            return ids
        page += 1


def _apply_user_filters(q: Any, role: Optional[str], search: Optional[str]) -> Any:
    if role:
        q = q.eq("role", role)
    if search and search.strip():
        s = search.strip()
        q = q.or_(f"email.ilike.%{s}%,full_name.ilike.%{s}%")
    return q


def _filtered_status_count(role: Optional[str], search: Optional[str], is_active: bool) -> int:
    q = _apply_user_filters(
        db().table("profiles").select("id", count="exact").eq("is_active", is_active),
        role,
        search,
    )
    res = q.limit(1).execute()
    return res.count if getattr(res, "count", None) is not None else len(res.data or [])


def list_users(page: int, limit: int, role: Optional[str], search: Optional[str]) -> dict[str, Any]:
    q = _apply_user_filters(
        db().table("profiles").select("id, email, full_name, avatar_key, role, is_active, created_at", count="exact"),
        role,
        search,
    )
    offset = (page - 1) * limit
    res = q.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    activated = _activated_ids()
    items = [{**{k: v for k, v in r.items() if k != "avatar_key"}, "avatar_url": r.get("avatar_key"),
              "is_activated": r["id"] in activated} for r in res.data or []]
    total = res.count if getattr(res, "count", None) is not None else len(items)
    active_total = _filtered_status_count(role, search, True)
    banned_total = _filtered_status_count(role, search, False)
    return {"items": items, "total": total, "active_total": active_total, "banned_total": banned_total}


def set_user_active(admin_id: str, user_id: str, is_active: bool, reason: Optional[str]) -> None:
    if user_id == admin_id:
        raise InvalidRequestError("Admins cannot lock their own account")
    res = db().table("profiles").update({"is_active": is_active}).eq("id", user_id).execute()
    if not res.data:
        raise NotFoundError("User not found")
    try:
        supabase.auth.admin.update_user_by_id(user_id, {"ban_duration": "none" if is_active else "876000h"})
    except Exception as e:
        print(f"⚠️ [Admin] sync ban {user_id}: {e}")
    write_audit(admin_id, "unlock_user" if is_active else "lock_user", "profiles", user_id,
                after={"is_active": is_active, "reason": reason})
