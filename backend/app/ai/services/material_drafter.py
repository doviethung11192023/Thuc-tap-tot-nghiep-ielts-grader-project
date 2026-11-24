"""
Drafts of per-task Writing material (spec 006, ADR-30): Task 1 answer key, outline, sample essay.

Drafts only: nothing here is used for grading or shown to learners until an Admin approves it
(BR-19 as reworded 2026-11-11). The Core API stores the draft; this engine has no DB access.
"""
from __future__ import annotations

import asyncio
import json

from schemas.answer_key import AnswerKey, parse_answer_key
from services.chart_describer import _image_to_data_url, _with_image
from services.langfuse.prompt_manager import PromptManager
from services.llm_client import strip_markdown_fence
from services.llm_evaluator import call_llm_json

MATERIAL_KINDS = ("answer_key", "outline", "sample")


class MaterialRequestError(ValueError):
    """The request cannot produce a draft (HTTP 422)."""


def _parse_key(raw_text: str) -> dict:
    data = json.loads(strip_markdown_fence(raw_text))
    parse_answer_key(data)            # invalid → retry inside call_llm_json
    return data


def _parse_text(raw_text: str) -> str:
    data = json.loads(strip_markdown_fence(raw_text))
    text = str((data or {}).get("text") or "").strip() if isinstance(data, dict) else ""
    if not text:
        raise ValueError("draft must be {text: ...}")
    return text


async def draft_answer_key(title: str, image_url: str, pm: PromptManager) -> dict:
    data_url = await _image_to_data_url(image_url)
    compiled = await asyncio.to_thread(pm.get_answer_key_prompt, title)
    compiled = compiled.__class__(**{**compiled.__dict__,
                                     "messages": _with_image(compiled.messages, data_url, f"Task prompt:\n{title}")})
    return await call_llm_json("answer_key", compiled, _parse_key, compiled.model)


async def draft_text(kind: str, task_type: str, title: str, key: AnswerKey | None, pm: PromptManager) -> str:
    chart = key.to_prompt_text() if key else "(Task 2: no chart)"
    compiled = await asyncio.to_thread(pm.get_material_prompt, kind, task_type=task_type, title=title,
                                       chart_data=chart)
    return await call_llm_json(kind, compiled, _parse_text, compiled.model)


async def draft_material(kind: str, task_type: str, title: str, image_url: str | None,
                         answer_key: dict | None, pm: PromptManager) -> dict | str:
    if kind not in MATERIAL_KINDS:
        raise MaterialRequestError(f"kind must be one of {MATERIAL_KINDS}")
    if kind == "answer_key":
        if task_type != "task1" or not image_url:
            raise MaterialRequestError("an answer key needs a Task 1 chart image")
        return await draft_answer_key(title, image_url, pm)
    key = None
    if task_type == "task1":
        if not answer_key:
            raise MaterialRequestError("a Task 1 outline or sample needs an approved answer key")
        try:
            key = parse_answer_key(answer_key)
        except ValueError as e:
            raise MaterialRequestError(f"answer key invalid: {e}") from e
    return await draft_text(kind, task_type, title, key, pm)
