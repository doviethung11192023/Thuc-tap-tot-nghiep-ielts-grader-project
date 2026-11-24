"""
Kiểm access token Supabase ngay trong Core API và cache hồ sơ người dùng (ADR-32).

Trước đây mỗi request gọi GoTrue (`supabase.auth.get_user`) rồi query `profiles`, cả hai đồng bộ trong
`async def`: tốn khoảng 400 ms và chặn event loop, nên các request chạy song song phải xếp hàng.

Supabase ký token bằng JWT Signing Keys (ES256). Khoá công khai lấy từ
`<SUPABASE_URL>/auth/v1/.well-known/jwks.json`; PyJWKClient giữ bộ khoá trong bộ nhớ, gặp `kid` lạ
(Supabase xoay khoá) thì tải lại, có cooldown để token rác không làm nó tải liên tục.
Không nhận HS256: ai có secret dùng chung là ký được token admin, còn khoá công khai thì không ký được.

Hồ sơ (`role`, `is_active`) cache 60 s trong mỗi tiến trình. Admin khoá tài khoản thì tiến trình
xử lý lệnh khoá xoá cache ngay; tiến trình khác chậm tối đa 60 s (chủ dự án chấp nhận 2026-11-13).
"""
import threading
import time
from typing import Any, Optional

import jwt
from jwt import PyJWKClient
from jwt.exceptions import InvalidTokenError, PyJWKClientConnectionError, PyJWKClientError, PyJWKSetError

from app.core.config import settings

ACCEPTED_ALGORITHMS = ["ES256", "RS256"]
AUDIENCE = "authenticated"
_JWKS_CACHE_SECONDS = 600
_JWKS_TIMEOUT_SECONDS = 5

PROFILE_TTL_SECONDS = 60
_PROFILE_CACHE_MAX_ENTRIES = 10_000


class JwksUnavailable(Exception):
    """Không tải được bộ khoá công khai; người gọi tự quyết định phương án dự phòng."""


_jwks_client: Optional[PyJWKClient] = None
_jwks_client_lock = threading.Lock()


def _jwks_url() -> str:
    return f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"


def _get_jwks_client() -> PyJWKClient:
    global _jwks_client
    with _jwks_client_lock:
        if _jwks_client is None:
            _jwks_client = PyJWKClient(_jwks_url(), cache_jwk_set=True, lifespan=_JWKS_CACHE_SECONDS,
                                       timeout=_JWKS_TIMEOUT_SECONDS)
        return _jwks_client


def verify_access_token(token: str) -> Optional[str]:
    """`sub` của access token người dùng nếu chữ ký, hạn, audience và role đều đúng; sai thì None.

    Ném JwksUnavailable khi không tải được JWKS. Lần tải đầu (hoặc khi gặp `kid` mới) có gọi mạng,
    nên chạy hàm này trong threadpool.
    """
    try:
        signing_key = _get_jwks_client().get_signing_key_from_jwt(token)
    except (PyJWKClientConnectionError, PyJWKSetError) as e:
        # mất mạng, hoặc JWKS rỗng / không có khoá dùng được (project còn ký HS256): hỏi GoTrue thay vì 401 tất cả
        raise JwksUnavailable(str(e)) from e
    except (PyJWKClientError, InvalidTokenError):
        return None        # header hỏng, thiếu kid, hoặc kid không có trong JWKS sau khi tải lại

    try:
        payload = jwt.decode(token, signing_key.key, algorithms=ACCEPTED_ALGORITHMS, audience=AUDIENCE)
    except InvalidTokenError:
        return None
    if payload.get("role") != "authenticated":
        return None        # service_role hay anon không phải phiên người dùng
    return payload.get("sub")


# --- Cache hồ sơ người dùng -------------------------------------------------------------------------

_profile_cache: dict[str, tuple[float, dict[str, Any]]] = {}
_profile_cache_lock = threading.Lock()


def cached_profile(user_id: str) -> Optional[dict[str, Any]]:
    with _profile_cache_lock:
        entry = _profile_cache.get(user_id)
        if entry is None:
            return None
        expires_at, profile = entry
        if time.monotonic() >= expires_at:
            del _profile_cache[user_id]
            return None
        return profile


def remember_profile(profile: dict[str, Any]) -> None:
    with _profile_cache_lock:
        if len(_profile_cache) >= _PROFILE_CACHE_MAX_ENTRIES:
            _profile_cache.clear()      # đơn giản hơn LRU; chỉ xảy ra khi có hơn 10.000 người dùng trong 60 s
        _profile_cache[profile["id"]] = (time.monotonic() + PROFILE_TTL_SECONDS, profile)


def forget_profile(user_id: str) -> None:
    """Gọi sau khi đổi role hoặc is_active, để tiến trình này áp dụng ngay."""
    with _profile_cache_lock:
        _profile_cache.pop(user_id, None)
