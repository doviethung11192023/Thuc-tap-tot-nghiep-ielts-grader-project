# """
# D4 — Vocabulary & Collocation Profiler using spacy.

# Pipeline position (runs in parallel with D1, D2, D3, Retrieval):
#     ProcessedEssay
#         └─► check(processed) → VocabProfileResult

# Responsibilities:
# 1. Scan for C1/C2 words by checking lemmas against a CEFR dictionary.
# 2. Find academic collocations by matching essay phrases against an ACL.
# """

# from __future__ import annotations

# import json
# import os
# import spacy
# import nltk
# from nltk.corpus import wordnet as wn
# from spacy.matcher import PhraseMatcher
# from spacy.util import filter_spans

# from schemas.tool_output import (
#     ProcessedEssay,
#     CefrWord,
#     CollocationHit,
#     PolysemousWord,
#     VocabProfileResult,
# )

# # ── Global State ──────────────────────────────────────────────────────────────

# _nlp: spacy.Language | None = None
# _matcher: PhraseMatcher | None = None
# _cefr_dict: dict[str, str] = {}


# def _load_dictionaries():
#     """Load JSON dictionaries from the data directory."""
#     global _cefr_dict
    
#     # Path to data directory
#     data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
#     cefr_path = os.path.join(data_dir, "cefr_words.json")
#     acl_path = os.path.join(data_dir, "academic_collocations.json")
    
#     # Load CEFR dict
#     if os.path.exists(cefr_path):
#         with open(cefr_path, "r", encoding="utf-8") as f:
#             _cefr_dict = json.load(f)
#     else:
#         _cefr_dict = {}

#     # Load ACL
#     collocations = []
#     if os.path.exists(acl_path):
#         with open(acl_path, "r", encoding="utf-8") as f:
#             collocations = json.load(f)
            
#     return collocations


# def _get_nlp() -> tuple[spacy.Language, PhraseMatcher]:
#     """Return the shared spacy Language and PhraseMatcher instances."""
#     global _nlp, _matcher
#     if _nlp is None:
#         _nlp = spacy.load("en_core_web_sm")
        
#         # Load collocations and initialize PhraseMatcher
#         collocations = _load_dictionaries()
#         _matcher = PhraseMatcher(_nlp.vocab, attr="LOWER")
        
#         if collocations:
#             patterns = list(_nlp.tokenizer.pipe(collocations))
#             _matcher.add("ACL", patterns)
            
#         # Ensure NLTK data is available
#         try:
#             wn.synsets('dog')
#         except LookupError:
#             nltk.download('wordnet', quiet=True)
#             nltk.download('omw-1.4', quiet=True)
            
#     return _nlp, _matcher


# # ── Public API ────────────────────────────────────────────────────────────────

# def check(processed: ProcessedEssay) -> VocabProfileResult:
#     """
#     Run vocabulary profiling on the pre-processed essay.

#     Parameters
#     ----------
#     processed : ProcessedEssay
#         Output of the pre-processing stage.

#     Returns
#     -------
#     VocabProfileResult
#         Contains CEFR words and collocations detected in the essay.
#     """
#     nlp, matcher = _get_nlp()
#     doc = nlp(processed.essay_raw)
    
#     cefr_words = []
#     collocation_hits = []
#     polysemous_words = []

#     # 1. CEFR & Polysemous Word Extraction
#     for token in doc:
#         # Ignore punctuation and spaces
#         if token.pos_ in {"PUNCT", "SPACE", "SYM"}:
#             continue
            
#         lemma = token.lemma_.lower()
#         level = None
#         if lemma in _cefr_dict:
#             level = _cefr_dict[lemma]
#             # Keep only B1, B2, C1, C2
#             if level in {"B1", "B2", "C1", "C2"}:
#                 cefr_words.append(
#                     CefrWord(
#                         word=token.text,
#                         level=level,
#                         span=(token.idx, token.idx + len(token.text))
#                     )
#                 )

#         # Polysemous Check using NLTK WordNet
#         # We only care about content words that are somewhat advanced (B2, C1, C2) 
#         # or have multiple definitions with different parts of speech.
#         if token.pos_ in {"NOUN", "VERB", "ADJ", "ADV"} and not token.is_stop:
#             if level in {"B2", "C1", "C2"}:
#                 synsets = wn.synsets(lemma)
#                 if synsets:
#                     pos_types = set(s.pos() for s in synsets)
#                     # If it has >= 5 meanings and functions as at least 2 parts of speech (e.g. noun + verb)
#                     if len(synsets) >= 5 and len(pos_types) >= 2:
#                         polysemous_words.append(
#                             PolysemousWord(
#                                 word=token.text,
#                                 synset_count=len(synsets),
#                                 span=(token.idx, token.idx + len(token.text)),
#                                 sentence=token.sent.text,
#                             )
#                         )

#     # 2. Collocation Extraction
#     matches = matcher(doc)
#     spans = [doc[start:end] for _, start, end in matches]
#     filtered_spans = filter_spans(spans)

#     for span in filtered_spans:
#         collocation_hits.append(
#             CollocationHit(
#                 phrase=span.text,
#                 span=(span.start_char, span.end_char)
#             )
#         )

#     # Deduplicate collocations by phrase
#     unique_collocs = {}
#     for c in collocation_hits:
#         k = c.phrase.lower()
#         if k not in unique_collocs:
#             unique_collocs[k] = c
#     collocation_hits = list(unique_collocs.values())
    
#     # Deduplicate polysemous words
#     unique_poly = {}
#     for p in polysemous_words:
#         k = p.word.lower()
#         if k not in unique_poly:
#             unique_poly[k] = p
#     polysemous_words = list(unique_poly.values())

#     return VocabProfileResult(
#         cefr_words=cefr_words,
#         collocations=collocation_hits,
#         polysemous_words=polysemous_words
#     )
