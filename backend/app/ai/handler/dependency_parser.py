"""
D2 — Dependency Parser using spacy.

Pipeline position (runs in parallel with D1, D3, D4, Retrieval):
    ProcessedEssay
        └─► check(processed) → DependencyParseResult

Responsibilities:
1. Sentence Classification (simple, compound, complex, compound-complex) for GRA.
2. Linking Device Detection (using PhraseMatcher) for CC.
"""

from __future__ import annotations

import spacy
from spacy.matcher import PhraseMatcher
from spacy.util import filter_spans

from settings.config import IELTS_LINKING_WORDS
from schemas.tool_output import (
    ProcessedEssay,
    ParsedSentence,
    LinkingDevice,
    DependencyParseResult,
)

# ── Singletons ────────────────────────────────────────────────────────────────

_nlp: spacy.Language | None = None
_matcher: PhraseMatcher | None = None


def _get_nlp() -> tuple[spacy.Language, PhraseMatcher]:
    """Return the shared spacy Language and PhraseMatcher instances."""
    global _nlp, _matcher
    if _nlp is None:
        _nlp = spacy.load("en_core_web_sm")
        _matcher = PhraseMatcher(_nlp.vocab, attr="LOWER")
        for category, phrases in IELTS_LINKING_WORDS.items():
            patterns = list(_nlp.tokenizer.pipe(phrases))
            _matcher.add(category, patterns)
    return _nlp, _matcher


# ── Sentence Classification ───────────────────────────────────────────────────

def _classify_sentence(doc: spacy.tokens.Doc) -> str:
    """Classify sentence complexity based on dependency tags."""
    deps = [t.dep_ for t in doc]
    has_coord = "cc" in deps
    has_sub = any(d in deps for d in ["mark", "advcl", "relcl", "csubj", "ccomp"])

    if has_coord and has_sub:
        return "compound-complex"
    if has_sub:
        return "complex"
    if has_coord:
        return "compound"
    return "simple"


# ── Public API ────────────────────────────────────────────────────────────────

def check(processed: ProcessedEssay) -> DependencyParseResult:
    """
    Run dependency parsing on the pre-processed essay.

    Iterates through ``processed.sentences`` to classify each sentence and
    extract linking devices. Character offsets for linking devices are adjusted
    to match ``processed.essay_raw``.

    Parameters
    ----------
    processed : ProcessedEssay
        Output of the pre-processing stage.

    Returns
    -------
    DependencyParseResult
        Contains sentence classifications and detected linking devices.
    """
    nlp, matcher = _get_nlp()
    parsed_sents: list[ParsedSentence] = []
    linking_devices: list[LinkingDevice] = []

    for s in processed.sentences:
        doc = nlp(s.text)

        # 1. Classify complexity
        stype = _classify_sentence(doc)
        parsed_sents.append(
            ParsedSentence(index=s.index, text=s.text, sentence_type=stype)
        )

        # 2. Extract linking words
        matches = matcher(doc)
        spans = [doc[start:end] for _, start, end in matches]
        filtered_spans = filter_spans(spans)

        for span in filtered_spans:
            # Look up the category using the match ID
            cat = nlp.vocab.strings[matcher(span)[0][0]]
            
            # Adjust character offsets to map back to essay_raw
            start_offset = span.start_char + s.char_start
            end_offset = span.end_char + s.char_start

            linking_devices.append(
                LinkingDevice(
                    text=span.text,
                    category=cat,
                    span=(start_offset, end_offset),
                )
            )

    # Deduplicate linking devices by text (keep first occurrence span)
    unique_lds = {}
    for ld in linking_devices:
        k = ld.text.lower()
        if k not in unique_lds:
            unique_lds[k] = ld
    linking_devices = list(unique_lds.values())

    return DependencyParseResult(
        sentences=parsed_sents,
        linking_devices=linking_devices,
    )
