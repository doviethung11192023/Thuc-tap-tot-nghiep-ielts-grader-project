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

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    token = credentials.credentials
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Token"
        )
    
    try:
        # Sử dụng Supabase API để verify token thay vì tự decode bằng python-jose
        # Cách này an toàn tuyệt đối với mọi thuật toán (HS256, RS256, ES256)
        # và không cần cấu hình phức tạp (JWKS, JWT_SECRET)
        user_res = supabase.auth.get_user(token)
        user_id = user_res.user.id
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
        
        # Check user in DB
        res = supabase.table("users").select("*").eq("id", user_id).execute()
        if res.data:
            u = res.data[0]
            return User(id=u["id"], role=u["role"], is_active=u["is_active"])
        else:
            # Fallback if user is authenticated in Supabase but not yet synced to our public.users table
            return User(id=user_id, role="student")
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")
    return current_user

async def require_admin(current_user: User = Depends(get_current_active_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough privileges")
    return current_user

async def require_student(current_user: User = Depends(get_current_active_user)) -> User:
    # API của student thì admin cũng có thể xem được trong một số trường hợp, nhưng tạm bỏ qua
    return current_user
