"""
Token usage of one grading request, summed per model (spec 008 R3).

The meter lives in a ContextVar and is a plain mutable object, so the threads and tasks a request spawns
(asyncio.to_thread copies the context) all add to the same totals. Outside a request there is no meter
and recording does nothing. Every `chat.completions.create` call site records its response here.
"""
from __future__ import annotations

import threading
from contextvars import ContextVar
from typing import Any


class UsageMeter:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._per_model: dict[str, list[int]] = {}

    def add(self, model: str, input_tokens: int, output_tokens: int) -> None:
        with self._lock:
            totals = self._per_model.setdefault(model, [0, 0])
            totals[0] += input_tokens
            totals[1] += output_tokens

    def snapshot(self) -> list[dict]:
        with self._lock:
            return [{"model": model, "input_tokens": t[0], "output_tokens": t[1]}
                    for model, t in self._per_model.items()]


_meter: ContextVar[UsageMeter | None] = ContextVar("usage_meter", default=None)


def start_usage_meter() -> UsageMeter:
    """Begin counting in the current context (one per grading request)."""
    meter = UsageMeter()
    _meter.set(meter)
    return meter


def stop_usage_meter() -> None:
    _meter.set(None)


def _count(value: Any) -> int:
    return value if isinstance(value, int) and not isinstance(value, bool) and value > 0 else 0


def record_usage(response: Any, model: str | None = None) -> None:
    """Add `response.usage` to the request's meter, under the model that was asked for.

    Never raises: a response without usage (a test double, a provider that omits it) counts as nothing.
    """
    meter = _meter.get()
    if meter is None:
        return
    usage = getattr(response, "usage", None)
    if usage is None:
        return
    name = model or getattr(response, "model", None)
    if not isinstance(name, str) or not name:
        return
    meter.add(name, _count(getattr(usage, "prompt_tokens", 0)), _count(getattr(usage, "completion_tokens", 0)))
