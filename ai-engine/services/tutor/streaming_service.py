"""Bộ định tuyến LLM động (Qwen / Groq / Gemini / OpenAI-Compatible), SSE Streaming, Failover & Token Profiler."""
import json
from time import perf_counter
from typing import Any, AsyncIterator, Dict, Optional

from openai import AsyncOpenAI

from settings.config import get_settings
from services.tutor.prompts import build_tutor_messages, extract_spoiler_guard_data
from services.tutor.spoiler_guard import _AntiSpoilerStreamFilter
from services.tutor.stream_telemetry import (
    estimate_context_breakdown,
    extract_usage_from_chunk,
    finalize_stream_telemetry,
)

__all__ = [
    "DEFAULT_URLS",
    "_AntiSpoilerStreamFilter",
    "get_env_provider_status",
    "ping_tutor_model",
    "stream_tutor_sse",
]

DEFAULT_URLS = {
    "qwen": "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    "groq": "https://api.groq.com/openai/v1",
    "gemini": "https://generativelanguage.googleapis.com/v1beta/openai/",
    "openai_compatible": "https://api.openai.com/v1",
}


def get_env_provider_status() -> Dict[str, Any]:
    """Trả trạng thái boolean của các nguồn LLM trong .env AI Engine (tuyệt đối không trả raw key)."""
    s = get_settings()
    return {
        "qwen": {"configured": bool(s.qwen_api_key or s.llm_api_key), "default_model": s.default_llm_model, "base_url": s.default_base_url},
        "groq": {"configured": bool(s.groq_api_key), "default_model": "llama-3.3-70b-versatile", "base_url": DEFAULT_URLS["groq"]},
        "gemini": {"configured": bool(s.gemini_api_key), "default_model": "gemini-2.5-flash", "base_url": DEFAULT_URLS["gemini"]},
        "openai_compatible": {"configured": bool(s.llm_api_key), "default_model": "gpt-4o-mini", "base_url": DEFAULT_URLS["openai_compatible"]},
        "langfuse": {"configured": bool(s.langfuse_public_key and s.langfuse_secret_key)},
    }


def _resolve_api_key(provider: str, override_key: Optional[str]) -> str:
    if override_key and override_key.strip():
        return override_key.strip()
    s = get_settings()
    if provider == "qwen":
        return s.qwen_api_key or s.llm_api_key
    if provider == "groq":
        return s.groq_api_key
    if provider == "gemini":
        return s.gemini_api_key
    return s.llm_api_key or s.qwen_api_key


def _make_client(provider: str, base_url: str, api_key: str, timeout: float) -> AsyncOpenAI:
    url = (base_url or DEFAULT_URLS.get(provider) or DEFAULT_URLS["qwen"]).strip()
    return AsyncOpenAI(api_key=api_key, base_url=url, timeout=timeout, max_retries=1)


def _extra_body(base_url: str, enable_thinking: bool) -> Dict[str, Any]:
    if "dashscope" in (base_url or "").lower():
        return {"enable_thinking": bool(enable_thinking)}
    return {}


