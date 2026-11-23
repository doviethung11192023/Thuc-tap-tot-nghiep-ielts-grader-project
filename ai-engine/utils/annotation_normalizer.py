"""
Inline-annotation post-processing for the synthesis (REWRITE) output.

Guarantees every annotation returned to the backend fits the DB enums
(`annotation_type`, `annotation_category`) and the backend Pydantic schema
(non-empty `title`), locates it in the raw essay, and removes overlaps.
"""
from __future__ import annotations

import re
import uuid

from utils.char_index_resolver import resolve_span_global

VALID_TYPES = ("error", "upgrade", "logic_issue", "strength")
VALID_CATEGORIES = ("TR", "CC", "LR", "GRA")

# error (0) > logic_issue (1) > upgrade (2) > strength (3)
TYPE_PRIORITY = {"error": 0, "logic_issue": 1, "upgrade": 2, "strength": 3}

_TYPE_ALIASES = {
    "grammar": "error", "spelling": "error", "mistake": "error",
    "logic": "logic_issue", "logical_issue": "logic_issue", "coherence": "logic_issue",
    "improvement": "upgrade", "suggestion": "upgrade", "vocabulary": "upgrade",
    "positive": "strength", "good": "strength", "praise": "strength",
}

_CATEGORY_ALIASES = {
    "TA": "TR", "TASK_RESPONSE": "TR", "TASK_ACHIEVEMENT": "TR",
    "COHERENCE": "CC", "COHESION": "CC", "COHERENCE_COHESION": "CC",
    "LEXICAL": "LR", "LEXIS": "LR", "VOCABULARY": "LR", "LEXICAL_RESOURCE": "LR",
    "GRAMMAR": "GRA", "GRAMMATICAL": "GRA", "GRAMMATICAL_RANGE_AND_ACCURACY": "GRA",
}

# Used when the model omits / invents a category.
_DEFAULT_CATEGORY_BY_TYPE = {"error": "GRA", "logic_issue": "CC", "upgrade": "LR", "strength": "TR"}

_DEFAULT_TITLES = {
    "error": "Language error",
    "logic_issue": "Logic issue",
    "upgrade": "Suggested upgrade",
    "strength": "Strength",
}


# An annotation targets a phrase or one sentence. A span this long (or crossing a
# paragraph break) is the model "annotating the whole report" — e.g. an Underlength
# note — and splicing its corrected_text would replace the student's entire essay.
MAX_ANNOTATION_WORDS = 60


def _text(value) -> str:
    return value.strip() if isinstance(value, str) else ""


def normalize_type(raw) -> str:
    key = _text(raw).lower().replace(" ", "_").replace("-", "_")
    if key in VALID_TYPES:
        return key
    return _TYPE_ALIASES.get(key, "upgrade")


def normalize_category(raw, anno_type: str) -> str:
    key = _text(raw).upper().replace(" ", "_").replace("&", "").replace("-", "_")
    if key in VALID_CATEGORIES:
        return key
    return _CATEGORY_ALIASES.get(key, _DEFAULT_CATEGORY_BY_TYPE[anno_type])


def normalize_annotation(raw: dict) -> dict | None:
    """Return a schema-safe copy of one annotation, or None when unusable."""
    if not isinstance(raw, dict):
        return None
    original_text = raw.get("original_text")
    if not isinstance(original_text, str) or not original_text.strip():
        return None
    if "\n\n" in original_text.strip() or len(original_text.split()) > MAX_ANNOTATION_WORDS:
        return None

    anno_type = normalize_type(raw.get("type"))
    corrected_text = _text(raw.get("corrected_text"))
    if corrected_text.startswith("[") and corrected_text.endswith("]"):
        corrected_text = ""  # an editor's note, not replacement text → never spliced into the essay
    return {
        "type": anno_type,
        "category": normalize_category(raw.get("category"), anno_type),
        "title": _text(raw.get("title")) or _DEFAULT_TITLES[anno_type],
        "original_text": original_text,
        "corrected_text": corrected_text,
        "explanation": _text(raw.get("explanation")),
        "recommendation": _text(raw.get("recommendation")),
    }


