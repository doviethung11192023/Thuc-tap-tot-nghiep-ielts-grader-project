"""
Band ceilings when the test is too short to show the band (BR-25).

An examiner expects the Part 2 long turn to run 1–2 minutes; stopping well short of that is a
fluency problem, not just a short answer. And a high LR or GRA band needs enough speech to show
range: a few fluent sentences cannot prove band 7 vocabulary or grammar. The LLM tends to grade
the quality of what it reads and ignore how little there is, so code sets these ceilings.

A Part 2 that was skipped or silent is left to the coverage ceiling (BR-23), never counted twice.
PROVISIONAL thresholds, set 2026-11-13.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass

from services.speaking.answer_analysis import AnswerAnalysis

# (Part 2 speech shorter than this many seconds, highest FC band), strictest first.
_PART2_CEILINGS = ((30.0, 4.0), (60.0, 5.0))
_MIN_WORDS_FOR_RANGE = 250
_THIN_SAMPLE_BAND = 5.0


@dataclass(frozen=True)
class LengthLimits:
    part2_seconds: float | None     # None: Part 2 was not answered
    word_count: int
    fc_max: float | None
    language_max: float | None      # LR and GRA

    def as_dict(self) -> dict:
        return {**asdict(self), "note": self.note()}

    def note(self) -> str | None:
        notes = []
        if self.fc_max is not None:
            notes.append(f"Part 2 bạn chỉ nói {round(self.part2_seconds)} giây (thi thật cần 1–2 phút) "
                         f"nên FC tối đa {self.fc_max:.1f}.")
        if self.language_max is not None:
            notes.append(f"Cả bài chỉ có {self.word_count} từ, chưa đủ để thể hiện vốn từ và ngữ pháp "
                         f"nên LR và GRA tối đa {self.language_max:.1f}.")
        return " ".join(notes) or None


def measure_length(spoken: list[AnswerAnalysis], word_count: int) -> LengthLimits:
    part2 = [a for a in spoken if a.part == 2]
    # The turn as an examiner hears it: first word to last, pauses inside included. Not the clip
    # length: speaking 20 s and then leaving the mic on until the timer ends is still a 20 s turn.
    seconds = sum(a.quality.speech_span_seconds for a in part2) if part2 else None
    fc_max = next((band for limit, band in _PART2_CEILINGS if seconds < limit), None) \
        if seconds is not None else None
    language_max = _THIN_SAMPLE_BAND if word_count < _MIN_WORDS_FOR_RANGE else None
    return LengthLimits(None if seconds is None else round(seconds, 1), word_count, fc_max, language_max)
