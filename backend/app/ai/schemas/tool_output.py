"""
Intermediate data models produced by the pre-processing stage.

These types are the single source of truth for character offsets used by
every downstream tool (Grammar checker, Dependency parser, Lexical stats,
Collocation lookup).  All span tuples are (char_start, char_end) into the
original ``essay_raw`` string — half-open interval, i.e. ``essay_raw[start:end]``.
"""

from __future__ import annotations
from dataclasses import dataclass, field

from schemas.input import EssayInput  # noqa: F401 — re-exported for pipeline use


# ── Sentence ──────────────────────────────────────────────────────────────────

@dataclass
class Sentence:
    """
    One sentence as detected by the spacy sentence segmenter.

    Attributes
    ----------
    index      : Zero-based position of this sentence in the essay.
    text       : Sentence text (stripped).
    char_start : Start offset in ``essay_raw`` (inclusive).
    char_end   : End offset in ``essay_raw`` (exclusive).
    """
    index: int
    text: str
    char_start: int
    char_end: int


# ── Paragraph ─────────────────────────────────────────────────────────────────

@dataclass
class Paragraph:
    """
    One paragraph, defined by ``\\n\\n`` splits in the original essay.

    Attributes
    ----------
    index            : Zero-based paragraph position.
    text             : Paragraph text (stripped).
    char_start       : Start offset in ``essay_raw``.
    char_end         : End offset in ``essay_raw``.
    sentence_indices : Ordered list of ``Sentence.index`` values that belong
                       to this paragraph.
    """
    index: int
    text: str
    char_start: int
    char_end: int
    sentence_indices: list[int] = field(default_factory=list)


# ── ProcessedEssay ────────────────────────────────────────────────────────────

@dataclass
class ProcessedEssay:
    """
    Output of the pre-processing stage.

    Carries the segmented essay plus the cached spacy ``Doc`` object so that
    downstream handlers (D2 dependency parser, D3 lexical stats, D4 collocation
    lookup) can reuse the already-parsed doc without re-running NLP.

    Attributes
    ----------
    title       : Original IELTS prompt title.
    essay_raw   : Original essay string (unmodified — offsets are into this).
    sentences   : Ordered list of ``Sentence`` objects.
    paragraphs  : Ordered list of ``Paragraph`` objects.
    word_count  : Number of word tokens (punctuation-only tokens excluded).
    meta        : ``EssayMeta`` — carries ``target_band``.
    spacy_doc   : The ``spacy.tokens.Doc`` produced by ``nlp(essay_raw)``.
                  Typed as ``Any`` to avoid a hard import of spacy here.
    """
    title: str
    essay_raw: str
    sentences: list[Sentence]
    paragraphs: list[Paragraph]
    word_count: int
    target_band: float | None = field(default=None)


# ── GrammarFinding ───────────────────────────────────────────────────────────────────

@dataclass
class GrammarFinding:
    """
    One grammar or spelling issue detected by LanguageTool (D1).

    All span offsets reference ``ProcessedEssay.essay_raw``.

    Attributes
    ----------
    span        : (char_start, char_end) — half-open interval into essay_raw.
    error_type  : ``"GRAMMAR"`` | ``"SPELLING"`` | ``"STYLE"``.
                  Phase 5 uses this to route findings to the correct criterion
                  prompt: GRAMMAR → GRA, SPELLING → LR, STYLE → discarded.
    rule_id     : LanguageTool rule identifier (e.g. ``"MORFOLOGIK_RULE_EN_US"``
                  for spelling, ``"THIS_NNS"`` for subject–verb agreement).
    message     : Human-readable explanation of the issue.
    suggestions : Up to 3 suggested replacements (may be empty).
    context     : ~40-char excerpt around the error, provided by LanguageTool.
    sentence    : Full sentence containing the error.
    """
    span: tuple[int, int]
    error_type: str          # "GRAMMAR" | "SPELLING" | "STYLE"
    rule_id: str
    message: str
    suggestions: list[str]
    context: str
    sentence: str


# ── D2: Dependency Parser ────────────────────────────────────────────────────────

@dataclass
class ParsedSentence:
    """
    Sentence complexity classification for GRA criterion.
    """
    index: int               # Matches ProcessedEssay.sentences[i].index
    text: str
    sentence_type: str       # "simple", "compound", "complex", "compound-complex"


@dataclass
class LinkingDevice:
    """
    IELTS transition word/phrase detected in the essay for CC criterion.
    """
    text: str
    category: str            # "Addition", "Contrast", "Result", "Example", "Conclusion"
    span: tuple[int, int]    # Char offsets relative to essay_raw


@dataclass
class DependencyParseResult:
    sentences: list[ParsedSentence]
    linking_devices: list[LinkingDevice]


# ── D3: Lexical Stats Engine ───────────────────────────────────────────────────

@dataclass
class RepeatedWord:
    """
    A content word that is repeated multiple times in the essay.
    """
    word: str
    count: int
    spans: list[tuple[int, int]]


@dataclass
class LexicalStatsResult:
    """
    Lexical diversity and repetition metrics for LR criterion.
    """
    type_token_ratio: float
    lexical_density: float
    avg_sentence_length: float
    repeated_words: list[RepeatedWord]


# ── D4: Vocabulary Profiler ───────────────────────────────────────────────────

@dataclass
class CefrWord:
    word: str
    level: str               # "B1", "B2", "C1", "C2"
    span: tuple[int, int]


@dataclass
class CollocationHit:
    phrase: str
    span: tuple[int, int]


@dataclass
class PolysemousWord:
    word: str
    synset_count: int
    span: tuple[int, int]


@dataclass
class VocabProfileResult:
    """
    CEFR vocabulary distribution and collocation tracking for LR.
    """
    cefr_words: list[CefrWord]
    collocations: list[CollocationHit]
    polysemous_words: list[PolysemousWord]

