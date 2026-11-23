"""Mã hoá đối xứng API key AI bằng Fernet (AES + HMAC, có xác thực), khoá nằm ở env của Core (FR-043)."""
import logging
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings

logger = logging.getLogger(__name__)


def _fernet() -> Optional[Fernet]:
    """None khi thiếu khoá hoặc khoá sai định dạng."""
    key = (settings.AI_SECRETS_ENCRYPTION_KEY or "").strip()
    if not key:
        return None
    try:
        return Fernet(key.encode())
    except (ValueError, TypeError):
        logger.warning("AI_SECRETS_ENCRYPTION_KEY sai định dạng Fernet")
        return None


def encryption_ready() -> bool:
    return _fernet() is not None


def encrypt_secret(plain: str) -> str:
    """Trả Fernet token (text). Chỉ gọi khi encryption_ready()."""
    fernet = _fernet()
    if fernet is None:
        raise RuntimeError("Chưa bật mã hoá key")
    return fernet.encrypt(plain.encode()).decode()


def decrypt_secret(ciphertext: str, provider: str = "") -> Optional[str]:
    """Giải mã lỗi (sai khoá, dữ liệu hỏng) → None: coi như không có key; log không chứa nội dung key."""
    fernet = _fernet()
    if fernet is None:
        logger.warning("Không giải mã được key %s: chưa có khoá mã hoá", provider)
        return None
    try:
        return fernet.decrypt(ciphertext.encode()).decode()
    except (InvalidToken, ValueError):
        logger.warning("Không giải mã được key %s: sai khoá mã hoá hoặc dữ liệu hỏng", provider)
        return None
