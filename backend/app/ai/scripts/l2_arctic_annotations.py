"""
Reads L2-ARCTIC manual annotations (Praat TextGrid) into per-word error labels.

The `phones` tier holds a plain phone for a correct sound, or `CPL,PPL,type` for an error, where
type is s (substitution), d (deletion) or a (addition). A `*` on the perceived phone marks a
deviation from standard American English, which is closer to accent than to error.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

_TIER = re.compile(r'name = "([^"]*)"(.*?)(?=item \[\d+\]:|\Z)', re.S)
_INTERVAL = re.compile(r'xmin = ([\d.]+)\s+xmax = ([\d.]+)\s+text = "([^"]*)"')
_NOT_SPEECH = {"", "sil", "sp", "spn"}


@dataclass(frozen=True)
class Interval:
    start: float
    end: float
    text: str

    @property
    def middle(self) -> float:
        return (self.start + self.end) / 2


@dataclass
class AnnotatedWord:
    word: str
    phones: int = 0
    errors: list[str] = field(default_factory=list)     # one of s, d, a per error
    accent_only: bool = False                           # every error is marked with *

    @property
    def wrong(self) -> bool:
        return bool(self.errors)


def parse_tiers(text: str) -> dict[str, list[Interval]]:
    return {name.lower(): [Interval(float(a), float(b), label.strip()) for a, b, label in _INTERVAL.findall(body)]
            for name, body in _TIER.findall(text)}


def _error_of(label: str) -> tuple[str, bool] | None:
    parts = [part.strip() for part in label.split(",")]
    if len(parts) < 3 or parts[-1] not in ("s", "d", "a"):
        return None
    return parts[-1], "*" in parts[1]


def annotated_words(text: str) -> list[AnnotatedWord]:
    """Words in spoken order. An addition inside a pause belongs to the word just before it."""
    tiers = parse_tiers(text)
    spoken = [interval for interval in tiers.get("words", []) if interval.text.lower() not in _NOT_SPEECH]
    words = [AnnotatedWord(interval.text.lower()) for interval in spoken]
    accent_flags: list[list[bool]] = [[] for _ in words]
    for phone in tiers.get("phones", []):
        if phone.text.lower() in _NOT_SPEECH:
            continue
        index = next((i for i, w in enumerate(spoken) if w.start <= phone.middle < w.end), None)
        if index is None:
            index = max((i for i, w in enumerate(spoken) if w.end <= phone.middle), default=None)
        if index is None:
            continue
        error = _error_of(phone.text)
        words[index].phones += 1
        if error:
            words[index].errors.append(error[0])
            accent_flags[index].append(error[1])
    for word, flags in zip(words, accent_flags):
        word.accent_only = bool(flags) and all(flags)
    return words