def snap_to_word_boundaries(essay: str, start: int, end: int) -> tuple[int, int]:
    """Expand a (fuzzy) span so it never cuts a word in half, then trim surrounding spaces."""
    start, end = max(0, start), min(len(essay), end)
    while start > 0 and essay[start - 1].isalnum() and essay[start].isalnum():
        start -= 1
    while end < len(essay) and essay[end - 1].isalnum() and essay[end].isalnum():
        end += 1
    while start < end and essay[start].isspace():
        start += 1
    while end > start and essay[end - 1].isspace():
        end -= 1
    return start, end


def _first_overlap(start: int, end: int, kept: list[dict]) -> dict | None:
    return next((k for k in kept if start < k["position_end"] and k["position_start"] < end), None)


def _merge_into(winner: dict, loser: dict) -> None:
    """Keep the feedback of an overlapping annotation that cannot be highlighted on its own
    (e.g. a GRA error inside a sentence already flagged for TR)."""
    note = f"Also ({loser['category']}) {loser['title']}: {loser['explanation']}".strip()
    winner["explanation"] = f"{winner['explanation']}\n\n{note}".strip()


def locate_and_dedupe(raw_annotations: list, essay_raw: str) -> list[dict]:
    """Normalize, find character spans in the raw essay, and drop overlaps.

    Overlaps are resolved by priority (error > logic_issue > upgrade > strength),
    each annotation being checked against *all* annotations kept so far.
    Annotations whose text cannot be found in the essay are dropped.
    """
    located: list[dict] = []
    for raw in raw_annotations if isinstance(raw_annotations, list) else []:
        anno = normalize_annotation(raw)
        if anno is None:
            continue
        span = resolve_span_global(anno["original_text"], essay_raw)
        if not span or span[1] <= span[0]:
            continue
        start, end = snap_to_word_boundaries(essay_raw, *span)
        if end <= start:
            continue
        anno["id"] = str(uuid.uuid4())
        anno["position_start"], anno["position_end"] = start, end
        # Fuzzy matches may differ slightly from the essay → show the student's real text.
        anno["original_text"] = essay_raw[start:end]
        located.append(anno)

    located.sort(key=lambda a: (TYPE_PRIORITY[a["type"]], a["position_start"]))
    kept: list[dict] = []
    for anno in located:
        winner = _first_overlap(anno["position_start"], anno["position_end"], kept)
        if winner is None:
            kept.append(anno)
        elif anno["type"] != "strength":
            _merge_into(winner, anno)
    kept.sort(key=lambda a: a["position_start"])
    return kept


def apply_corrections(essay_raw: str, annotations: list[dict]) -> str:
    """Splice `corrected_text` of non-strength annotations into the essay (back to front)."""
    revised = essay_raw
    rewrites = [a for a in annotations if a["type"] != "strength" and a.get("corrected_text")]
    for anno in sorted(rewrites, key=lambda a: a["position_start"], reverse=True):
        revised = revised[: anno["position_start"]] + anno["corrected_text"] + revised[anno["position_end"]:]
    return revised


# Integers / decimals / thousands ("1,200", "3.5"); a trailing "%" is not needed for matching.
_NUMBER_RE = re.compile(r"\d+(?:[.,]\d+)*")


_NUMBER_WORDS = {
    w: str(i) for i, w in enumerate(
        "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen "
        "fifteen sixteen seventeen eighteen nineteen twenty".split()
    )
}
_NUMBER_WORD_RE = re.compile(r"\b(" + "|".join(_NUMBER_WORDS) + r")\b", re.IGNORECASE)


def _numbers(text: str) -> set[str]:
    """Digits plus number words up to twenty ("six offices" ≡ "6 offices")."""
    found = {n.replace(",", "") for n in _NUMBER_RE.findall(text or "")}
    found |= {_NUMBER_WORDS[w.lower()] for w in _NUMBER_WORD_RE.findall(text or "")}
    return found


def drop_unsupported_numbers(annotations: list[dict], reference_text: str) -> list[dict]:
    """Task 1 guard against invented data.

    A rewrite may only use numbers (values, percentages, years) that already appear in
    the student's original span or in the chart data extracted by the vision model.
    Otherwise its corrected_text is cleared: the annotation is still shown, but the
    invented figure never reaches the upgraded report.
    """
    allowed_reference = _numbers(reference_text)
    for anno in annotations:
        new_numbers = _numbers(anno.get("corrected_text", "")) - _numbers(anno["original_text"])
        if new_numbers - allowed_reference:
            anno["corrected_text"] = ""
    return annotations
