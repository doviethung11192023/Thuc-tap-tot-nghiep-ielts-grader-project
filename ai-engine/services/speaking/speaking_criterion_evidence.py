"""
Criterion calls that return more than the band: GRA and LR quote errors and strengths (spec 007),
FC names the answers that do not address their question (BR-23).

Same call, same band validation as every criterion; the extra lists are kept instead of being
discarded, so the criterion that sets the band is also the one that names the evidence.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field

from schemas.llm_output import AgentCriterionOutput
from services.llm.llm_client import strip_markdown_fence
from services.llm.llm_evaluator import call_llm_json, validate_criterion
from services.llm.prompt_builder import CompiledPrompt


@dataclass
class CriterionWithEvidence:
    output: AgentCriterionOutput
    edits: list[dict] = field(default_factory=list)
    strength_spans: list[dict] = field(default_factory=list)
    off_topic_answers: list[int] = field(default_factory=list)     # FC only: answer numbers [Qn]


def _as_list(value: object) -> list[dict]:
    return [item for item in value if isinstance(item, dict)] if isinstance(value, list) else []


def _as_numbers(value: object) -> list[int]:
    if not isinstance(value, list):
        return []
    return sorted({int(item) for item in value if isinstance(item, (int, float)) and not isinstance(item, bool)})


def parse_criterion_with_evidence(raw_text: str) -> CriterionWithEvidence:
    data = json.loads(strip_markdown_fence(raw_text))
    output = validate_criterion(data)     # raises on a bad band, which triggers the usual retry
    return CriterionWithEvidence(output, _as_list(data.get("edits")), _as_list(data.get("strength_spans")),
                                 _as_numbers(data.get("off_topic_answers")))


async def evaluate_criterion_with_evidence(name: str, compiled: CompiledPrompt) -> CriterionWithEvidence:
    return await call_llm_json(name, compiled, parse_criterion_with_evidence, compiled.model)
