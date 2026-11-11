"""
GRA and LR calls that also return quoted errors and strengths (spec 007).

Same call, same band validation as every criterion; the extra lists are kept instead of being
discarded, so the criterion that sets the band is also the one that names the errors.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field

from schemas.llm_output import AgentCriterionOutput
from services.llm_client import strip_markdown_fence
from services.llm_evaluator import call_llm_json, validate_criterion
from services.prompt_builder import CompiledPrompt


@dataclass
class CriterionWithEvidence:
    output: AgentCriterionOutput
    edits: list[dict] = field(default_factory=list)
    strength_spans: list[dict] = field(default_factory=list)


def _as_list(value: object) -> list[dict]:
    return [item for item in value if isinstance(item, dict)] if isinstance(value, list) else []


def parse_criterion_with_evidence(raw_text: str) -> CriterionWithEvidence:
    data = json.loads(strip_markdown_fence(raw_text))
    output = validate_criterion(data)     # raises on a bad band, which triggers the usual retry
    return CriterionWithEvidence(output, _as_list(data.get("edits")), _as_list(data.get("strength_spans")))


async def evaluate_criterion_with_evidence(name: str, compiled: CompiledPrompt) -> CriterionWithEvidence:
    return await call_llm_json(name, compiled, parse_criterion_with_evidence, compiled.model)