async def ping_tutor_model(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Kiểm tra kết nối thực tế tới provider/model/base_url/api_key Admin đang cấu hình."""
    provider = str(payload.get("provider") or "qwen").lower()
    model = str(payload.get("model") or "qwen-flash").strip()
    base_url = str(payload.get("base_url") or DEFAULT_URLS.get(provider, ""))
    api_key = _resolve_api_key(provider, payload.get("api_key"))
    if not api_key:
        return {"ok": False, "provider": provider, "model": model, "latency_ms": 0, "error": f"Chưa cấu hình API Key cho provider '{provider}'"}
    t0 = perf_counter()
    try:
        client = _make_client(provider, base_url, api_key, float(payload.get("timeout_seconds") or 15))
        kwargs: Dict[str, Any] = {"model": model, "messages": [{"role": "user", "content": "Reply with OK only."}], "max_tokens": 12, "temperature": 0.0}
        eb = _extra_body(base_url, bool(payload.get("enable_thinking", False)))
        if eb:
            kwargs["extra_body"] = eb
        resp = await client.chat.completions.create(**kwargs)
        text = (resp.choices[0].message.content or "").strip() if resp.choices else "OK"
        return {"ok": True, "provider": provider, "model": model, "latency_ms": round((perf_counter() - t0) * 1000, 1), "preview": text[:60], "usage": extract_usage_from_chunk(resp)}
    except Exception as exc:
        return {"ok": False, "provider": provider, "model": model, "latency_ms": round((perf_counter() - t0) * 1000, 1), "error": str(exc)[:260]}


async def _open_usage_stream(client: AsyncOpenAI, kwargs: Dict[str, Any]) -> Any:
    """Ưu tiên bật stream_options.include_usage để lấy token thật từ provider, tự fallback nếu endpoint từ chối."""
    try:
        return await client.chat.completions.create(**{**kwargs, "stream_options": {"include_usage": True}})
    except Exception as exc:
        if "stream_options" in str(exc).lower() or "include_usage" in str(exc).lower():
            return await client.chat.completions.create(**kwargs)
        raise


async def stream_tutor_sse(payload: Dict[str, Any]) -> AsyncIterator[str]:
    """Stream SSE từng token với Failover tự động Primary -> Failover, AntiSpoilerGuard và Token Telemetry."""
    messages = build_tutor_messages(payload)
    ctx_breakdown = estimate_context_breakdown(messages, payload)
    lang = "en" if str(payload.get("language") or "vi").lower() == "en" else "vi"
    strict_guard = str(payload.get("anti_spoiler_mode") or "strict") == "strict" and not bool(payload.get("unlock_answer", False))
    spoiler_terms, spoiler_letters = extract_spoiler_guard_data(payload.get("questions") or [])
    spoiler_filter = _AntiSpoilerStreamFilter(spoiler_terms, strict_guard, lang, option_letters=spoiler_letters)

    targets = [{
        "role": "primary",
        "provider": str(payload.get("primary_provider") or "qwen").lower(),
        "model": str(payload.get("primary_model") or "qwen-flash"),
        "base_url": str(payload.get("primary_base_url") or DEFAULT_URLS["qwen"]),
        "api_key": _resolve_api_key(str(payload.get("primary_provider") or "qwen").lower(), payload.get("primary_api_key")),
    }]
    if payload.get("failover_enabled"):
        f_prov = str(payload.get("failover_provider") or "groq").lower()
        f_key = _resolve_api_key(f_prov, payload.get("failover_api_key"))
        if f_key:
            targets.append({
                "role": "failover",
                "provider": f_prov,
                "model": str(payload.get("failover_model") or "llama-3.3-70b-versatile"),
                "base_url": str(payload.get("failover_base_url") or DEFAULT_URLS.get(f_prov, "")),
                "api_key": f_key,
            })

    last_err = "Không có API Key khả dụng cho nhà cung cấp AI đã chọn."
    for idx, tgt in enumerate(targets):
        if not tgt["api_key"]:
            last_err = f"Chưa cấu hình API Key cho provider '{tgt['provider']}'."
            continue
        emitted_any = False
        emitted_parts: list[str] = []
        provider_usage: Optional[Dict[str, int]] = None
        finish_reason = "stop"
        ttft_ms: Optional[float] = None
        t0 = perf_counter()
        try:
            client = _make_client(tgt["provider"], tgt["base_url"], tgt["api_key"], float(payload.get("timeout_seconds") or 30))
            kwargs: Dict[str, Any] = {
                "model": tgt["model"],
                "messages": messages,
                "temperature": float(payload.get("temperature") if payload.get("temperature") is not None else 0.3),
                "max_tokens": int(payload.get("max_output_tokens") or 420),
                "stream": True,
            }
            eb = _extra_body(tgt["base_url"], bool(payload.get("enable_thinking", False)))
            if eb:
                kwargs["extra_body"] = eb
            stream = await _open_usage_stream(client, kwargs)
            yield f"data: {json.dumps({'type': 'meta', 'provider': tgt['provider'], 'model': tgt['model'], 'failover': idx > 0}, ensure_ascii=False)}\n\n"
            async for chunk in stream:
                u = extract_usage_from_chunk(chunk)
                if u:
                    provider_usage = u
                if getattr(chunk, "choices", None):
                    fr = getattr(chunk.choices[0], "finish_reason", None)
                    if fr:
                        finish_reason = str(fr)
                    delta = chunk.choices[0].delta.content if chunk.choices[0].delta else None
                else:
                    delta = None
                if delta:
                    emitted_any = True
                    if ttft_ms is None:
                        ttft_ms = (perf_counter() - t0) * 1000.0
                    safe_out = spoiler_filter.feed(delta)
                    if safe_out:
                        emitted_parts.append(safe_out)
                        yield f"data: {json.dumps({'type': 'token', 'content': safe_out}, ensure_ascii=False)}\n\n"
            tail = spoiler_filter.flush()
            if tail:
                emitted_parts.append(tail)
                yield f"data: {json.dumps({'type': 'token', 'content': tail}, ensure_ascii=False)}\n\n"
            tele = finalize_stream_telemetry(t0, ttft_ms, provider_usage, "".join(emitted_parts), ctx_breakdown, finish_reason, spoiler_filter.redaction_count)
            done_payload = {"type": "done", "provider": tgt["provider"], "model": tgt["model"], "failover": idx > 0, "redacted": spoiler_filter.redacted, **tele}
            yield f"data: {json.dumps(done_payload, ensure_ascii=False)}\n\n"
            return
        except Exception as exc:
            last_err = f"{tgt['provider']}/{tgt['model']}: {str(exc)[:220]}"
            if emitted_any:
                yield f"data: {json.dumps({'type': 'error', 'detail': last_err}, ensure_ascii=False)}\n\n"
                return
    yield f"data: {json.dumps({'type': 'error', 'detail': last_err}, ensure_ascii=False)}\n\n"
