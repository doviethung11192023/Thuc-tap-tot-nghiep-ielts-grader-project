"""Client gọi route /admin/* của engine: dựng URL, gửi secret, đổi lỗi mạng và HTTP thành lỗi rõ ràng."""
import asyncio

import httpx
import pytest

from app.clients.ai_engine import admin_client as client_module
from app.core.config import settings


REAL_ASYNC_CLIENT = httpx.AsyncClient   # giữ bản gốc vì _install có thể gọi nhiều lần trong một test


def _install(monkeypatch, handler):
    monkeypatch.setattr(client_module.httpx, "AsyncClient",
                        lambda **kw: REAL_ASYNC_CLIENT(transport=httpx.MockTransport(handler), **kw))
    monkeypatch.setattr(settings, "AI_ENGINE_URL", "http://engine:8001/grade")
    monkeypatch.setattr(settings, "AI_ENGINE_SECRET", "s3cret")


def test_url_is_built_from_engine_host_with_secret_header(monkeypatch):
    seen = {}

    def handler(request: httpx.Request):
        seen.update(url=str(request.url), secret=request.headers["X-AI-Engine-Secret"])
        return httpx.Response(200, json={"status": "ok"})

    _install(monkeypatch, handler)
    asyncio.run(client_module.services_health("llm"))
    assert seen == {"url": "http://engine:8001/admin/services/health?service=llm", "secret": "s3cret"}


def test_http_error_keeps_engine_detail(monkeypatch):
    _install(monkeypatch, lambda r: httpx.Response(422, json={"detail": "Thiếu biến"}))
    with pytest.raises(client_module.AiEngineHttpError) as info:
        asyncio.run(client_module.create_prompt_version({}))
    assert info.value.status_code == 422 and info.value.detail == "Thiếu biến"


def test_network_errors_become_unavailable_without_request_body(monkeypatch):
    def handler(request):
        raise httpx.ConnectError("boom sk-leaky-key-123456789")

    _install(monkeypatch, handler)
    with pytest.raises(client_module.AiEngineUnavailable) as info:
        asyncio.run(client_module.test_service({"kind": "llm", "api_key": "sk-leaky-key-123456789"}))
    assert "sk-leaky" not in str(info.value)

    def timeout(request):
        raise httpx.ReadTimeout("slow")

    _install(monkeypatch, timeout)
    with pytest.raises(client_module.AiEngineUnavailable, match="Hết thời gian"):
        asyncio.run(client_module.refresh_runtime_config())
