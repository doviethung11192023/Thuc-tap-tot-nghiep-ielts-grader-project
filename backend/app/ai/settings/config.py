"""
Central configuration for the IELTS Writing Tutor pipeline.
All paths are resolved relative to this file's parent directory (project root).
"""

from pathlib import Path

# ── Project Root ──────────────────────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent

# ── Data Directories ─────────────────────────────────────────────────────────
DATA_DIR              = ROOT / "data"
COLLOCATION_DB_PATH   = DATA_DIR / "collocation_db" / "ielts_collocations.json"
LINKING_DEVICES_PATH  = DATA_DIR / "linking_devices.json"
TOPIC_TAXONOMY_PATH   = DATA_DIR / "topic_taxonomy.json"
SAMPLE_ESSAYS_DIR     = DATA_DIR / "sample_essays"
VOCAB_LISTS_DIR       = DATA_DIR / "vocab_lists"

# ── Prompt / Rubric ───────────────────────────────────────────────────────────
PROMPT_DIR            = ROOT / "prompt"
BAND_DESCRIPTORS_PATH = PROMPT_DIR / "ielts_writing_band_description.md"
CRITERIA_PROMPT_DIR   = PROMPT_DIR / "criteria"   # ta.md / cc.md / lr.md / gra.md

# ── Retrieval ─────────────────────────────────────────────────────────────────
MIN_TOPIC_CONFIDENCE  = 0.25   # keyword-overlap score below this → fallback lookup

# ── Grammar Checker (D1) ──────────────────────────────────────────────────────
# LanguageTool rule IDs to suppress — formatting/style rules that generate
# false positives in IELTS academic writing and must not be fed to the LLM.
DISABLED_GRAMMAR_RULES: frozenset[str] = frozenset({
    "WHITESPACE_RULE",
    "COMMA_PARENTHESIS_WHITESPACE",
    "EN_QUOTES",
    "DASH_RULE",
    "WORD_CONTAINS_UNDERSCORE",
    "UPPERCASE_SENTENCE_START",
    "DOUBLE_PUNCTUATION",
    "ARROWS",
    "UNLIKELY_OPENING_PUNCTUATION",
})

# ── Pipeline Defaults ─────────────────────────────────────────────────────────
DEFAULT_TARGET_BAND   = None   # resolved post-scoring as current_band + 0.5

# ── Dependency Parser (D2) ────────────────────────────────────────────────────
IELTS_LINKING_WORDS: dict[str, list[str]] = {
    "Addition": ["furthermore", "moreover", "in addition", "additionally", "also", "and", "not only", "but also"],
    "Contrast": ["however", "on the other hand", "in contrast", "nevertheless", "although", "even though", "despite", "in spite of", "but", "while", "whereas"],
    "Result": ["therefore", "consequently", "as a result", "thus", "hence", "so"],
    "Example": ["for example", "for instance", "such as", "namely", "to illustrate"],
    "Conclusion": ["in conclusion", "to conclude", "to sum up", "all in all", "overall"]
}
