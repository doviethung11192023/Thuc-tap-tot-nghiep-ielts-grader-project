"""Kiểm access token bằng JWKS (ES256) và cache hồ sơ người dùng (ADR-32, STRIDE: Spoofing)."""
import asyncio
import json
import time

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from jwt import PyJWK
from jwt.algorithms import ECAlgorithm
from jwt.exceptions import PyJWKClientConnectionError, PyJWKClientError, PyJWKSetError

from app.core import security
from app.core import supabase_access_token_verifier as verifier

USER_ID = "11111111-1111-1111-1111-111111111111"
KID = "test-kid"
SUPABASE_KEY = ec.generate_private_key(ec.SECP256R1())
ATTACKER_KEY = ec.generate_private_key(ec.SECP256R1())


class FakeJwksClient:
    """Thay PyJWKClient: trả khoá công khai theo kid, hoặc giả lập lỗi mạng."""

    def __init__(self, unreachable: bool = False):
        self.unreachable = unreachable
        jwk = json.loads(ECAlgorithm.to_jwk(SUPABASE_KEY.public_key()))
        self.key = PyJWK({**jwk, "kid": KID, "alg": "ES256"})

    def get_signing_key_from_jwt(self, token: str) -> PyJWK:
        if self.unreachable:
            raise PyJWKClientConnectionError("Fail to fetch data from the url")
        if jwt.get_unverified_header(token).get("kid") != KID:
            raise PyJWKClientError("Unable to find a signing key")
        return self.key


@pytest.fixture(autouse=True)
def fake_jwks(monkeypatch):
    client = FakeJwksClient()
    monkeypatch.setattr(verifier, "_get_jwks_client", lambda: client)
    verifier._profile_cache.clear()
    return client


def _token(key=SUPABASE_KEY, alg="ES256", kid=KID, **claims) -> str:
    base = {"sub": USER_ID, "aud": "authenticated", "role": "authenticated", "exp": int(time.time()) + 600}
    return jwt.encode({**base, **claims}, key, algorithm=alg, headers={"kid": kid})


def test_valid_es256_token_accepted():
    assert verifier.verify_access_token(_token()) == USER_ID


def test_token_signed_by_other_key_rejected():
    assert verifier.verify_access_token(_token(key=ATTACKER_KEY)) is None


def test_hs256_token_rejected_even_with_known_kid():
    """Chống nhầm thuật toán: token HS256 (ký bằng secret dùng chung) không bao giờ được nhận."""
    assert verifier.verify_access_token(_token(key="shared-secret", alg="HS256")) is None


def test_unsigned_and_unknown_kid_rejected():
    unsigned = jwt.encode({"sub": USER_ID, "aud": "authenticated", "role": "authenticated"}, None,
                          algorithm="none", headers={"kid": KID})
    assert verifier.verify_access_token(unsigned) is None
    assert verifier.verify_access_token(_token(kid="unknown")) is None
    assert verifier.verify_access_token("not-a-jwt") is None


def test_expired_wrong_audience_and_service_role_rejected():
    assert verifier.verify_access_token(_token(exp=int(time.time()) - 10)) is None
    assert verifier.verify_access_token(_token(aud="other")) is None
    assert verifier.verify_access_token(_token(role="service_role")) is None


def test_jwks_unreachable_raises(fake_jwks):
    fake_jwks.unreachable = True
    with pytest.raises(verifier.JwksUnavailable):
        verifier.verify_access_token(_token())


def test_empty_jwks_raises_unavailable(monkeypatch):
    """JWKS rỗng (project chưa bật khoá bất đối xứng) phải chuyển sang GoTrue, không 401 mọi người dùng."""
    class EmptyJwks:
        def get_signing_key_from_jwt(self, token):
            raise PyJWKSetError("The JWK Set did not contain any keys")

    monkeypatch.setattr(verifier, "_get_jwks_client", lambda: EmptyJwks())
    with pytest.raises(verifier.JwksUnavailable):
        verifier.verify_access_token(_token())


# --- get_current_user ------------------------------------------------------------------------------

def _creds(token: str) -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


@pytest.fixture
def profile_loads(monkeypatch):
    calls = []

    def load(user_id):
        calls.append(user_id)
        return {"id": user_id, "role": "learner", "is_active": True}

    monkeypatch.setattr(security, "_load_profile", load)
    return calls


def test_profile_is_cached_between_requests(profile_loads):
    for _ in range(3):
        user = asyncio.run(security.get_current_user(_creds(_token())))
        assert user.id == USER_ID and user.role == "learner"
    assert profile_loads == [USER_ID]


def test_forget_profile_and_ttl_force_reload(profile_loads, monkeypatch):
    asyncio.run(security.get_current_user(_creds(_token())))
    verifier.forget_profile(USER_ID)
    asyncio.run(security.get_current_user(_creds(_token())))
    assert len(profile_loads) == 2

    later = time.monotonic() + verifier.PROFILE_TTL_SECONDS + 1
    monkeypatch.setattr(verifier.time, "monotonic", lambda: later)
    asyncio.run(security.get_current_user(_creds(_token())))
    assert len(profile_loads) == 3


def test_invalid_token_does_not_call_gotrue(profile_loads, monkeypatch):
    monkeypatch.setattr(security, "_user_id_from_gotrue", lambda t: pytest.fail("GoTrue không được gọi"))
    with pytest.raises(HTTPException) as exc:
        asyncio.run(security.get_current_user(_creds(_token(key=ATTACKER_KEY))))
    assert exc.value.status_code == 401
    assert profile_loads == []


def test_falls_back_to_gotrue_when_jwks_unreachable(fake_jwks, profile_loads, monkeypatch):
    fake_jwks.unreachable = True
    monkeypatch.setattr(security, "_user_id_from_gotrue", lambda t: USER_ID)
    assert asyncio.run(security.get_current_user(_creds(_token()))).id == USER_ID


def test_missing_profile_is_401(monkeypatch):
    monkeypatch.setattr(security, "_load_profile", lambda user_id: None)
    with pytest.raises(HTTPException) as exc:
        asyncio.run(security.get_current_user(_creds(_token())))
    assert exc.value.status_code == 401
