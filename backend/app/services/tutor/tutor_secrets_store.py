"""Lưu trữ mã hóa & che mờ API Key ghi đè của Admin cho Trợ lý AI (Zero-Leak Secret Store)."""
import base64
import hashlib
import hmac
import secrets
from typing import Dict, Optional

from app.core.config import settings
from app.db.supabase import db
from app.services.admin.staff_accounts import write_audit
from app.services.learning_profile.common import get_from_cache, set_to_cache

VALID_PROVIDERS = {"qwen", "groq", "gemini", "openai_compatible"}
TUTOR_SECRETS_CACHE_KEY = "ai_tutor_secrets_v1"


def _secret_key_bytes() -> bytes:
    return hashlib.sha256((settings.SUPABASE_JWT_SECRET or "local-dev-secret").encode("utf-8")).digest()


def _keystream(key: bytes, nonce: bytes, length: int) -> bytes:
    out, counter = bytearray(), 0
    while len(out) < length:
        out.extend(hashlib.sha256(key + nonce + counter.to_bytes(4, "big")).digest())
        counter += 1
    return bytes(out[:length])


def encrypt_secret(plaintext: str) -> str:
    key = _secret_key_bytes()
    nonce = secrets.token_bytes(16)
    raw = plaintext.encode("utf-8")
    ct = bytes(a ^ b for a, b in zip(raw, _keystream(key, nonce, len(raw))))
    tag = hmac.new(key, nonce + ct, hashlib.sha256).digest()[:16]
    return "v1:" + base64.urlsafe_b64encode(nonce + ct + tag).decode("ascii")


def decrypt_secret(token: str) -> str:
    if not token or not token.startswith("v1:"):
        return ""
    try:
        blob = base64.urlsafe_b64decode(token[3:].encode("ascii"))
        nonce, ct, tag = blob[:16], blob[16:-16], blob[-16:]
        key = _secret_key_bytes()
        expected = hmac.new(key, nonce + ct, hashlib.sha256).digest()[:16]
        if not hmac.compare_digest(tag, expected):
            return ""
        return bytes(a ^ b for a, b in zip(ct, _keystream(key, nonce, len(ct)))).decode("utf-8")
    except Exception:
        return ""


def mask_secret(raw: str) -> str:
    s = (raw or "").strip()
    if len(s) <= 8:
        return "****" if s else ""
    return f"{s[:4]}****{s[-4:]}"


def get_tutor_secret_overrides() -> Dict[str, str]:
    """Giải mã API Key ghi đè của Admin (chỉ dùng nội bộ phía server, tuyệt đối không trả client)."""
    cached = get_from_cache(TUTOR_SECRETS_CACHE_KEY)
    if cached is not None:
        return dict(cached)
    rows = db().table("system_settings").select("value").eq("key", "ai_tutor_secrets").execute().data or []
    raw_map = rows[0]["value"] if rows and isinstance(rows[0].get("value"), dict) else {}
    out = {k: decrypt_secret(str(v)) for k, v in raw_map.items() if k in VALID_PROVIDERS and v}
    out = {k: v for k, v in out.items() if v}
    set_to_cache(TUTOR_SECRETS_CACHE_KEY, out, ttl_seconds=60)
    return dict(out)


def save_tutor_secret_overrides(admin_id: str, updates: Dict[str, Optional[str]]) -> Dict[str, str]:
    """Lưu mã hóa hoặc xóa (None / rỗng) API Key ghi đè theo từng provider + ghi audit_logs."""
    rows = db().table("system_settings").select("value").eq("key", "ai_tutor_secrets").execute().data or []
    stored = dict(rows[0]["value"]) if rows and isinstance(rows[0].get("value"), dict) else {}
    changed: list[str] = []
    for prov, raw_val in (updates or {}).items():
        if prov not in VALID_PROVIDERS:
            continue
        if raw_val is None or not str(raw_val).strip():
            if prov in stored:
                stored.pop(prov, None)
                changed.append(f"clear:{prov}")
        else:
            stored[prov] = encrypt_secret(str(raw_val).strip())
            changed.append(f"set:{prov}")
    db().table("system_settings").upsert({
        "key": "ai_tutor_secrets", "value": stored, "updated_by": str(admin_id), "admin_role": "admin",
    }).execute()
    set_to_cache(TUTOR_SECRETS_CACHE_KEY, None, ttl_seconds=0)
    write_audit(admin_id, "update_ai_tutor_secrets", "system_settings", "ai_tutor_secrets", after={"actions": changed})
    return {k: mask_secret(v) for k, v in get_tutor_secret_overrides().items()}
