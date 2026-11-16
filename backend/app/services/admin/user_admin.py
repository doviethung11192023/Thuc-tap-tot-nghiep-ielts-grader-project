"""
Danh sách người dùng và khoá/mở khoá (UC-19, FR-04).

"Đã kích hoạt" = đã đăng nhập ít nhất một lần (Supabase Auth last_sign_in_at): thay cột
is_activated cũ.
"""
from typing import Any, Optional

from app.core.domain_errors import InvalidRequestError, NotFoundError
from app.core.supabase_access_token_verifier import forget_profile

from app.db.supabase import db, supabase
from app.services.admin.staff_accounts import write_audit


def _activated_ids() -> set[str]:
    ids, page = set(), 1
    while True:
        try:
            users = supabase.auth.admin.list_users(page=page, per_page=1000)
        except Exception as e:
            print(f"⚠️ [Admin] list auth users: {e}")
            return ids
        ids |= {str(u.id) for u in users or [] if getattr(u, "last_sign_in_at", None)}
        if not users or len(users) < 1000:
            return ids
        page += 1


def _filtered(columns: str, role: Optional[str], search: Optional[str], **count_kwargs):
    q = db().table("profiles").select(columns, **count_kwargs)
    if role:
        q = q.eq("role", role)
    if search and search.strip():
        s = search.strip()
        q = q.or_(f"email.ilike.%{s}%,full_name.ilike.%{s}%")
    return q


def list_users(page: int, limit: int, role: Optional[str], search: Optional[str]) -> dict[str, Any]:
    """Một trang người dùng; total/active_count/locked_count tính trên toàn bộ kết quả lọc, không chỉ trang này."""
    q = _filtered("id, email, full_name, avatar_key, role, is_active, created_at", role, search, count="exact")
    offset = (page - 1) * limit
    res = q.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    activated = _activated_ids()
    items = [{**{k: v for k, v in r.items() if k != "avatar_key"}, "avatar_url": r.get("avatar_key"),
              "is_activated": r["id"] in activated} for r in res.data or []]
    total = res.count if getattr(res, "count", None) is not None else len(items)
    locked = _filtered("id", role, search, count="exact").eq("is_active", False).limit(1).execute().count or 0
    return {"items": items, "total": total, "active_count": total - locked, "locked_count": locked}


def set_user_active(admin_id: str, user_id: str, is_active: bool, reason: Optional[str]) -> None:
    if user_id == admin_id:
        raise InvalidRequestError("Admins cannot lock their own account")
    res = db().table("profiles").update({"is_active": is_active}).eq("id", user_id).execute()
    if not res.data:
        raise NotFoundError("User not found")
    forget_profile(user_id)     # khoá có hiệu lực ngay ở tiến trình này; tiến trình khác tối đa 60 s (ADR-32)
    try:
        supabase.auth.admin.update_user_by_id(user_id, {"ban_duration": "none" if is_active else "876000h"})
    except Exception as e:
        print(f"⚠️ [Admin] sync ban {user_id}: {e}")
    write_audit(admin_id, "unlock_user" if is_active else "lock_user", "profiles", user_id,
                after={"is_active": is_active, "reason": reason})
