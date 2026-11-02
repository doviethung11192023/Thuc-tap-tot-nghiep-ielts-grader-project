"""Fallback xác thực chỉ nhận JWT có chữ ký hợp lệ (STRIDE: Spoofing)."""
import time

from jose import jwt

from app.core import security
from app.core.config import settings


def _token(secret: str, **claims) -> str:
    base = {"sub": "11111111-1111-1111-1111-111111111111", "aud": "authenticated",
            "role": "authenticated", "exp": int(time.time()) + 600}
    return jwt.encode({**base, **claims}, secret, algorithm="HS256")


def test_valid_signature_accepted(monkeypatch):
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", "test-secret")
    assert security._verified_sub(_token("test-secret")) == "11111111-1111-1111-1111-111111111111"


def test_forged_signature_rejected(monkeypatch):
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", "test-secret")
    assert security._verified_sub(_token("attacker-secret")) is None


def test_unsigned_token_rejected(monkeypatch):
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", "test-secret")
    unsigned = jwt.encode({"sub": "x", "aud": "authenticated", "role": "authenticated"}, "", algorithm="HS256")
    assert security._verified_sub(unsigned) is None


def test_expired_wrong_audience_and_service_role_rejected(monkeypatch):
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", "test-secret")
    assert security._verified_sub(_token("test-secret", exp=int(time.time()) - 10)) is None
    assert security._verified_sub(_token("test-secret", aud="other")) is None
    assert security._verified_sub(_token("test-secret", role="service_role")) is None


def test_no_secret_configured_rejects_everything(monkeypatch):
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", "")
    assert security._verified_sub(_token("")) is None
