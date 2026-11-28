"""Fixture dùng chung cho test Core API."""
import pytest

from app.core.config import settings


@pytest.fixture(autouse=True)
def _isolate_spec008_env(monkeypatch):
    """Biến môi trường của spec 008 trong backend/.env không được làm đổi kết quả test: mặc định rỗng,
    test cần giá trị thì tự đặt (ví dụ fixture encryption_key)."""
    monkeypatch.setattr(settings, "AI_SECRETS_ENCRYPTION_KEY", "")
    monkeypatch.setattr(settings, "LANGFUSE_PROJECT_ID", "")


@pytest.fixture(autouse=True)
def _no_real_network(monkeypatch):
    """CI không có mạng: cấu hình lộ trình lấy mặc định và danh mục đề đã xuất bản rỗng (không đọc DB thật), cache RAM
    toàn cục được xoá để kết quả không phụ thuộc thứ tự test, và mọi HTTP thật thất bại ngay thay vì
    retry nhiều giây. Test cần cấu hình riêng thì tự monkeypatch get_roadmap_config_cached."""
    import httpx

    from app.services.learning_profile import common
    from app.services.practice import learning_profile_readers

    monkeypatch.setattr(learning_profile_readers, "get_roadmap_config",
                        lambda: dict(learning_profile_readers.DEFAULT_ROADMAP_CONFIG))
    # Danh mục đề đã xuất bản (overview aggregator dùng cho gợi ý): mặc định rỗng, không đọc bảng tests thật.
    monkeypatch.setattr(learning_profile_readers, "published_tests", lambda: [])
    with common._cache_lock:
        common._cache.pop("roadmap_config", None)
        common._cache.pop("published_tests", None)

    def _blocked(self, request, *a, **k):
        raise RuntimeError(f"Test không được gọi mạng thật: {request.method} {request.url}")

    monkeypatch.setattr(httpx.HTTPTransport, "handle_request", _blocked)
