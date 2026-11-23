"""Gọi các route /admin/* của AI engine (spec 008, contracts/ai-engine-admin-api.md). Mọi route cần X-AI-Engine-Secret.
Không log body vì body gọi thử có thể chứa API key ứng viên."""
from typing import Any, Optional

import httpx

from app.core.config import settings


class AiEngineUnavailable(RuntimeError):
    """Không kết nối được (mạng, hết giờ). Chỉ mang tên lỗi, không mang nội dung request."""


class AiEngineHttpError(RuntimeError):
    """Engine trả 4xx/5xx; detail là lời engine (engine đã che key)."""

    def __init__(self, status_code: int, detail: str):
        super().__init__(f"HTTP {status_code}: {detail}")
        self.status_code, self.detail = status_code, detail


def _url(path: str) -> str:
    """AI_ENGINE_URL trỏ tới /grade; các route khác cùng host."""
    return f"{settings.AI_ENGINE_URL.rsplit('/grade', 1)[0]}{path}"


async def _request(method: str, path: str, *, timeout: float, json: Any = None,
                   params: Optional[dict] = None) -> Any:
    headers = {"X-AI-Engine-Secret": settings.AI_ENGINE_SECRET}
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.request(method, _url(path), json=json, params=params, headers=headers)
    except httpx.TimeoutException as e:
        raise AiEngineUnavailable(f"Hết thời gian chờ ({type(e).__name__})") from None
    except httpx.HTTPError as e:
        raise AiEngineUnavailable(f"Không kết nối được ({type(e).__name__})") from None
    if response.status_code >= 400:
        try:
            detail = response.json().get("detail")
        except Exception:
            detail = None
        raise AiEngineHttpError(response.status_code, str(detail if detail is not None else response.text)[:500])
    return response.json()


async def check_alive() -> Any:
    """Core tự kiểm engine còn sống (3 s)."""
    return await _request("GET", "/health", timeout=3.0)


async def services_health(service: str = "all") -> dict[str, Any]:
    return await _request("GET", "/admin/services/health", timeout=20.0, params={"service": service})


async def effective_config() -> dict[str, Any]:
    return await _request("GET", "/admin/services/effective-config", timeout=15.0)


async def test_service(payload: dict[str, Any]) -> dict[str, Any]:
    """Gọi thử nhà cung cấp; chờ lâu hơn timeout của chính lần gọi thử."""
    wait = float(payload.get("timeout_seconds") or 60) + 30.0
    return await _request("POST", "/admin/services/test", timeout=wait, json=payload)


async def refresh_runtime_config() -> dict[str, Any]:
    return await _request("POST", "/admin/runtime-config/refresh", timeout=10.0)


async def list_prompts() -> Any:
    return await _request("GET", "/admin/prompts", timeout=30.0)


async def prompt_detail(name: str, version: int) -> Any:
    return await _request("GET", "/admin/prompts/detail", timeout=30.0, params={"name": name, "version": version})


async def create_prompt_version(body: dict[str, Any]) -> Any:
    return await _request("POST", "/admin/prompts/versions", timeout=30.0, json=body)


async def set_prompt_production(body: dict[str, Any]) -> Any:
    return await _request("PUT", "/admin/prompts/production", timeout=30.0, json=body)


async def post_trace_scores(items: list[dict[str, Any]]) -> Any:
    return await _request("POST", "/admin/traces/scores", timeout=30.0, json={"items": items})


async def delete_traces(trace_ids: list[str]) -> Any:
    return await _request("POST", "/admin/traces/delete", timeout=60.0, json={"trace_ids": trace_ids})
