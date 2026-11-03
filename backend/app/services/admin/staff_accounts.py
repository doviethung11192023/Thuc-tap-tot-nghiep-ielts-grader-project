"""
Tạo / cấp quyền tài khoản Expert và Admin (UC-19, FR-03) + audit log (FR-37, ràng buộc 16).

Supabase Auth tạo user → trigger handle_new_user tạo profiles + hồ sơ kiểu con theo
app_metadata.role lúc tạo. Lời mời (invite) chưa có role nên hồ sơ ban đầu là learner;
set_role() chuyển đúng kiểu con. Mỗi tài khoản chỉ có 1 vai trò; Learner đã có bài làm
không đổi được vai trò (attempts tham chiếu learner_profiles).
"""
from typing import Any, Optional

from fastapi import HTTPException, status

from app.db.supabase import db, supabase

REDIRECT_TARGET = "http://localhost:3000/auth/callback?next=/reset-password"


def write_audit(admin_id: Optional[str], action: str, entity: str, entity_id: Any = None,
                after: Optional[dict] = None, before: Optional[dict] = None) -> None:
    """admin_id=None → tác vụ tự động của hệ thống."""
    try:
        db().table("audit_logs").insert({
            "actor_type": "admin" if admin_id else "system", "admin_id": admin_id,
            "admin_role": "admin" if admin_id else None, "action": action, "entity": entity,
            "entity_id": str(entity_id) if entity_id is not None else None, "before": before, "after": after,
        }).execute()
    except Exception as e:  # audit không được làm hỏng thao tác chính
        print(f"⚠️ [Audit] {action} {entity}:{entity_id}: {e}")


def set_role(user_id: str, role: str, full_name: Optional[str] = None, expert_fields: Optional[dict] = None) -> None:
    profile = db().table("profiles").select("role").eq("id", user_id).execute().data
    if not profile:
        raise HTTPException(status_code=404, detail="User profile not found")
    current = profile[0]["role"]
    if current != role:
        if current == "learner":
            if db().table("attempts").select("id").eq("learner_id", user_id).limit(1).execute().data:
                raise HTTPException(status_code=409, detail="Learner đã có bài làm, không đổi vai trò được")
            db().table("learner_profiles").delete().eq("user_id", user_id).execute()
        elif current == "expert":
            if db().table("review_assignments").select("id").eq("expert_id", user_id).limit(1).execute().data:
                raise HTTPException(status_code=409, detail="Expert đã có lịch sử chấm, không đổi vai trò được")
            db().table("expert_profiles").delete().eq("user_id", user_id).execute()
        db().table("profiles").update({"role": role}).eq("id", user_id).execute()
    if full_name:
        db().table("profiles").update({"full_name": full_name}).eq("id", user_id).execute()
    if role == "expert":
        db().table("expert_profiles").upsert({"user_id": user_id, **(expert_fields or {})}, on_conflict="user_id").execute()
    supabase.auth.admin.update_user_by_id(user_id, {"app_metadata": {"role": role}})


def _setup_link(email: str) -> Optional[str]:
    try:
        res = supabase.auth.admin.generate_link({"type": "recovery", "email": email,
                                                 "options": {"redirect_to": REDIRECT_TARGET}})
        return getattr(getattr(res, "properties", None), "action_link", None)
    except Exception as e:
        print(f"⚠️ [Staff] setup link {email}: {e}")
        return None


def provision_staff(admin_id: str, email: str, full_name: str, role: str,
                    expert_fields: Optional[dict] = None) -> dict[str, Any]:
    """Mời (hoặc cấp quyền cho tài khoản sẵn có) với vai trò expert|admin."""
    email = email.strip().lower()
    existing = db().table("profiles").select("id, role").eq("email", email).execute().data
    email_sent = False
    if existing:
        if existing[0]["role"] == role:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Tài khoản này đã có vai trò {role}")
        user_id = existing[0]["id"]
    else:
        user_id = None
        try:
            res = supabase.auth.admin.invite_user_by_email(
                email, options={"data": {"full_name": full_name}, "redirect_to": REDIRECT_TARGET})
            if getattr(res, "user", None):
                user_id, email_sent = res.user.id, True
        except Exception as e:
            print(f"Invite note ({email}): {e}, fallback create_user")
        if not user_id:
            try:
                res = supabase.auth.admin.create_user({"email": email, "user_metadata": {"full_name": full_name},
                                                       "app_metadata": {"role": role}, "email_confirm": True})
                user_id = res.user.id
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Lỗi khi khởi tạo tài khoản trên hệ thống xác thực: {e}")
    set_role(user_id, role, full_name, expert_fields)
    if existing:
        try:
            supabase.auth.reset_password_for_email(email, options={"redirect_to": REDIRECT_TARGET})
            email_sent = True
        except Exception as e:
            print(f"⚠️ [Staff] reset email {email}: {e}")
    write_audit(admin_id, f"create_{role}", "profiles", user_id,
                after={"email": email, "full_name": full_name, "role": role, "email_sent": email_sent})
    return {"id": user_id, "email": email, "full_name": full_name, "role": role,
            "is_activated": False, "email_sent": email_sent, "setup_link": _setup_link(email),
            **({"max_active_reviews": (expert_fields or {}).get("max_active_reviews")} if role == "expert" else {})}


def resend_invite(admin_id: str, user_id: str) -> dict[str, Any]:
    rows = db().table("profiles").select("email").eq("id", user_id).execute().data
    if not rows:
        raise HTTPException(status_code=404, detail="User not found")
    email, email_sent = rows[0]["email"].strip().lower(), False
    try:
        supabase.auth.reset_password_for_email(email, options={"redirect_to": REDIRECT_TARGET})
        email_sent = True
    except Exception as e:
        print(f"⚠️ [Staff] resend {email}: {e}")
    write_audit(admin_id, "resend_invite", "profiles", user_id, after={"email": email})
    return {"email": email, "email_sent": email_sent, "setup_link": _setup_link(email)}
