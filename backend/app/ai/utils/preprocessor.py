"""
Pre-processing stage: paragraph split, sentence split, word count.

Pipeline position:
    EssayInput
        └─► preprocess(input) → ProcessedEssay
                └─► [D1 Grammar, D2 DepParse, D3 Lexical, D4 Colloc, Retrieval]  (parallel)

Dependencies
------------
- ``nltk`` (already installed) — PunktSentenceTokenizer for sentence splitting.
  Requires one-time data download: ``nltk.download('punkt_tab')``.
- ``re`` (stdlib) — paragraph splitting and word count.
"""

from __future__ import annotations

import re
import nltk
from nltk.tokenize import PunktSentenceTokenizer
from nltk.tokenize.punkt import PunktParameters

from schemas.input import EssayInput
from schemas.tool_output import Sentence, Paragraph, ProcessedEssay


# ── Sentence tokenizer (singleton) ───────────────────────────────────────────
# PunktSentenceTokenizer with IELTS-specific abbreviations so that
# "Mr.", "Dr.", "e.g.", "i.e." etc. do not trigger false sentence splits.
# punkt_tab data is downloaded once and cached in ~/nltk_data.
nltk.download("punkt_tab", quiet=True)

_PUNKT_PARAMS = PunktParameters()
_PUNKT_PARAMS.abbrev_types = {
    "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "vs",
    "etc", "e.g", "i.e", "no", "vol", "dept", "fig",
    "govt", "pp", "st", "avg", "u.s.a", "u.k", "u.n",
    "jan", "feb", "mar", "apr", "jun", "jul", "aug",
    "sep", "oct", "nov", "dec",
}
_TOKENIZER = PunktSentenceTokenizer(_PUNKT_PARAMS)

# ── Word count pattern ────────────────────────────────────────────────────────
# Matches alphabetic words including hyphenated (self-study) and contractions
# (it's). Excludes digits — matches IELTS examiner word-count convention.
_WORD_RE = re.compile(r"[a-zA-Z]+(?:['\-][a-zA-Z]+)*")


# ── Internal helpers ──────────────────────────────────────────────────────────

def _para_spans(essay_raw: str) -> list[tuple[int, int]]:
    """Return (char_start, char_end) for each non-empty paragraph."""
    spans, cursor = [], 0
    for chunk in re.split(r"\n\s*\n", essay_raw):
        stripped = chunk.strip()
        if stripped:
            start = essay_raw.index(stripped, cursor)
            end = start + len(stripped)
            spans.append((start, end))
            cursor = end
    return spans


def _build_sentences(essay_raw: str, para_spans: list[tuple[int, int]]) -> list[Sentence]:
    """
    Tokenize each paragraph into sentences, compute char offsets into essay_raw.
    Processing paragraph-by-paragraph prevents the cursor from crossing
    paragraph boundaries when locating identical sentences.
    """
    sentences, global_idx = [], 0
    for p_start, p_end in para_spans:
        cursor = p_start
        for text in _TOKENIZER.tokenize(essay_raw[p_start:p_end]):
            text = text.strip()
            start = essay_raw.index(text, cursor)
            sentences.append(Sentence(global_idx, text, start, start + len(text)))
            cursor = start + len(text)
            global_idx += 1
    return sentences


def _build_paragraphs(
    essay_raw: str,
    para_spans: list[tuple[int, int]],
    sentences: list[Sentence],
) -> list[Paragraph]:
    """Assign sentences to their containing paragraph by offset range."""
    return [
        Paragraph(
            index=idx,
            text=essay_raw[s:e].strip(),
            char_start=s,
            char_end=e,
            sentence_indices=[
                sent.index for sent in sentences if s <= sent.char_start < e
            ],
        )
        for idx, (s, e) in enumerate(para_spans)
    ]


# ── Public API ────────────────────────────────────────────────────────────────

def preprocess(essay_input: EssayInput) -> ProcessedEssay:
    """
    Segment an essay into sentences and paragraphs, compute char offsets and
    word count.

    Returns
    -------
    ProcessedEssay
        Ready for the parallel tool passes (D1–D4) and retrieval.
    """
    raw   = essay_input.essay
    spans = _para_spans(raw)
    sents = _build_sentences(raw, spans)
    paras = _build_paragraphs(raw, spans, sents)

    return ProcessedEssay(
        title=essay_input.title,
        essay_raw=raw,
        sentences=sents,
        paragraphs=paras,
        word_count=len(_WORD_RE.findall(raw)),
        target_band=essay_input.target_band,
    )

def test_preprocess(title:str, essay:str, target_band:float) -> ProcessedEssay:
    """
    Segment an essay into sentences and paragraphs, compute char offsets and
    word count.

    Returns
    -------
    ProcessedEssay
        Ready for the parallel tool passes (D1–D4) and retrieval.
    """
    raw   = essay
    spans = _para_spans(raw)
    sents = _build_sentences(raw, spans)
    paras = _build_paragraphs(raw, spans, sents)

    return ProcessedEssay(
        title=title,
        essay_raw=raw,
        sentences=sents,
        paragraphs=paras,
        word_count=len(_WORD_RE.findall(raw)),
        target_band=target_band,
    )