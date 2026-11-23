"""Mã hoá key bằng Fernet (FR-043, FR-047) và che key khỏi chuỗi lỗi (FR-045)."""
from cryptography.fernet import Fernet

from app.core.config import settings
from app.services.ai_services.ai_secret_cipher import decrypt_secret, encrypt_secret, encryption_ready
from app.services.ai_services.secret_redaction import redact_secrets


def _use_key(monkeypatch, key: str) -> None:
    monkeypatch.setattr(settings, "AI_SECRETS_ENCRYPTION_KEY", key)


def test_roundtrip_and_ciphertext_hides_plaintext(monkeypatch):
    _use_key(monkeypatch, Fernet.generate_key().decode())
    token = encrypt_secret("sk-live-1234567890")
    assert encryption_ready() and "sk-live" not in token
    assert decrypt_secret(token, "dashscope") == "sk-live-1234567890"


def test_missing_or_malformed_key_means_not_ready(monkeypatch):
    for bad in ("", "   ", "not-a-fernet-key"):
        _use_key(monkeypatch, bad)
        assert encryption_ready() is False


def test_decrypt_with_wrong_key_returns_none_and_logs_no_secret(monkeypatch, caplog):
    _use_key(monkeypatch, Fernet.generate_key().decode())
    token = encrypt_secret("sk-live-1234567890")
    _use_key(monkeypatch, Fernet.generate_key().decode())
    assert decrypt_secret(token, "dashscope") is None
    assert "sk-live" not in caplog.text and token not in caplog.text


def test_decrypt_without_encryption_key_returns_none(monkeypatch):
    _use_key(monkeypatch, "")
    assert decrypt_secret("whatever", "typesafe") is None


def test_redact_removes_known_key_and_key_like_strings_and_truncates():
    text = "401 Incorrect API key provided: my-custom-key-9999 (also sk-abcdef123456 seen)"
    out = redact_secrets(text, ["my-custom-key-9999"])
    assert "my-custom-key-9999" not in out and "sk-abcdef123456" not in out
    assert len(redact_secrets("x" * 1000)) == 300
