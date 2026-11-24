"""
Band ceiling for a Speaking test the learner only partly answered (BR-23).

The LLM judges only what was said, so one fluent answer out of seven would otherwise score like a
full test. A rater cannot credit range or sustained speech that was never produced, so code caps
every criterion by the share of questions that got a spoken answer on the question asked: FC names
the off-topic answers, which count as unanswered. Code owns this ceiling, the same way it owns band P.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass

# (minimum share of questions answered, highest band allowed), highest share first.
_CEILINGS = ((0.8, None), (0.5, 6.0), (0.25, 5.0), (0.0, 4.0))


@dataclass(frozen=True)
class UnansweredQuestion:
    """A question of the test with no confirmed recording; the AI engine never sees its audio."""
    part: int
    question: str


@dataclass(frozen=True)
class Coverage:
    answered: int
    total: int
    max_band: float | None      # None: answered enough, no ceiling
    off_topic: int = 0          # spoken answers that did not address their question

    def as_dict(self) -> dict:
        return {**asdict(self), "note": self.note()}

    def note(self) -> str | None:
        if self.max_band is None:
            return None
        off_topic = f" ({self.off_topic} câu lạc đề không được tính)" if self.off_topic else ""
        return (f"Bạn trả lời đúng câu hỏi {self.answered}/{self.total} câu{off_topic} nên điểm mỗi tiêu chí "
                f"tối đa {self.max_band:.1f}.")


def measure_coverage(answered: int, total: int, off_topic: int = 0) -> Coverage:
    """`answered` counts spoken, on-topic answers only: silence and off-topic answers are not answers."""
    total = max(total, answered)
    share = answered / total if total else 0.0
    ceiling = next(limit for floor, limit in _CEILINGS if share >= floor)
    return Coverage(answered, total, ceiling, off_topic)


def capped(band: float, coverage: Coverage) -> float:
    return band if coverage.max_band is None else min(band, coverage.max_band)
