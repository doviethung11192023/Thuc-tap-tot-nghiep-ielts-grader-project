from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from supabase import create_client
from app.core.config import settings

router = APIRouter()

@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Dùng để test trực tiếp trên Swagger UI.
    Username: Email bạn đã đăng ký trên Supabase.
    Password: Mật khẩu bạn đã đăng ký trên Supabase.
    """
    try:
        # Sử dụng instance riêng biệt để tránh ghi đè quyền service_role của backend singleton
        auth_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        res = auth_client.auth.sign_in_with_password({
            "email": form_data.username,
            "password": form_data.password
        })
        return {
            "access_token": res.session.access_token,
            "token_type": "bearer"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Incorrect email or password. Error: {str(e)}"
        )
