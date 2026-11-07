"""
Per-part feedback and the overall report. These explain a result that already exists, so a failure
here costs only the extra commentary: grading must still finish with its four scores.
"""
from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass

from services.llm_client import get_async_llm_client, llm_extra_body, strip_markdown_fence
from services.prompt_builder import CompiledPrompt, get_prompt_manager
from settings.config import get_settings

logger = logging.getLogger(__name__)

_MAX_TRIES = 2


@dataclass(frozen=True)
class PartAnswer:
    part: int
    question: str
    answer: str
    speaking_seconds: float


async def _json_completion(compiled: CompiledPrompt) -> dict:
    client = get_async_llm_client()
    last_error: Exception | None = None
    for _ in range(_MAX_TRIES):
        try:
            response = await client.chat.completions.create(
                model=get_settings().default_llm_model,
                messages=compiled.messages,
                temperature=compiled.temperature,
                max_tokens=compiled.max_tokens,
                response_format={"type": "json_object"},
                extra_body=llm_extra_body(),
            )
            data = json.loads(strip_markdown_fence(response.choices[0].message.content or "{}"))
            if isinstance(data, dict):
                return data
            last_error = ValueError("JSON must be an object")
        except Exception as err:
            last_error = err
    raise RuntimeError(f"Feedback generation failed: {last_error}")


async def _one_part(title: str, part: int, answers: list[PartAnswer]) -> tuple[str, dict | None]:
    key = f"part{part}"
    manager = get_prompt_manager()
    try:
        if part == 2:
            talk = answers[0]
            compiled = await asyncio.to_thread(
                manager.get_speaking_part_prompt, key, test_title=title, cue_card=talk.question,
                answer=talk.answer, speaking_duration_seconds=round(talk.speaking_seconds))
        else:
            pairs = "\n\n".join(f"Q: {a.question}\nA: {a.answer}" for a in answers)
            compiled = await asyncio.to_thread(manager.get_speaking_part_prompt, key, test_title=title,
                                               questions_and_answers=pairs)
        return key, await _json_completion(compiled)
    except Exception as err:
        logger.warning("Speaking %s feedback skipped: %s", key, err)
        return key, None


async def generate_part_feedback(title: str, answers: list[PartAnswer]) -> dict[str, dict | None]:
    parts = sorted({a.part for a in answers})
    results = await asyncio.gather(*(_one_part(title, part, [a for a in answers if a.part == part]) for part in parts))
    return dict(results)


async def generate_overall(title: str, criteria: dict[str, dict]) -> dict | None:
    try:
        compiled = await asyncio.to_thread(
            get_prompt_manager().get_speaking_overall_prompt, test_title=title,
            bands=json.dumps({name: value["band"] for name, value in criteria.items()}),
            fc_feedback=json.dumps(criteria["fc"], ensure_ascii=False),
            lr_feedback=json.dumps(criteria["lr"], ensure_ascii=False),
            gra_feedback=json.dumps(criteria["gra"], ensure_ascii=False),
            pr_feedback=json.dumps(criteria["pr"], ensure_ascii=False),
        )
        return await _json_completion(compiled)
    except Exception as err:
        logger.warning("Speaking overall report skipped: %s", err)
        return None
