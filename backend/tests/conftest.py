"""Fixture dùng chung cho test Core API."""
import pytest

from app.core.config import settings


@pytest.fixture(autouse=True)
def _isolate_spec008_env(monkeypatch):
    """Biến môi trường của spec 008 trong backend/.env không được làm đổi kết quả test: mặc định rỗng,
    test cần giá trị thì tự đặt (ví dụ fixture encryption_key)."""
    monkeypatch.setattr(settings, "AI_SECRETS_ENCRYPTION_KEY", "")
    monkeypatch.setattr(settings, "LANGFUSE_PROJECT_ID", "")
