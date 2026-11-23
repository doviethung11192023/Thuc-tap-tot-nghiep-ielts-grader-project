"""
Anchors the errors and strengths an LLM quoted onto the transcript of one response (spec 007).

The model only quotes words; code decides where they are. A quote that is not in the transcript is
dropped, never guessed (FR-002), because a mark on words the learner did not say is worse than a
missed error. Offsets are character positions in `transcript`, the words joined by single spaces.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from difflib import SequenceMatcher

MAX_EDITS_PER_RESPONSE = 25
MAX_EDIT_WORDS = 5               # a longer change is a rewrite, which belongs to the upgraded answer
GRA_CATEGORIES = frozenset({"verb_tense", "verb_form", "subject_verb_agreement", "noun_number", "article",
                            "preposition", "conjunction", "pronoun", "word_order", "other"})
LR_CATEGORIES = frozenset({"word_choice", "word_form", "collocation", "other"})
STRENGTH_GROUPS = frozenset({"collocation", "linking", "topic_word", "complex_structure"})
_TOKEN = re.compile(r"[A-Za-z0-9']+")


@dataclass(frozen=True)
class Token:
    norm: str
    start: int
    end: int


def tokenize(text: str) -> list[Token]:
    return [Token(m.group().lower().strip("'"), m.start(), m.end()) for m in _TOKEN.finditer(text or "")]


def _norm_words(text: str) -> list[str]:
    return [t.norm for t in tokenize(text) if t.norm]


def _find(tokens: list[Token], needle: list[str], start_from: int) -> int | None:
    """Index of the first token of `needle`, searching from `start_from`, then from the beginning."""
    if not needle:
        return None
    norms = [t.norm for t in tokens]
    for begin in (start_from, 0):
        for i in range(begin, len(norms) - len(needle) + 1):
            if norms[i:i + len(needle)] == needle:
                return i
    return None


def _kind(original: str, corrected: str) -> str:
    if not original:
        return "missing"
    return "unnecessary" if not corrected else "replace"


def _edit(transcript: str, start: int, end: int, corrected: str, base: dict) -> dict:
    original = transcript[start:end]
    return {**base, "kind": _kind(original, corrected), "original": original, "corrected": corrected,
            "start": start, "end": end}


def _split_by_diff(transcript: str, span: list[Token], corrected: str, base: dict) -> list[dict]:
    """One edit per changed stretch of words, so a quoted sentence becomes the actual changes only.

    Models often quote a whole sentence; comparing words turns it into minimal edits (ERRANT-like)
    and drops quotes whose correction changes nothing but punctuation.
    """
    fixed = [m.group() for m in _TOKEN.finditer(corrected)]
    matcher = SequenceMatcher(a=[t.norm for t in span], b=[w.lower().strip("'") for w in fixed], autojunk=False)
    edits = []
    for op, a1, a2, b1, b2 in matcher.get_opcodes():
        if op == "equal" or max(a2 - a1, b2 - b1) > MAX_EDIT_WORDS:
            continue
        words = " ".join(fixed[b1:b2])
        if op == "insert":       # nothing to underline: the gap sits after the previous word
            point = span[a1 - 1].end if a1 > 0 else span[0].start
            edits.append(_edit(transcript, point, point, words, base))
        else:
            edits.append(_edit(transcript, span[a1].start, span[a2 - 1].end, words, base))
    return edits


def _anchor_edit(transcript: str, tokens: list[Token], raw: dict, criterion: str,
                 cursor: int) -> tuple[list[dict], int] | None:
    original = str(raw.get("original") or "").strip()
    corrected = str(raw.get("corrected") or "").strip()
    if not original and not corrected:
        return None
    allowed = GRA_CATEGORIES if criterion == "GRA" else LR_CATEGORIES
    category = str(raw.get("category") or "other")
    base = {"criterion": criterion, "category": category if category in allowed else "other",
            "explanation": str(raw.get("explanation") or "").strip()}
    if original:
        needle = _norm_words(original)
        index = _find(tokens, needle, cursor)
        if index is None:
            return None
        span = tokens[index:index + len(needle)]
        return _split_by_diff(transcript, span, corrected, base), index + len(needle)
    needle = _norm_words(str(raw.get("before") or ""))     # missing word: right after the `before` words
    index = _find(tokens, needle, cursor)
    if index is None or not _norm_words(corrected):
        return None
    point = tokens[index + len(needle) - 1].end
    return [_edit(transcript, point, point, corrected, base)], index + len(needle)


def _overlaps(a: dict, b: dict) -> bool:
    if a["start"] == a["end"] or b["start"] == b["end"]:     # a gap only clashes when it falls inside a span
        point, span = (a, b) if a["start"] == a["end"] else (b, a)
        return span["start"] < point["start"] < span["end"] or (span["start"] == span["end"] == point["start"])
    return a["start"] < b["end"] and b["start"] < a["end"]


def anchor_edits(transcript: str, raw_by_criterion: dict[str, list[dict]]) -> tuple[list[dict], int, int]:
    """Anchored edits in reading order, plus how many quoted edits were received and how many were lost.

    One quoted edit may split into several; `dropped` counts quoted edits that left no edit at all.
    """
    tokens = tokenize(transcript)
    anchored: list[tuple[int, dict]] = []      # (index of the quoted edit it came from, edit)
    received = 0
    for criterion, raws in raw_by_criterion.items():
        cursor = 0
        for raw in raws:
            source = received
            received += 1
            result = _anchor_edit(transcript, tokens, raw, criterion, cursor) if isinstance(raw, dict) else None
            if result:
                anchored.extend((source, edit) for edit in result[0])
                cursor = result[1]
    kept: list[dict] = []
    sources: set[int] = set()
    for source, edit in sorted(anchored, key=lambda item: (item[1]["start"], item[1]["end"])):
        if len(kept) < MAX_EDITS_PER_RESPONSE and not any(_overlaps(edit, k) for k in kept):
            kept.append(edit)
            sources.add(source)
    return kept, received, received - len(sources)


def anchor_strengths(transcript: str, raws: list[dict], edits: list[dict]) -> tuple[list[dict], int]:
    """Strengths found in the transcript, minus any that touch a marked error (FR-007)."""
    tokens = tokenize(transcript)
    kept: list[dict] = []
    for raw in raws:
        if not isinstance(raw, dict) or raw.get("group") not in STRENGTH_GROUPS:
            continue
        needle = _norm_words(str(raw.get("text") or ""))
        index = _find(tokens, needle, 0)
        if index is None:
            continue
        item = {"group": raw["group"], "start": tokens[index].start, "end": tokens[index + len(needle) - 1].end}
        item["text"] = transcript[item["start"]:item["end"]]
        clash = any(_overlaps(item, e) or (e["start"] == e["end"] and item["start"] <= e["start"] <= item["end"])
                    for e in edits)
        if not clash and all((k["start"], k["end"]) != (item["start"], item["end"]) for k in kept):
            kept.append(item)
    return sorted(kept, key=lambda s: s["start"]), len(raws) - len(kept)


def word_spans(words: list[str]) -> list[tuple[int, int]]:
    """Character span of each word in the transcript built as ' '.join(words)."""
    spans, position = [], 0
    for word in words:
        spans.append((position, position + len(word)))
        position += len(word) + 1
    return spans
