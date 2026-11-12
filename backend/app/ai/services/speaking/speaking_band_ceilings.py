"""
Applies every code-owned ceiling to the four criterion bands, after the LLM and before the reports.

The LLM grades the quality of what it reads; code knows what it cannot see: questions left
unanswered or off-topic (BR-23), audio that does not support the transcript (BR-24), and a test too
short to show the band (BR-25). The lowest applicable ceiling wins.
"""
from __future__ import annotations

from dataclasses import dataclass

from schemas.llm_output import AgentCriterionOutput
from services.speaking.answer_analysis import AnswerAnalysis, combine_quality
from services.speaking.phoneme_comparison import ComparisonSummary
from services.speaking.speaking_coverage_cap import Coverage, capped, measure_coverage
from services.speaking.speaking_intelligibility_cap import Intelligibility, measure_intelligibility
from services.speaking.speaking_length_cap import LengthLimits, measure_length


@dataclass(frozen=True)
class Ceilings:
    coverage: Coverage
    intelligibility: Intelligibility
    length: LengthLimits


def apply_ceilings(bands: dict[str, AgentCriterionOutput], spoken: list[AnswerAnalysis], question_count: int,
                   off_topic: int, comparison: ComparisonSummary, word_count: int) -> Ceilings:
    """`bands` maps fc, lr, gra, pr to their outputs, changed in place."""
    ceilings = Ceilings(measure_coverage(len(spoken) - off_topic, question_count, off_topic),
                        measure_intelligibility(comparison, combine_quality(spoken)),
                        measure_length(spoken, word_count))
    length_max = {"fc": ceilings.length.fc_max, "lr": ceilings.length.language_max,
                  "gra": ceilings.length.language_max, "pr": None}
    for name, output in bands.items():
        output.band = capped(output.band, ceilings.coverage)
        for ceiling in (ceilings.intelligibility.max_band, length_max[name]):
            if ceiling is not None:
                output.band = min(output.band, ceiling)
    return ceilings
