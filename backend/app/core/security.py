from typing import Any, Optional

from fastapi import Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

from app.core.supabase_access_token_verifier import (
    JwksUnavailable, cached_profile, forget_profile, remember_profile, verify_access_token,
)
from app.db.supabase import db, supabase

security = HTTPBearer()


def invalidate_auth_profile_cache(user_id: str) -> None:
    """Tên cũ của forget_profile (ADR-32): xoá cache hồ sơ sau khi đổi role hoặc is_active."""
    forget_profile(user_id)


class User(BaseModel):
    id: str
    role: str                 # learner | expert | admin (profiles.role)
    is_active: bool = True


def _user_id_from_gotrue(token: str) -> Optional[str]:
    """Dự phòng khi chưa tải được JWKS: hỏi GoTrue như cách cũ (chậm, gọi mạng)."""
    try:
        res = supabase.auth.get_user(token)
        return res.user.id if res and res.user else None
    except Exception:
        return None


async def _authenticated_user_id(token: str) -> Optional[str]:
    """Kiểm token bằng khoá công khai (ADR-32). Chạy trong threadpool vì lần tải JWKS có gọi mạng."""
    try:
        return await run_in_threadpool(verify_access_token, token)
    except JwksUnavailable as e:
        print(f"⚠️ [Auth] không tải được JWKS, hỏi GoTrue: {e}")
        return await run_in_threadpool(_user_id_from_gotrue, token)


def _load_profile(user_id: str) -> Optional[dict[str, Any]]:
    rows = db().table("profiles").select("id, role, is_active").eq("id", user_id).execute().data
    return rows[0] if rows else None


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    token = credentials.credentials
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Token"
        )

    try:
        user_id = await _authenticated_user_id(token)
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

        profile = cached_profile(user_id)
        if profile is None:
            profile = await run_in_threadpool(_load_profile, user_id)
            if profile is None:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                    detail="User profile not found in database. Account may not be fully initialized.")
            remember_profile(profile)
        return User(id=profile["id"], role=profile["role"], is_active=profile["is_active"])

    except HTTPException:
        raise
    except Exception as e:
        print(f"[SECURITY DEBUG] Auth exception: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        print(f"[SECURITY 403] User {current_user.id} is inactive (is_active={current_user.is_active})")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")
    return current_user

async def require_admin(current_user: User = Depends(get_current_active_user)) -> User:
    if current_user.role != "admin":
        print(f"[SECURITY 403] User {current_user.id} has role='{current_user.role}', but 'admin' is required!")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Quyền truy cập bị từ chối: Tài khoản có vai trò '{current_user.role}', nhưng chức năng này yêu cầu vai trò 'admin'"
        )
    return current_user

async def require_expert(current_user: User = Depends(get_current_active_user)) -> User:
    if current_user.role != "expert":
        print(f"[SECURITY 403] User {current_user.id} has role='{current_user.role}', but 'expert' is required!")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Quyền truy cập bị từ chối: Tài khoản có vai trò '{current_user.role}', nhưng chức năng này yêu cầu vai trò 'expert'"
        )
    return current_user

async def require_learner(current_user: User = Depends(get_current_active_user)) -> User:
    if current_user.role != "learner":
        print(f"[SECURITY 403] User {current_user.id} has role='{current_user.role}', but 'learner' is required!")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Quyền truy cập bị từ chối: Tài khoản có vai trò '{current_user.role}', nhưng chức năng này yêu cầu vai trò 'learner'"
        )
    return current_user

security_optional = HTTPBearer(auto_error=False)

async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security_optional)) -> User | None:
    if not credentials or not credentials.credentials:
        return None
    try:
        user = await get_current_user(credentials)
    except Exception:
        return None
    # Tài khoản bị khoá (FR-04) coi như chưa đăng nhập, kể cả khi JWT cũ chưa hết hạn
    return user if user.is_active else None


