"""
Output schemas for each LLM criterion pass.
"""

from __future__ import annotations
from dataclasses import dataclass, field, asdict


@dataclass
class AgentCriterionOutput:
    """
    Structured output expected from one LLM criterion pass (TA / CC / LR / GRA).
    """
    band: float
    summary: str
    strengths: list[dict] = field(default_factory=list)
    issues: list[dict] = field(default_factory=list)
    improvements: list[dict] = field(default_factory=list)


@dataclass
class AllAgentOutputs:
    """Merged output of all four criterion passes."""
    ta: AgentCriterionOutput
    cc: AgentCriterionOutput
    lr: AgentCriterionOutput
    gra: AgentCriterionOutput

    @property
    def overall_band(self) -> float:
        """
        Average of four criteria, rounded to nearest 0.5
        (per IELTS half-band rounding rule).
        """
        import math
        avg = (self.ta.band + self.cc.band + self.lr.band + self.gra.band) / 4
        # IELTS rule: x.25 -> x.5, x.75 -> x+1
        return math.floor(avg * 2 + 0.5) / 2

    def model_dump(self):
        data = asdict(self)
        data["overall_band"] = self.overall_band
        return data

