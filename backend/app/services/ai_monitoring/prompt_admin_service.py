"""Proxy quản lý prompt tới AI engine (US5): Core kiểm model cho phép và ghi audit khi thành công (FR-022, FR-024)."""
from typing import Any

from app.clients import ai_engine_admin_client as engine
from app.core.domain_errors import NotFoundError
from app.services.admin.staff_accounts import write_audit
from app.services.ai_services.ai_allowed_models import get_allowed_models
from app.services.ai_services.ai_service_errors import BadGatewayError, UnprocessableError

BAD_GATEWAY_MESSAGE = "Không kết nối được Langfuse/AI engine"


async def _call(coro_factory):
    """Engine 4xx (422/404) giữ nguyên lý do; engine tắt hoặc 5xx → 502. Lời lỗi 5xx không chuyển tiếp."""
    try:
        return await coro_factory()
    except engine.AiEngineUnavailable:
        raise BadGatewayError(BAD_GATEWAY_MESSAGE) from None
    except engine.AiEngineHttpError as e:
        if e.status_code == 404:
            raise NotFoundError(e.detail) from None
        if e.status_code in (400, 422):
            raise UnprocessableError(e.detail) from None
        raise BadGatewayError(BAD_GATEWAY_MESSAGE) from None


async def list_prompts() -> Any:
    return await _call(engine.list_prompts)


async def prompt_detail(name: str, version: int) -> Any:
    return await _call(lambda: engine.prompt_detail(name, version))


async def create_version(admin_id: str, body: dict[str, Any]) -> Any:
    config = body.get("config")
    model = config.get("model") if isinstance(config, dict) else None
    if model is not None:
        allowed = get_allowed_models()
        if model not in allowed:
            raise UnprocessableError(f"Model '{model}' không nằm trong danh sách cho phép: {', '.join(allowed)}")
    result = await _call(lambda: engine.create_prompt_version(body))
    write_audit(admin_id, "create_prompt_version", "prompts", body.get("name"),
                after={"name": result.get("name", body.get("name")), "version": result.get("version")})
    return result


async def set_production(admin_id: str, body: dict[str, Any]) -> Any:
    result = await _call(lambda: engine.set_prompt_production(body))
    write_audit(admin_id, "set_prompt_production", "prompts", body.get("name"),
                before={"version": result.get("previous_version")}, after={"version": result.get("version")})
    return result
