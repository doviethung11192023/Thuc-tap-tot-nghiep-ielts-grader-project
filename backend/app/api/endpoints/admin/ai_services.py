"""Trang Service AI của Admin (spec 008, US5 + US9–US11): sức khoẻ, cấu hình chạy, API key, prompt.
Mọi route dùng require_admin; lỗi nghiệp vụ là DomainError (main.py đổi thành {"detail": ...})."""
import asyncio
from typing import Any, Awaitable, Callable, Optional

from fastapi import APIRouter, Depends, Query
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from app.api.responses import ok
from app.core.security import User, require_admin
from app.services.ai_monitoring import prompt_admin_service as prompts
from app.services.ai_services import ai_provider_keys as keys
from app.services.ai_services import ai_runtime_config_service as runtime_config
from app.services.ai_services.ai_service_health import collect_health

router = APIRouter()





async def _off_loop(fn: Callable[..., Awaitable[Any]], *args: Any) -> Any:
    """Service ở đây trộn supabase-py đồng bộ với httpx async: chạy cả hàm trong luồng phụ có event loop riêng
    để lời gọi DB không chặn event loop chính của API (bài học ADR-32). Client httpx tạo mới mỗi lần gọi nên an toàn."""
    return await run_in_threadpool(lambda: asyncio.run(fn(*args)))

class StepOverrideBody(BaseModel):
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None


class LlmOverrideBody(BaseModel):
    timeout_seconds: Optional[float] = None
    enable_thinking: Optional[bool] = None


class JevOverrideBody(BaseModel):
    model: Optional[str] = None
    timeout_seconds: Optional[float] = None


class ProviderKeyBody(BaseModel):
    api_key: str


class PromptMessage(BaseModel):
    role: str
    content: str


class PromptVersionBody(BaseModel):
    name: str
    prompt: list[PromptMessage]
    config: dict[str, Any] = {}


class PromptProductionBody(BaseModel):
    name: str
    version: int


# --- Sức khoẻ (US11) ---
@router.get("/ai-services/health")
async def get_ai_services_health(service: str = Query("all"), current_user: User = Depends(require_admin)):
    return ok(await _off_loop(collect_health, service), message="OK")


# --- Cấu hình chạy (US9) ---
@router.get("/ai-services/runtime-config")
async def get_runtime_config(current_user: User = Depends(require_admin)):
    return ok(await _off_loop(runtime_config.get_runtime_config_view), message="OK")


@router.put("/ai-services/runtime-config/steps/{step}")
async def put_step_override(step: str, body: StepOverrideBody, current_user: User = Depends(require_admin)):
    # exclude_unset: trường không gửi giữ nguyên, null bỏ ghi đè
    data = await _off_loop(runtime_config.update_step_override,
        str(current_user.id), step, body.model_dump(exclude_unset=True))
    return ok(data, message="Đã lưu cấu hình")


@router.put("/ai-services/runtime-config/llm")
async def put_llm_override(body: LlmOverrideBody, current_user: User = Depends(require_admin)):
    data = await _off_loop(runtime_config.update_group_override,
        str(current_user.id), "llm", body.model_dump(exclude_unset=True))
    return ok(data, message="Đã lưu cấu hình")


@router.put("/ai-services/runtime-config/jev")
async def put_jev_override(body: JevOverrideBody, current_user: User = Depends(require_admin)):
    data = await _off_loop(runtime_config.update_group_override,
        str(current_user.id), "jev", body.model_dump(exclude_unset=True))
    return ok(data, message="Đã lưu cấu hình")


# --- API key (US10): response chỉ có last4, không bao giờ có key đầy đủ ---
@router.get("/ai-services/keys")
async def get_provider_keys(current_user: User = Depends(require_admin)):
    return ok(await _off_loop(keys.list_keys), message="OK")


@router.put("/ai-services/keys/{provider}")
async def put_provider_key(provider: str, body: ProviderKeyBody, current_user: User = Depends(require_admin)):
    return ok(await _off_loop(keys.replace_key, str(current_user.id), provider, body.api_key), message="Đã thay key")


@router.delete("/ai-services/keys/{provider}")
async def delete_provider_key(provider: str, current_user: User = Depends(require_admin)):
    return ok(await _off_loop(keys.revert_to_env_key, str(current_user.id), provider), message="Đã quay về key trong .env")


# --- Prompt (US5): proxy tới engine ---
@router.get("/prompts")
async def get_prompts(current_user: User = Depends(require_admin)):
    return ok(await _off_loop(prompts.list_prompts), message="OK")


@router.get("/prompts/detail")
async def get_prompt_detail(name: str, version: int, current_user: User = Depends(require_admin)):
    return ok(await _off_loop(prompts.prompt_detail, name, version), message="OK")


@router.post("/prompts/versions", status_code=201)
async def post_prompt_version(body: PromptVersionBody, current_user: User = Depends(require_admin)):
    result = await _off_loop(prompts.create_version, str(current_user.id), body.model_dump())
    return ok(result, message="Đã tạo phiên bản mới", code=201)


@router.put("/prompts/production")
async def put_prompt_production(body: PromptProductionBody, current_user: User = Depends(require_admin)):
    return ok(await _off_loop(prompts.set_production, str(current_user.id), body.model_dump()), message="Đã đổi phiên bản đang chạy")
