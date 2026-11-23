"""Endpoint nội bộ cho engine: chỉ nhận secret nội bộ, trả key đã giải mã, không cache (FR-046, FR-052)."""
from cryptography.fernet import Fernet

from ai_services_test_support import ADMIN_ID, SECRET, client, encryption_key, fake_db, fake_engine  # noqa: F401
from app.core.config import settings
from app.services.ai_services.ai_secret_cipher import encrypt_secret

URL = "/api/v1/internal/ai-engine/runtime-config"
HEADERS = {"X-AI-Engine-Secret": SECRET}


def test_core_without_secret_returns_503(client, monkeypatch):
    monkeypatch.setattr(settings, "AI_ENGINE_SECRET", "")
    assert client.get(URL, headers=HEADERS).status_code == 503


def test_missing_or_wrong_secret_returns_403(client):
    assert client.get(URL).status_code == 403
    assert client.get(URL, headers={"X-AI-Engine-Secret": "wrong"}).status_code == 403


def test_user_token_is_not_needed_and_does_not_help(client):
    """Route không dùng token người dùng: không có Authorization vẫn qua khi secret đúng."""
    assert client.get(URL, headers=HEADERS).status_code == 200


def test_returns_overrides_without_nulls_and_decrypted_keys(client, fake_db, encryption_key):
    fake_db.tables["system_settings"].append({
        "key": "ai_runtime_config", "updated_at": "2026-11-22T10:00:00+00:00",
        "value": {"steps": {"writing_rewrite": {"model": "qwen3.7-plus", "temperature": None}, "writing_vision": {}},
                  "llm": {"timeout_seconds": 90, "enable_thinking": None}, "jev": {}}})
    fake_db.tables["ai_provider_secrets"] = [{
        "provider": "dashscope", "ciphertext": encrypt_secret("sk-dash-123456"), "last4": "3456",
        "updated_at": "2026-11-22T11:00:00+00:00"}]
    response = client.get(URL, headers=HEADERS)
    body = response.json()
    assert response.headers["cache-control"] == "no-store"
    assert body["steps"] == {"writing_rewrite": {"model": "qwen3.7-plus"}}
    assert body["llm"] == {"timeout_seconds": 90} and body["jev"] == {}
    assert body["keys"] == {"dashscope": "sk-dash-123456", "typesafe": None}
    assert body["version"] == "2026-11-22T11:00:00+00:00"   # key đổi sau cấu hình nên version mới hơn


def test_undecryptable_key_becomes_null_without_leaking(client, fake_db, encryption_key, monkeypatch, caplog):
    token = encrypt_secret("sk-dash-123456")
    monkeypatch.setattr(settings, "AI_SECRETS_ENCRYPTION_KEY", Fernet.generate_key().decode())
    fake_db.tables["ai_provider_secrets"] = [{"provider": "dashscope", "ciphertext": token, "last4": "3456"}]
    body = client.get(URL, headers=HEADERS).json()
    assert body["keys"]["dashscope"] is None
    assert "sk-dash" not in caplog.text and token not in caplog.text


def test_empty_database_gives_empty_config(client):
    body = client.get(URL, headers=HEADERS).json()
    assert body["steps"] == {} and body["llm"] == {} and body["jev"] == {}
    assert body["keys"] == {"dashscope": None, "typesafe": None}
