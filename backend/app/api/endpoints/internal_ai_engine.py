"""Endpoint nội bộ cho AI engine (spec 008, FR-046): không dùng token người dùng, chỉ nhận X-AI-Engine-Secret."""
import secrets
from typing import Optional

from fastapi import APIRouter, Header
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.domain_errors import ForbiddenError, ServiceUnavailableError
from app.services.ai_services.ai_runtime_config_export import build_engine_runtime_config

router = APIRouter()


def _check_engine_secret(provided: Optional[str]) -> None:
    expected = settings.AI_ENGINE_SECRET
    if not expected:
        raise ServiceUnavailableError("Core chưa cấu hình AI_ENGINE_SECRET")
    # So sánh hằng thời gian trên bytes (compare_digest không nhận str có ký tự ngoài ASCII)
    if not provided or not secrets.compare_digest(provided.encode(), expected.encode()):
        raise ForbiddenError("Secret nội bộ không hợp lệ")


@router.get("/ai-engine/runtime-config")
async def get_runtime_config_for_engine(x_ai_engine_secret: Optional[str] = Header(default=None)):
    _check_engine_secret(x_ai_engine_secret)
    body = await run_in_threadpool(build_engine_runtime_config)
    # Có key đã giải mã nên không cho proxy hoặc trình duyệt giữ bản sao
    return JSONResponse(content=body, headers={"Cache-Control": "no-store"})
