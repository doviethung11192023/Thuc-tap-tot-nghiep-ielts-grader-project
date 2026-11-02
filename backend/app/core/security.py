from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from jose import jwt, JWTError

from app.core.config import settings
from app.db.supabase import supabase

security = HTTPBearer()

class User(BaseModel):
    id: str
    role: str
    is_active: bool = True
    is_activated: bool = True

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
        user_id = None
        # Xác thực token thông qua Supabase GoTrue API
        try:
            user_res = supabase.auth.get_user(token)
            if user_res and user_res.user:
                user_id = user_res.user.id
        except Exception:
            pass

        # Fallback khi GoTrue không trả lời: chỉ chấp nhận token có CHỮ KÝ hợp lệ (HS256, JWT secret
        # của project) và đúng audience. Không bao giờ dùng claims chưa kiểm chữ ký (token giả mạo).
        if not user_id:
            user_id = _verified_sub(token)

        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
        
        from app.services.v2_practice import is_v2_enabled, v2db
        if is_v2_enabled():
            # v2: role learner|expert|admin; API giữ tên cũ "student" cho learner
            p = v2db().table("profiles").select("id, role, is_active").eq("id", user_id).execute()
            if not p.data:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                    detail="User profile not found in database. Account may not be fully initialized.")
            role = p.data[0]["role"]
            return User(id=p.data[0]["id"], role="student" if role == "learner" else role,
                        is_active=p.data[0]["is_active"], is_activated=True)

        res = supabase.table("users").select("*").eq("id", user_id).execute()
        if res.data:
            u = res.data[0]
            print(f"[SECURITY DEBUG] Token user_id={user_id}, email={u.get('email')}, role={u.get('role')}, is_active={u.get('is_active')}, is_activated={u.get('is_activated')}")
            return User(
                id=u["id"], 
                role=u["role"], 
                is_active=u["is_active"],
                is_activated=u.get("is_activated", True)
            )
        else:
            print(f"[SECURITY DEBUG] User {user_id} not found in public.users")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User profile not found in database. Account may not be fully initialized."
            )
            
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

async def require_student(current_user: User = Depends(get_current_active_user)) -> User:
    if current_user.role != "student" and current_user.role != "admin":
        print(f"[SECURITY 403] User {current_user.id} has role='{current_user.role}', but 'student' is required!")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail=f"Quyền truy cập bị từ chối: Tài khoản có vai trò '{current_user.role}', nhưng chức năng này yêu cầu vai trò 'student'"
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


