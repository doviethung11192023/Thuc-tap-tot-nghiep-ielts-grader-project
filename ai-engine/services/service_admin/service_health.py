"""
Health of every service the engine depends on (spec 008 R13, US11).

Network checks (LLM, Jev, Langfuse, Core config) run in parallel with an 8 s timeout each. Local components
(Whisper, wav2vec2) are only inspected through their module variables: this module NEVER
loads a model, so a health check can neither be slow nor take GPU memory.
"""
from __future__ import annotations

import asyncio
import time
from datetime import datetime, timezone
from typing import Awaitable, Callable

from services.writing import jev_client
from services.langfuse.client import get_langfuse_client
from services.llm.llm_client import effective_llm_api_key
from services.runtime_config.runtime_config_client import get_runtime_config_client
from services.runtime_config.secret_redaction import redact_secrets
from services.service_admin.service_test_call import ServiceTestRequest, run_service_test
from services.speaking import phoneme_recognizer, speech_transcriber
from settings.config import get_settings

CHECK_TIMEOUT_SECONDS = 8.0
SERVICES = ("llm", "jev", "langfuse", "whisper", "phoneme", "config_sync")

# Startup load failures of local models (main.lifespan records them; a later successful load clears them)
_load_failures: dict[str, str] = {}


def record_load_failure(service: str, error: BaseException) -> None:
    _load_failures[service] = redact_secrets(f"{type(error).__name__}: {error}")[:300]


def _result(service: str, status: str, latency_ms: int | None = None, detail: str | None = None,
            error: str | None = None) -> dict:
    return {"service": service, "status": status, "latency_ms": latency_ms, "detail": detail, "error": error}


def _elapsed_ms(started: float) -> int:
    return round((time.perf_counter() - started) * 1000)


def _network_status(outcome: dict) -> str:
    if outcome["ok"]:
        return "ok"
    return "timeout" if "timeout" in (outcome["error"] or "").lower() else "error"


# ── network checks ───────────────────────────────────────────────────────────
async def _check_llm() -> dict:
    settings = get_settings()
    if not effective_llm_api_key():
        return _result("llm", "not_configured", detail=settings.default_llm_model)
    outcome = await run_service_test(ServiceTestRequest(kind="llm", timeout_seconds=CHECK_TIMEOUT_SECONDS,
                                                        max_tokens=5))
    status = _network_status(outcome)
    return _result("llm", status, outcome["latency_ms"], settings.default_llm_model, outcome["error"])


async def _check_jev() -> dict:
    if not jev_client.is_configured():
        return _result("jev", "not_configured", detail=jev_client.effective_model())
    outcome = await run_service_test(ServiceTestRequest(kind="jev", timeout_seconds=CHECK_TIMEOUT_SECONDS))
    status = _network_status(outcome)
    return _result("jev", status, outcome["latency_ms"], jev_client.effective_model(), outcome["error"])


async def _check_langfuse() -> dict:
    settings = get_settings()
    if not (settings.langfuse_public_key and settings.langfuse_secret_key):
        return _result("langfuse", "not_configured", detail=settings.langfuse_base_url)
    started = time.perf_counter()
    try:
        await asyncio.to_thread(lambda: get_langfuse_client().auth_check())
    except Exception as error:
        message = redact_secrets(f"{type(error).__name__}: {error}",
                                 [settings.langfuse_secret_key, settings.langfuse_public_key])[:300]
        return _result("langfuse", "error", _elapsed_ms(started), settings.langfuse_base_url, message)
    return _result("langfuse", "ok", _elapsed_ms(started), settings.langfuse_base_url)


async def _check_config_sync() -> dict:
    """Fetches from Core now, so the answer is current rather than the last background result."""
    state = await asyncio.to_thread(get_runtime_config_client().refresh)
    detail = f"last_ok_at={state['last_ok_at']}"
    if state["last_error"] is None:
        return _result("config_sync", "ok", detail=detail)
    status = "error" if state["source"] == "core" else "env_fallback"
    return _result("config_sync", status, detail=detail, error=state["last_error"])


# ── local components: read module variables only, never load ─────────────────
def _local_model_detail(model, name: str, fallback_device: str) -> str:
    inner = getattr(model, "model", model)
    device = getattr(inner, "device", None) or fallback_device
    compute = getattr(inner, "compute_type", None)
    return " · ".join(str(part) for part in (name, device, compute) if part)


def _check_whisper() -> dict:
    settings = get_settings()
    model = speech_transcriber._model
    if model is not None:
        return _result("whisper", "loaded", detail=_local_model_detail(model, settings.speech_stt_model,
                                                                      settings.speech_device))
    failure = _load_failures.get("whisper")
    return _result("whisper", "error" if failure else "not_loaded", detail=settings.speech_stt_model, error=failure)


def _check_phoneme() -> dict:
    settings = get_settings()
    model = phoneme_recognizer._model
    if model is not None:
        return _result("phoneme", "loaded", detail=_local_model_detail(model, settings.speech_phoneme_model,
                                                                      settings.speech_device))
    failure = _load_failures.get("phoneme")
    return _result("phoneme", "error" if failure else "not_loaded", detail=settings.speech_phoneme_model,
                   error=failure)


async def _timed(service: str, check: Callable[[], Awaitable[dict]]) -> dict:
    try:
        return await asyncio.wait_for(check(), CHECK_TIMEOUT_SECONDS)
    except asyncio.TimeoutError:
        return _result(service, "timeout", int(CHECK_TIMEOUT_SECONDS * 1000), error="No answer in 8 s")
    except Exception as error:      # a broken check must not hide the other services
        return _result(service, "error", error=redact_secrets(f"{type(error).__name__}: {error}")[:300])


async def _local(check: Callable[[], dict]) -> dict:
    return check()


async def check_health(service: str = "all") -> dict:
    checks: dict[str, Callable[[], Awaitable[dict]]] = {
        "llm": _check_llm, "jev": _check_jev, "langfuse": _check_langfuse, "config_sync": _check_config_sync,
        "whisper": lambda: _local(_check_whisper), "phoneme": lambda: _local(_check_phoneme),
    }
    wanted = SERVICES if service == "all" else (service,)
    results = await asyncio.gather(*(_timed(name, checks[name]) for name in wanted))
    return {"checked_at": datetime.now(timezone.utc).isoformat(), "services": list(results)}
