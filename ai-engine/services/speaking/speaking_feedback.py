"""
Per-part feedback and the overall report. These explain a result that already exists, so a failure
here costs only the extra commentary: grading must still finish with its four scores.
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
from dataclasses import dataclass

from services.llm_client import get_async_llm_client, llm_extra_body, strip_markdown_fence, trace_options
from services.langfuse.usage_meter import record_usage
from services.prompt_builder import CompiledPrompt, get_prompt_manager

logger = logging.getLogger(__name__)

_MAX_TRIES = 2
_OVERALL_BAND_PHRASE_RE = re.compile(
    r"(\boverall\s+band(?:\s+score)?\s+(?:is|of|:)\s*)(\d(?:\.\d)?)",
    re.IGNORECASE,
)


def sanitize_overall_summary(text: str | None, overall_band: float | None) -> str | None:
    """Đảm bảo văn bản nhận xét tổng quan không mâu thuẫn với overall_band do code tính (ADR-03)."""
    if not text or overall_band is None:
        return text
    target = f"{overall_band:.1f}"
    return _OVERALL_BAND_PHRASE_RE.sub(lambda m: f"{m.group(1)}{target}", text)


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
                model=compiled.model,
                messages=compiled.messages,
                temperature=compiled.temperature,
                max_tokens=compiled.max_tokens,
                **trace_options(compiled),
                response_format={"type": "json_object"},
                extra_body=llm_extra_body(),
            )
            record_usage(response, compiled.model)
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


async def generate_overall(title: str, criteria: dict[str, dict], overall_band: float | None = None) -> dict | None:
    try:
        bands_payload = {name: value["band"] for name, value in criteria.items()}
        if overall_band is not None:
            bands_payload["overall"] = overall_band
        compiled = await asyncio.to_thread(
            get_prompt_manager().get_speaking_overall_prompt, test_title=title,
            bands=json.dumps(bands_payload),
            fc_feedback=json.dumps(criteria["fc"], ensure_ascii=False),
            lr_feedback=json.dumps(criteria["lr"], ensure_ascii=False),
            gra_feedback=json.dumps(criteria["gra"], ensure_ascii=False),
            pr_feedback=json.dumps(criteria["pr"], ensure_ascii=False),
        )
        if overall_band is not None:
            compiled.messages.append({
                "role": "system",
                "content": (
                    f"CRITICAL SCORING RULE: The official rounded IELTS Speaking Overall Band computed by the system is "
                    f"exactly {overall_band:.1f}. Whenever you mention the overall band score in overall_summary, you MUST state {overall_band:.1f}."
                ),
            })
        data = await _json_completion(compiled)
        if overall_band is not None and isinstance(data, dict) and data.get("overall_summary"):
            data["overall_summary"] = sanitize_overall_summary(str(data["overall_summary"]), overall_band)
        return data
    except Exception as err:
        logger.warning("Speaking overall report skipped: %s", err)
        return None
