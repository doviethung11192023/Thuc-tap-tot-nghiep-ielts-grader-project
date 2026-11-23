"""Che API key khỏi chuỗi lỗi trước khi trả trình duyệt, ghi log hoặc audit (FR-045, R14)."""
import re
from typing import Iterable, Optional

_KEY_LIKE = re.compile(r"\bsk-[A-Za-z0-9_\-]{8,}")
MAX_ERROR_LEN = 300


def redact_secrets(text: Optional[str], secrets: Iterable[Optional[str]] = ()) -> str:
    """Xoá mọi chuỗi trùng key đã biết và mọi chuỗi dạng sk-..., cắt còn 300 ký tự."""
    out = str(text or "")
    for secret in secrets:
        if secret and len(secret) >= 4:
            out = out.replace(secret, "***")
    return _KEY_LIKE.sub("sk-***", out)[:MAX_ERROR_LEN]
