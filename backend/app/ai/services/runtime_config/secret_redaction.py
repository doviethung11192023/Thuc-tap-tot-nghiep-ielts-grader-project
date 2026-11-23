"""Keep API keys out of error text, logs and responses (spec 008 R14)."""
from __future__ import annotations

import re
from collections.abc import Iterable

# Providers sometimes echo a masked key ("sk-abc****wxyz"); this catches the common sk-style shapes.
_KEY_SHAPE = re.compile(r"\bsk-[A-Za-z0-9*._\-]{4,}")
_MIN_SECRET_LENGTH = 4


def redact_secrets(text: str, secrets: Iterable[str | None] = ()) -> str:
    """Replace every known secret, and anything shaped like an sk- key, with ***."""
    result = str(text)
    for secret in sorted({s for s in secrets if s}, key=len, reverse=True):
        if len(secret) >= _MIN_SECRET_LENGTH:
            result = result.replace(secret, "***")
    return _KEY_SHAPE.sub("***", result)


def last4(secret: str | None) -> str | None:
    """Only ever show the last 4 characters of a key."""
    return secret[-4:] if secret else None
