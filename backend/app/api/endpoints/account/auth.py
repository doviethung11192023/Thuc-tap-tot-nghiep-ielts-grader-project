from fastapi import APIRouter, Depends
from fastapi.security import OAuth2PasswordRequestForm
from app.services.account.password_login_service import login_with_password

router = APIRouter()

@router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Dùng để test trực tiếp trên Swagger UI.
    Username: Email bạn đã đăng ký trên Supabase.
    Password: Mật khẩu bạn đã đăng ký trên Supabase.
    """
    return {
        "access_token": login_with_password(form_data.username, form_data.password),
        "token_type": "bearer"
    }
