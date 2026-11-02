"""
LLM Evaluator service — executes the four criterion passes (TA/CC/LR/GRA)
in parallel and validates each JSON output.
"""
from __future__ import annotations

import asyncio
import json
import logging

from settings.config import get_settings
from schemas.llm_output import AgentCriterionOutput, AllAgentOutputs
from services.llm_client import get_async_llm_client, llm_extra_body, strip_markdown_fence
from services.prompt_builder import CriterionPrompts, CompiledPrompt
from services.langfuse.prompt_manager import AgentCriterion
from utils.band_rounding import normalize_band

logger = logging.getLogger(__name__)

_REQUIRED_KEYS = {"band", "summary", "strengths", "issues", "improvements"}


def _parse_and_validate(raw_text: str) -> AgentCriterionOutput:
    """json.loads() + check required keys + basic types; band snapped to [0, 9] / 0.5."""
    data = json.loads(strip_markdown_fence(raw_text))

    if not isinstance(data, dict):
        raise ValueError("JSON must be an object")

    missing = _REQUIRED_KEYS - data.keys()
    if missing:
        raise ValueError(f"Missing keys: {missing}")

    if isinstance(data["band"], bool) or not isinstance(data["band"], (int, float)):
        raise ValueError("band must be a number")

    for key in ("strengths", "issues", "improvements"):
        if not isinstance(data[key], list):
            data[key] = []

    return AgentCriterionOutput(
        band=normalize_band(data["band"]),
        summary=str(data["summary"]),
        strengths=data["strengths"],
        issues=data["issues"],
        improvements=data["improvements"],
    )


async def evaluate_criterion(
    criterion: AgentCriterion,
    compiled_prompt: CompiledPrompt,
    max_retries: int = 2,
) -> AgentCriterionOutput:
    """Call the LLM for one criterion, validate output, retry when JSON is broken."""
    client = get_async_llm_client()
    messages = list(compiled_prompt.messages)

    for attempt in range(max_retries + 1):
        raw_content = ""
        try:
            response = await client.chat.completions.create(
                model=get_settings().default_llm_model,
                messages=messages,
                temperature=compiled_prompt.temperature,
                max_tokens=compiled_prompt.max_tokens,
                response_format={"type": "json_object"},
                extra_body=llm_extra_body(),
            )
            raw_content = response.choices[0].message.content or "{}"
            return _parse_and_validate(raw_content)
        except Exception as e:
            if attempt == max_retries:
                logger.error("Failed to evaluate %s after %d retries: %s", criterion, max_retries, e)
                raise

            logger.warning("Retry %d/%d for %s due to error: %s", attempt + 1, max_retries, criterion, e)
            if raw_content:
                # The model answered but the JSON was invalid → ask it to fix its own output.
                messages.append({"role": "assistant", "content": raw_content})
                messages.append({
                    "role": "user",
                    "content": (
                        f"Your previous output failed JSON validation with error: {e}. "
                        "Please return ONLY a valid JSON object matching the required schema."
                    ),
                })
            else:
                # Transport/API error → back off before retrying the same request.
                await asyncio.sleep(2 ** attempt)

    raise RuntimeError("unreachable")


async def evaluate_all_criteria(prompts: CriterionPrompts) -> AllAgentOutputs:
    """Run all 4 LLM calls in parallel."""
    ta_out, cc_out, lr_out, gra_out = await asyncio.gather(
        evaluate_criterion("ta", prompts.ta),
        evaluate_criterion("cc", prompts.cc),
        evaluate_criterion("lr", prompts.lr),
        evaluate_criterion("gra", prompts.gra),
    )
    return AllAgentOutputs(ta=ta_out, cc=cc_out, lr=lr_out, gra=gra_out)
