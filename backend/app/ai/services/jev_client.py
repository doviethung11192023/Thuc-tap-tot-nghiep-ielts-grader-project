"""
TypeSafe Jev: picks one option from a fixed list and generates no text.

Only the task title is sent, never the essay. One short attempt with no retry,
because the Qwen classifier is ready as the fallback and grading has a time budget.
"""
from __future__ import annotations

import logging

import httpx

from settings.config import get_settings

logger = logging.getLogger(__name__)

_ENDPOINT = "https://api.typesafe.ai/v1/systemone"
_QUESTION = "essay_type"
_INSTRUCTIONS = "Which IELTS Writing Task 2 essay type does this question ask for?"


def is_configured() -> bool:
    return bool(get_settings().typesafe_api_key)


def choose_essay_type(title: str, options: dict[str, str]) -> str | None:
    """Return one key of `options`, or None on any failure."""
    settings = get_settings()
    if not options:
        logger.warning("Jev skipped: no options in the Langfuse classify prompt")
        return None
    try:
        response = httpx.post(
            _ENDPOINT,
            headers={"Authorization": f"Bearer {settings.typesafe_api_key}"},
            json={
                "state": title,
                "model": settings.jev_model,
                "questions": {
                    _QUESTION: {
                        "type": "choice",
                        "instructions": _INSTRUCTIONS,
                        "criteria": options,
                    }
                },
            },
            timeout=settings.jev_timeout_seconds,
        )
        response.raise_for_status()
        choice = response.json()["answers"][_QUESTION]["choice"]
    except (httpx.HTTPError, KeyError, TypeError, ValueError) as error:
        logger.warning("Jev call failed: %s", error)
        return None
    return choice if choice in options else None
