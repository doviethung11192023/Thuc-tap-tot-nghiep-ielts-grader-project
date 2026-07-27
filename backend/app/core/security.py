from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

security = HTTPBearer()

class User(BaseModel):
    id: str
    role: str
    is_active: bool = True

import uuid
import hashlib

def get_mock_uuid(text: str) -> str:
    return str(uuid.UUID(hashlib.md5(text.encode()).hexdigest()))

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    token = credentials.credentials
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Token"
        )
    
    try:
        # Check if token is directly a valid UUID
        uuid_obj = uuid.UUID(token)
        from app.db.supabase import supabase
        res = supabase.table("users").select("*").eq("id", token).execute()
        if res.data:
            u = res.data[0]
            return User(id=u["id"], role=u["role"], is_active=u["is_active"])
        return User(id=token, role="student")
    except ValueError:
        pass
        
    # Fallback for old string tokens (e.g., 'admin_token') -> convert to valid UUID
    mock_id = get_mock_uuid(token)
    role = "admin" if "admin" in token else "student"
    is_active = False if "banned" in token else True
    
    return User(id=mock_id, role=role, is_active=is_active)

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
