import asyncio
import hashlib
import time

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from jose import jwt, JWTError

from app.core.config import settings
from app.db.supabase import db, supabase

security = HTTPBearer()
_TOKEN_CACHE_TTL = 120.0
_PROFILE_CACHE_TTL = 60.0
_token_cache: dict[str, tuple[str, float]] = {}
_profile_cache: dict[tuple[str, str], tuple["User", float]] = {}
_auth_lock = asyncio.Lock()


def invalidate_auth_profile_cache(user_id: str) -> None:
    _profile_cache.pop(("profile", user_id), None)


class User(BaseModel):
    id: str
    role: str                 # learner | expert | admin (profiles.role)
    is_active: bool = True

def _verified_sub(token: str) -> str | None:
    """sub của access token Supabase sau khi kiểm chữ ký + hạn + audience; sai → None."""
    secret = (settings.SUPABASE_JWT_SECRET or "").strip()
    if not secret:
        return None
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"], audience="authenticated")
    except JWTError:
        return None
    return payload.get("sub") if payload.get("role") == "authenticated" else None


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    token = credentials.credentials
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Token"
        )
    
    try:
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        now = time.monotonic()
        cached_token = _token_cache.get(token_hash)
        user_id = cached_token[0] if cached_token and now < cached_token[1] else None

        if not user_id:
            # Ưu tiên xác thực chữ ký JWT HS256 cục bộ (< 0.1ms) để tránh round-trip mạng mỗi request
            user_id = _verified_sub(token)
            if user_id:
                _token_cache[token_hash] = (user_id, now + _TOKEN_CACHE_TTL)

        # Fallback sang Supabase GoTrue API khi local decode không khả dụng (ví dụ ES256 JWKS), dùng singleflight lock
        if not user_id:
            async with _auth_lock:
                now_locked = time.monotonic()
                cached_token = _token_cache.get(token_hash)
                if cached_token and now_locked < cached_token[1]:
                    user_id = cached_token[0]
                else:
                    try:
                        user_res = await asyncio.to_thread(lambda: db().auth.get_user(token))
                        if user_res and user_res.user:
                            user_id = user_res.user.id
                            _token_cache[token_hash] = (user_id, time.monotonic() + _TOKEN_CACHE_TTL)
                    except Exception:
                        pass

        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

        cache_key = ("profile", user_id)
        now = time.monotonic()
        cached = _profile_cache.get(cache_key)
        if cached and now < cached[1]:
            return cached[0]

        async with _auth_lock:
            now_locked = time.monotonic()
            cached = _profile_cache.get(cache_key)
            if cached and now_locked < cached[1]:
                return cached[0]

            p = await asyncio.to_thread(
                lambda: db().table("profiles").select("id, role, is_active").eq("id", user_id).execute()
            )
            if not p.data:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                    detail="User profile not found in database. Account may not be fully initialized.")
            user_obj = User(id=p.data[0]["id"], role=p.data[0]["role"], is_active=p.data[0]["is_active"])
            _profile_cache[cache_key] = (user_obj, time.monotonic() + _PROFILE_CACHE_TTL)
            return user_obj

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
        return await get_current_user(credentials)
    except Exception:
        return None


