"""Link trong email mời / đặt lại mật khẩu của Expert, Admin lấy theo FRONTEND_URL, không gắn cứng localhost."""
from app.core.config import settings
from app.services.admin.staff_accounts import password_setup_redirect


def test_link_follows_frontend_url(monkeypatch):
    monkeypatch.setattr(settings, "FRONTEND_URL", "https://ielts.example.com")
    assert password_setup_redirect() == "https://ielts.example.com/auth/callback?next=/reset-password"


def test_trailing_slash_does_not_double(monkeypatch):
    monkeypatch.setattr(settings, "FRONTEND_URL", "https://ielts.example.com/")
    assert password_setup_redirect() == "https://ielts.example.com/auth/callback?next=/reset-password"
