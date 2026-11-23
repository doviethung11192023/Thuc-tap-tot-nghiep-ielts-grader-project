"""
One real call to a provider with candidate settings, for "test before save" (spec 008 R12).

LLM: a single chat completion "Reply with OK" with exactly the candidate model, temperature, max_tokens,
thinking, timeout and key. Jev: a single classification of a fixed sample title. No Learner data is sent,
no run usage is recorded (there is no usage meter in an admin request), and errors are redacted and cut.
Every candidate field may be None, which means "the value in effect now".
"""
from __future__ import annotations

import asyncio
import time
from typing import Literal

from langfuse.openai import AsyncOpenAI
from pydantic import BaseModel, Field

from services import jev_client
from services.llm_client import (
    effective_enable_thinking, effective_llm_api_key, effective_llm_timeout, ensure_langfuse_client,
)
from services.runtime_config.secret_redaction import redact_secrets
from settings.config import get_settings

ERROR_MAX_CHARS = 300
_SAMPLE_TITLE = "Some people think children should start school early. Do you agree or disagree?"
_SAMPLE_OPTIONS = {"Opinion": "Asks whether the writer agrees or disagrees.",
                   "Discussion": "Asks the writer to discuss both views."}


class ServiceTestRequest(BaseModel):
    kind: Literal["llm", "jev"]
    model: str | None = Field(default=None, max_length=100)
    temperature: float | None = None
    max_tokens: int | None = Field(default=None, ge=1, le=100_000)
    timeout_seconds: float | None = Field(default=None, gt=0, le=600)
    enable_thinking: bool | None = None
    api_key: str | None = Field(default=None, max_length=512)
    use_env_key: bool = False


def _env_key(kind: str) -> str:
    settings = get_settings()
    return settings.resolved_llm_api_key if kind == "llm" else settings.typesafe_api_key


def _pick_key(req: ServiceTestRequest) -> str:
    """Candidate key, else the .env key when asked, else the key in effect (app, then .env)."""
    if req.api_key and req.api_key.strip():
        return req.api_key.strip()
    if req.use_env_key:
        return _env_key(req.kind)
    return effective_llm_api_key() if req.kind == "llm" else jev_client.effective_api_key()


async def _call_llm(req: ServiceTestRequest, api_key: str) -> None:
    settings = get_settings()
    ensure_langfuse_client()
    # a throwaway client: a candidate key must not enter the shared client cache
    client = AsyncOpenAI(api_key=api_key, base_url=settings.default_base_url, max_retries=0,
                         timeout=req.timeout_seconds or effective_llm_timeout())
    options: dict = {}
    if req.temperature is not None:
        options["temperature"] = req.temperature
    if "dashscope" in settings.default_base_url:
        thinking = effective_enable_thinking() if req.enable_thinking is None else req.enable_thinking
        options["extra_body"] = {"enable_thinking": thinking}
    async with client:
        response = await client.chat.completions.create(
            model=req.model or settings.default_llm_model,
            messages=[{"role": "user", "content": "Reply with OK"}],
            max_tokens=req.max_tokens or 50,
            name="service-test",        # langfuse.openai names the generation; no Learner data in it
            **options,
        )
    if not response.choices:
        raise ValueError("The provider returned no choices")


async def _call_jev(req: ServiceTestRequest, api_key: str) -> None:
    await asyncio.to_thread(
        jev_client.request_choice, api_key, req.model or jev_client.effective_model(),
        req.timeout_seconds or jev_client.effective_timeout(), _SAMPLE_TITLE, _SAMPLE_OPTIONS)


async def run_service_test(req: ServiceTestRequest) -> dict:
    """{ok, latency_ms, error}; never raises."""
    api_key = _pick_key(req)
    if not api_key:
        return {"ok": False, "latency_ms": 0, "error": "env_key_missing" if req.use_env_key else "key_missing"}
    started = time.perf_counter()
    error: str | None = None
    try:
        await (_call_llm(req, api_key) if req.kind == "llm" else _call_jev(req, api_key))
    except Exception as exc:
        secrets = [api_key, _env_key("llm"), _env_key("jev")]
        error = redact_secrets(f"{type(exc).__name__}: {exc}", secrets)[:ERROR_MAX_CHARS]
    return {"ok": error is None, "latency_ms": round((time.perf_counter() - started) * 1000), "error": error}
