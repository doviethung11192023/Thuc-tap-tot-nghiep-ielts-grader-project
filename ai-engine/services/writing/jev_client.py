"""
TypeSafe Jev: picks one option from a fixed list and generates no text.

Only the task title is sent, never the essay. One short attempt with no retry,
because the Qwen classifier is ready as the fallback and grading has a time budget.
Key, model and timeout come from the Admin runtime config (spec 008), else .env.
"""
from __future__ import annotations

import logging

import httpx

from services.runtime_config.request_runtime_config import current_runtime_config
from settings.config import get_settings

logger = logging.getLogger(__name__)

_ENDPOINT = "https://api.typesafe.ai/v1/systemone"
_QUESTION = "essay_type"
_INSTRUCTIONS = "Which IELTS Writing Task 2 essay type does this question ask for?"


def effective_api_key() -> str:
    """Admin-set TypeSafe key if there is one, else the key from .env."""
    return current_runtime_config().keys.value("typesafe") or get_settings().typesafe_api_key


def effective_model() -> str:
    return current_runtime_config().jev.model or get_settings().jev_model


def effective_timeout() -> float:
    return current_runtime_config().jev.timeout_seconds or get_settings().jev_timeout_seconds


def is_configured() -> bool:
    return bool(effective_api_key())


def request_choice(api_key: str, model: str, timeout: float, title: str, options: dict[str, str]) -> str:
    """One Jev call with explicit credentials. Raises on any failure; returns a key of `options`."""
    response = httpx.post(
        _ENDPOINT,
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "state": title,
            "model": model,
            "questions": {
                _QUESTION: {"type": "choice", "instructions": _INSTRUCTIONS, "criteria": options}
            },
        },
        timeout=timeout,
    )
    response.raise_for_status()
    choice = response.json()["answers"][_QUESTION]["choice"]
    if choice not in options:
        raise ValueError("Jev returned a choice that is not in the options")
    return choice


def choose_essay_type(title: str, options: dict[str, str]) -> str | None:
    """Return one key of `options`, or None on any failure."""
    if not options:
        logger.warning("Jev skipped: no options in the Langfuse classify prompt")
        return None
    try:
        return request_choice(effective_api_key(), effective_model(), effective_timeout(), title, options)
    except (httpx.HTTPError, KeyError, TypeError, ValueError) as error:
        logger.warning("Jev call failed: %s", error)
        return None
