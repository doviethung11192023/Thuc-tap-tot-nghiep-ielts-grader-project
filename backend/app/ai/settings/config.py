import json
import os
from pathlib import Path
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

# ── Project Paths ─────────────────────────────────────────────────────────────

ROOT = Path(__file__).resolve().parent.parent

DATA_DIR = ROOT / "data"
TITLES_DB_PATH = DATA_DIR / "titles_db.json"
CRITERIA_PROMPT_DIR = ROOT / "prompt" / "criteria"

# ── Application Settings ──────────────────────────────────────────────────────
class Settings(BaseSettings):
    """Application settings loaded from environment variables or .env."""

    # Langfuse
    langfuse_public_key: str = ""
    langfuse_secret_key: str = ""
    langfuse_base_url: str = "https://cloud.langfuse.com"

    # langfuse_prompt_label: str = "production"
    langfuse_cache_ttl_seconds: int = 60

    # LLM providers
    # openai_api_key: str = ""
    gemini_api_key: str = ""
    qwen_api_key: str = ""
    # deepseek_api_key: str = ""
    groq_api_key: str = ""

    # Default LLM
    default_llm_model: str = "qwen-flash"
    default_base_url: str = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
    default_llm_temperature: float = 0.0
    default_llm_max_tokens: int = 2_000

    model_config = SettingsConfigDict(
        env_file=ROOT / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

@lru_cache
def get_settings() -> Settings:
    return Settings()

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

# ── IELTS Linking Words (For D2 Dependency Parser) ────────────────────────────
IELTS_LINKING_WORDS: dict[str, list[str]] = {
    "Addition": ["and", "also", "furthermore", "moreover", "in addition", "additionally", "besides"],
    "Contrast": ["but", "however", "although", "even though", "on the other hand", "nevertheless", "yet", "in contrast", "while", "whereas"],
    "Result": ["so", "therefore", "thus", "as a result", "consequently", "hence", "for this reason"],
    "Example": ["for example", "for instance", "such as", "to illustrate", "namely"],
    "Conclusion": ["in conclusion", "to sum up", "overall", "all in all", "to conclude", "in summary"]
}
