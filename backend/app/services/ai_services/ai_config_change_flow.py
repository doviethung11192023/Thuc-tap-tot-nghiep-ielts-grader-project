"""Các bước chung của mọi lần lưu cấu hình/key: gọi thử qua engine (lỗi thì không lưu), rồi báo engine nạp lại."""
import logging
from typing import Any, Iterable, Optional

from app.clients.ai_engine import admin_client as engine
from app.services.ai_services.ai_service_errors import BadGatewayError, UnprocessableError
from app.services.ai_services.secret_redaction import redact_secrets

logger = logging.getLogger(__name__)

_ERROR_TEXT = {"env_key_missing": "Không có key trong .env của AI engine"}


async def run_test_call(payload: dict[str, Any], secrets: Iterable[Optional[str]] = ()) -> dict[str, Any]:
    """Trả {ok, latency_ms}; thất bại → 422 (lỗi nhà cung cấp) hoặc 502 (không tới được engine). Che key trong lỗi."""
    try:
        result = await engine.test_service(payload)
    except engine.AiEngineUnavailable as e:
        raise BadGatewayError(f"Không kết nối được AI engine để gọi thử, chưa lưu ({e})") from None
    except engine.AiEngineHttpError as e:
        raise UnprocessableError(f"Gọi thử thất bại: {redact_secrets(e.detail, secrets)}") from None
    if not result.get("ok"):
        error = str(result.get("error") or "không rõ lỗi")
        raise UnprocessableError(f"Gọi thử thất bại: {redact_secrets(_ERROR_TEXT.get(error, error), secrets)}")
    return {"ok": True, "latency_ms": result.get("latency_ms")}


async def refresh_engine_quietly() -> None:
    """Có hiệu lực ngay ở engine; lỗi bỏ qua vì engine tự lấy lại sau tối đa 60 s (FR-038)."""
    try:
        await engine.refresh_runtime_config()
    except Exception as e:
        logger.warning("Không báo được engine nạp lại cấu hình: %s", type(e).__name__)
