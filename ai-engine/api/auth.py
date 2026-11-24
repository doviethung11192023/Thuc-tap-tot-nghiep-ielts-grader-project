"""Engine-secret dependency, shared by grading_routes.py and admin_routes.py (kept in its own module to avoid a circular import)."""
import secrets

from fastapi import Header, HTTPException

from settings.config import get_settings


def require_engine_secret(x_ai_engine_secret: str | None = Header(default=None)) -> None:
    """Only the Core API may spend LLM quota here (STRIDE: direct calls to the AI engine)."""
    settings = get_settings()
    expected = settings.ai_engine_secret.strip()
    if not expected:
        # Fail closed: a deploy that forgot the secret must not serve grading to anyone who can reach it.
        if settings.allow_no_secret:
            return
        raise HTTPException(status_code=503, detail="AI_ENGINE_SECRET is not configured")
    if not secrets.compare_digest(x_ai_engine_secret or "", expected):
        raise HTTPException(status_code=403, detail="Forbidden")


def require_engine_secret_strict(x_ai_engine_secret: str | None = Header(default=None)) -> None:
    """Admin routes (đổi prompt production, xoá trace, gọi thử bằng key): luôn cần secret, kể cả khi
    ALLOW_NO_SECRET=true — chế độ đó chỉ để chấm bài trên máy local, không được mở quyền quản trị."""
    expected = get_settings().ai_engine_secret.strip()
    if not expected:
        raise HTTPException(status_code=503, detail="AI_ENGINE_SECRET is not configured")
    if not secrets.compare_digest(x_ai_engine_secret or "", expected):
        raise HTTPException(status_code=403, detail="Forbidden")
