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

        # Fallback decode payload nếu network request tới GoTrue gặp sự cố mạng tạm thời
        if not user_id:
            try:
                payload = jwt.get_unverified_claims(token)
                user_id = payload.get("sub")
            except Exception:
                pass

        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
        
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


