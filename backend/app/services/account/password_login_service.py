"""Đăng nhập email/mật khẩu qua Supabase Auth, dùng cho nút Authorize của Swagger UI."""
from supabase import create_client

from app.core.config import settings
from app.core.domain_errors import AuthenticationRequiredError


def login_with_password(email: str, password: str) -> str:
    """Trả access token; sai thông tin thì ném lỗi 401 kèm lý do từ Supabase."""
    try:
        # Sử dụng instance riêng biệt để tránh ghi đè quyền service_role của backend singleton
        auth_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        res = auth_client.auth.sign_in_with_password({"email": email, "password": password})
        return res.session.access_token
    except Exception as e:
        raise AuthenticationRequiredError(f"Incorrect email or password. Error: {str(e)}")
