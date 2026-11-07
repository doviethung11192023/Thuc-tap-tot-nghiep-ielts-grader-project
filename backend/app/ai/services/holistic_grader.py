"""Grade all four Task 2 criteria in one LLM call."""
from __future__ import annotations

import json

from schemas.llm_output import AllAgentOutputs
from services.langfuse.prompt_manager import CompiledPrompt
from services.llm_client import llm_extra_body, strip_markdown_fence
from services.llm_evaluator import call_llm_json, validate_criterion


def parse_all_criteria(raw_text: str) -> AllAgentOutputs:
    """A missing or malformed criterion raises, which sends the output back for a retry."""
    data = json.loads(strip_markdown_fence(raw_text))
    if not isinstance(data, dict):
        raise ValueError("JSON must be an object")
    missing = {"ta", "cc", "lr", "gra"} - data.keys()
    if missing:
        raise ValueError(f"Missing criteria: {sorted(missing)}")
    return AllAgentOutputs(
        ta=validate_criterion(data["ta"]),
        cc=validate_criterion(data["cc"]),
        lr=validate_criterion(data["lr"]),
        gra=validate_criterion(data["gra"]),
    )


async def grade_all_criteria(compiled: CompiledPrompt) -> AllAgentOutputs:
    """Thinking is set per prompt on Langfuse; DashScope rejects JSON mode while thinking."""
    thinking = bool((compiled.langfuse_prompt.config or {}).get("enable_thinking"))
    extra_body = {**llm_extra_body(), "enable_thinking": True} if thinking else None
    return await call_llm_json(
        "task2 grade",
        compiled,
        parse_all_criteria,
        compiled.model,
        extra_body=extra_body,
        json_mode=not thinking,
    )
