from __future__ import annotations
from collections import defaultdict
import spacy

from schemas.tool_output import ProcessedEssay, LexicalStatsResult, RepeatedWord

# ── Singletons ────────────────────────────────────────────────────────────────

_nlp: spacy.Language | None = None


def _get_nlp() -> spacy.Language:
    global _nlp
    if _nlp is None:
        _nlp = spacy.load("en_core_web_sm")
    return _nlp


# ── Constants ─────────────────────────────────────────────────────────────────

# Function words and other non-lexical tokens to ignore for repetition checking
_IGNORE_POS = frozenset({
    "PUNCT", "SPACE", "SYM", "PRON", "AUX", 
    "DET", "ADP", "CCONJ", "SCONJ", "PART", "NUM"
})

# POS tags that carry semantic meaning (content words)
_CONTENT_POS = frozenset({"NOUN", "VERB", "ADJ", "ADV"})


# ── Public API ────────────────────────────────────────────────────────────────

def compute(processed: ProcessedEssay) -> LexicalStatsResult:
    """
    Compute lexical diversity metrics and find repeated words.

    Parameters
    ----------
    processed : ProcessedEssay
        Output of the pre-processing stage.

    Returns
    -------
    LexicalStatsResult
        Contains TTR, lexical density, average sentence length, and
        a list of repeated words (>= 3 times) sorted by frequency.
    """
    doc = _get_nlp()(processed.essay_raw)
    
    # Filter valid word tokens (exclude punctuation and whitespace)
    valid_tokens = [t for t in doc if t.pos_ not in {"PUNCT", "SPACE", "SYM"}]
    num_tokens = len(valid_tokens)
    
    if num_tokens == 0:
        return LexicalStatsResult(0.0, 0.0, 0.0, [])
        
    # 1. Type-Token Ratio (TTR)
    unique_lemmas = {t.lemma_.lower() for t in valid_tokens}
    ttr = len(unique_lemmas) / num_tokens
    
    # 2. Lexical Density
    content_words = [t for t in valid_tokens if t.pos_ in _CONTENT_POS]
    lex_density = len(content_words) / num_tokens
    
    # 3. Average Sentence Length
    avg_sent_length = 0.0
    if processed.sentences:
        # Use word_count from preprocessor for consistency with IELTS counting
        avg_sent_length = processed.word_count / len(processed.sentences)
        
    # 4. Repeated Words
    word_spans: dict[str, list[tuple[int, int]]] = defaultdict(list)
    for t in doc:
        # Only track content words that are not stop words
        if t.pos_ not in _IGNORE_POS and not t.is_stop:
            lemma = t.lemma_.lower()
            word_spans[lemma].append((t.idx, t.idx + len(t.text)))
            
    repeated = [
        RepeatedWord(word=lemma, count=len(spans), spans=spans)
        for lemma, spans in word_spans.items()
        if len(spans) >= 3
    ]
    
    # Sort by frequency descending, then alphabetically by word
    repeated.sort(key=lambda x: (-x.count, x.word))
    
    return LexicalStatsResult(
        type_token_ratio=ttr,
        lexical_density=lex_density,
        avg_sentence_length=avg_sent_length,
        repeated_words=repeated
    )
