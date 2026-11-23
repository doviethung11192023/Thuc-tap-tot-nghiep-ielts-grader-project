"""
Shared OpenAI-compatible LLM clients.

Clients come from `langfuse.openai`, so every call becomes a generation (model, usage, errors) on the trace
of the current grading run. They are cached per (api_key, base_url, timeout) for connection pooling: the
key and the timeout come from the Admin runtime config (spec 008) and fall back to .env, so changing them
builds a new client and never touches calls already running. The SDK's own retries are kept low because
callers implement JSON-aware retries themselves.
"""
from __future__ import annotations

from functools import lru_cache

from langfuse.openai import AsyncOpenAI, OpenAI

from services.langfuse.client import get_langfuse_client
from services.runtime_config.request_runtime_config import current_runtime_config
from settings.config import get_settings


def effective_llm_api_key() -> str:
    """Admin-set DashScope key if there is one, else the key from .env."""
    return current_runtime_config().keys.value("dashscope") or get_settings().resolved_llm_api_key


def effective_llm_timeout() -> float:
    override = current_runtime_config().llm.timeout_seconds
    return override if override else get_settings().llm_timeout_seconds


def effective_enable_thinking() -> bool:
    override = current_runtime_config().llm.enable_thinking
    return get_settings().llm_enable_thinking if override is None else override


def ensure_langfuse_client() -> None:
    """langfuse.openai finds the default Langfuse client when it logs a call: create it before the first call."""
    try:
        get_langfuse_client()
    except Exception:       # tracing must never stop grading
        pass


# maxsize is small on purpose: an old key must not stay in memory after the Admin replaced it
@lru_cache(maxsize=4)
def build_async_client(api_key: str, base_url: str, timeout: float) -> AsyncOpenAI:
    ensure_langfuse_client()
    return AsyncOpenAI(api_key=api_key, base_url=base_url, timeout=timeout, max_retries=2)


@lru_cache(maxsize=4)
def build_sync_client(api_key: str, base_url: str, timeout: float) -> OpenAI:
    ensure_langfuse_client()
    return OpenAI(api_key=api_key, base_url=base_url, timeout=timeout, max_retries=2)


def get_async_llm_client() -> AsyncOpenAI:
    return build_async_client(effective_llm_api_key(), get_settings().default_base_url, effective_llm_timeout())


def get_sync_llm_client() -> OpenAI:
    return build_sync_client(effective_llm_api_key(), get_settings().default_base_url, effective_llm_timeout())


def llm_extra_body() -> dict:
    """Provider-specific request fields (passed as `extra_body=`).

    DashScope: `enable_thinking` (off by default; Admin runtime config or settings.llm_enable_thinking).
    Other OpenAI-compatible providers get nothing, since they may reject unknown fields.
    """
    if "dashscope" in get_settings().default_base_url:
        return {"enable_thinking": effective_enable_thinking()}
    return {}


def strip_markdown_fence(raw_text: str) -> str:
    """Remove a ```json ... ``` (or ``` ... ```) wrapper some models add around JSON."""
    text = raw_text.strip()
    if text.startswith("```json"):
        return text.split("```json", 1)[1].rsplit("```", 1)[0].strip()
    if text.startswith("```"):
        return text.split("```", 1)[1].rsplit("```", 1)[0].strip()
    return text


def trace_options(compiled, name: str | None = None) -> dict:
    """kwargs cho wrapper langfuse.openai: đặt tên lần gọi theo prompt và nối với phiên bản prompt trong trace.

    Không có prompt Langfuse thật (test, gọi thử) thì trả {} để client thường không nhận tham số lạ.
    """
    prompt = getattr(compiled, "langfuse_prompt", None)
    prompt_name = getattr(prompt, "name", None)
    if not isinstance(prompt_name, str):
        return {}
    return {"name": name or prompt_name, "langfuse_prompt": prompt}

