"""
Shared OpenAI-compatible LLM clients.

One sync + one async client per process (connection pooling), both configured
from settings: base URL, API key and request timeout. The SDK's own retries are
kept low because callers implement JSON-aware retries themselves.
"""
from __future__ import annotations

from functools import lru_cache

from openai import AsyncOpenAI, OpenAI

from settings.config import get_settings


@lru_cache(maxsize=1)
def get_async_llm_client() -> AsyncOpenAI:
    settings = get_settings()
    return AsyncOpenAI(
        api_key=settings.resolved_llm_api_key,
        base_url=settings.default_base_url,
        timeout=settings.llm_timeout_seconds,
        max_retries=2,
    )


@lru_cache(maxsize=1)
def get_sync_llm_client() -> OpenAI:
    settings = get_settings()
    return OpenAI(
        api_key=settings.resolved_llm_api_key,
        base_url=settings.default_base_url,
        timeout=settings.llm_timeout_seconds,
        max_retries=2,
    )


def llm_extra_body() -> dict:
    """Provider-specific request fields (passed as `extra_body=`).

    DashScope: `enable_thinking` (off by default — see settings.llm_enable_thinking).
    Other OpenAI-compatible providers get nothing, since they may reject unknown fields.
    """
    settings = get_settings()
    if "dashscope" in settings.default_base_url:
        return {"enable_thinking": settings.llm_enable_thinking}
    return {}


def strip_markdown_fence(raw_text: str) -> str:
    """Remove a ```json ... ``` (or ``` ... ```) wrapper some models add around JSON."""
    text = raw_text.strip()
    if text.startswith("```json"):
        return text.split("```json", 1)[1].rsplit("```", 1)[0].strip()
    if text.startswith("```"):
        return text.split("```", 1)[1].rsplit("```", 1)[0].strip()
    return text
