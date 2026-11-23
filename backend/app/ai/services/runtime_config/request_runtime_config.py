"""
Per-request snapshot of the runtime config (spec 008 FR-038).

A grading request takes one snapshot at its start; every later read in that request (and in the threads
and tasks it spawns) sees the same values, even if the cache refreshes meanwhile. The snapshot also
remembers which model each prompt actually used, so the response can name the main model.
"""
from __future__ import annotations

import asyncio
import threading
from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass, field

from services.runtime_config.runtime_config_client import get_runtime_config_client
from services.runtime_config.runtime_config_model import RuntimeConfig


@dataclass
class RequestRuntime:
    config: RuntimeConfig
    used_models: dict[str, str] = field(default_factory=dict)    # prompt name -> model after overrides
    _lock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    def record_model(self, prompt_name: str, model: str) -> None:
        with self._lock:
            self.used_models[prompt_name] = model


_current: ContextVar[RequestRuntime | None] = ContextVar("request_runtime", default=None)


async def snapshot_for_request() -> RequestRuntime:
    """Take the snapshot (may wait up to 3 s for Core, in a thread) and bind it to the current context."""
    config = await asyncio.to_thread(get_runtime_config_client().get)
    runtime = RequestRuntime(config)
    _current.set(runtime)
    return runtime


@contextmanager
def bound_runtime(runtime: RequestRuntime):
    """Bind a prebuilt snapshot for a block (tests, scripts)."""
    token = _current.set(runtime)
    try:
        yield runtime
    finally:
        _current.reset(token)


def clear_request_runtime() -> None:
    _current.set(None)


def current_request_runtime() -> RequestRuntime | None:
    return _current.get()


def current_runtime_config() -> RuntimeConfig:
    """Snapshot of this request, else the cached config (no network call outside a request)."""
    runtime = _current.get()
    return runtime.config if runtime else get_runtime_config_client().peek()
