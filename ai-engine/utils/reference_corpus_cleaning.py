"""
Pure cleaning steps for the Task 2 reference corpus: no I/O and no model calls,
so every rule can be unit tested. The build script supplies rows and essay types.
"""
from __future__ import annotations

import hashlib
import re
from collections import Counter, defaultdict
from typing import Iterable, Optional

BAND_LEVELS = (5.0, 6.0, 7.0, 8.0)
MIN_ESSAY_WORDS = 150  # below this the row is not a real attempt at the task
MAX_ESSAY_WORDS = 600  # above this the text is usually pasted content
MIN_REFERENCE_WORDS = 250  # references meet the task minimum, so length is no signal
MAX_REFERENCE_WORDS = 450  # keeps the grading prompt a predictable size
HELD_OUT_PERCENT = 15
PROMPT_SIMILARITY = 0.75

_NOT_TASK2_PROMPT = re.compile(
    r"write a letter|write to|\bdear\b|summari[sz]e the information|you have a full.?time job"
    r"|\b(?:chart|graph|diagram)s? (?:below|shows?|illustrates?)",
    re.I,
)
_TASK1_ESSAY_START = re.compile(
    r"^.{0,120}\bthe (?:bar |line |pie )?(?:chart|graph|table|diagram|map)s? "
    r"(?:shows?|illustrates?|depicts?|gives?|compares?|provides?|presents?)",
    re.I | re.S,
)
_STOPWORDS = frozenset(
    "a an and are as at be by do for from has have in is it its of on or people some that the "
    "their there these they this to was were what which while who why will with you your".split()
)


def parse_band(raw: object) -> Optional[float]:
    """'7.5\\r\\r' becomes 7.5. '<4' and anything off the 0.5 scale give None."""
    try:
        band = float(str(raw).strip())
    except ValueError:
        return None
    return band if 0.0 <= band <= 9.0 and band * 2 == int(band * 2) else None


def normalize_text(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def word_count(text: str) -> int:
    return len(text.split())


def essay_key(essay: str) -> str:
    return normalize_text(essay).lower()


def is_not_task2(prompt: str, essay: str) -> bool:
    """Letters and chart reports filed under Task 2 in the source."""
    return bool(_NOT_TASK2_PROMPT.search(prompt) or _TASK1_ESSAY_START.search(essay.strip()))


def clean_rows(rows: Iterable[dict]) -> tuple[list[dict], Counter]:
    """Validate rows and drop duplicates; returns kept rows and removal counts by reason."""
    removed: Counter = Counter()
    valid: list[dict] = []
    for row in rows:
        band = parse_band(row.get("band"))
        essay = (row.get("essay") or "").strip()
        prompt = normalize_text(row.get("prompt") or "")
        words = word_count(essay)
        if band is None:
            removed["band_not_numeric"] += 1
        elif not prompt or words < MIN_ESSAY_WORDS:
            removed["essay_too_short"] += 1
        elif words > MAX_ESSAY_WORDS:
            removed["essay_too_long"] += 1
        elif is_not_task2(prompt, essay):
            removed["not_task2"] += 1
        else:
            valid.append({"prompt": prompt, "essay": essay, "band": band, "word_count": words})

    by_essay: dict[str, list[dict]] = defaultdict(list)
    for row in valid:
        by_essay[essay_key(row["essay"])].append(row)

    kept: list[dict] = []
    for copies in by_essay.values():
        if len({row["band"] for row in copies}) > 1:
            removed["conflicting_band"] += len(copies)  # the label itself is in doubt
            continue
        if len(copies) > 1:
            removed["duplicate_essay"] += len(copies) - 1
        kept.append(copies[0])
    return kept, removed


def _content_tokens(prompt: str) -> frozenset[str]:
    return frozenset(re.findall(r"[a-z']+", prompt.lower())) - _STOPWORDS


def group_prompts(prompts: Iterable[str]) -> dict[str, str]:
    """Map each prompt to a group id; reworded copies of a question share one group."""
    unique = sorted(set(prompts))
    tokens = [_content_tokens(prompt) for prompt in unique]
    parent = list(range(len(unique)))

    def find(index: int) -> int:
        while parent[index] != index:
            parent[index] = parent[parent[index]]
            index = parent[index]
        return index

    posting: dict[str, list[int]] = defaultdict(list)
    for index, words in enumerate(tokens):
        for word in words:
            posting[word].append(index)

    for index, words in enumerate(tokens):
        shared: Counter = Counter()
        for word in words:
            # Very common words link everything and only add comparisons.
            if len(posting[word]) <= 200:
                shared.update(other for other in posting[word] if other > index)
        for other, overlap in shared.items():
            union = len(words) + len(tokens[other]) - overlap
            if union and overlap / union >= PROMPT_SIMILARITY:
                parent[find(other)] = find(index)
    return {prompt: unique[find(index)] for index, prompt in enumerate(unique)}


def is_held_out(group_id: str) -> bool:
    """Stable across runs and machines, so the split never needs storing."""
    digest = hashlib.sha256(group_id.encode("utf-8")).digest()
    return int.from_bytes(digest[:4], "big") % 100 < HELD_OUT_PERCENT


def essay_opening(essay: str, tokens: int = 25) -> str:
    """Fingerprint for near-copies: the same essay with small edits further down."""
    return " ".join(essay_key(essay).split()[:tokens])


def is_reference_candidate(row: dict) -> bool:
    return (
        row["band"] in BAND_LEVELS
        and MIN_REFERENCE_WORDS <= row["word_count"] <= MAX_REFERENCE_WORDS
    )


def reference_id(essay: str) -> str:
    return "chillies-" + hashlib.sha256(essay_key(essay).encode("utf-8")).hexdigest()[:12]
