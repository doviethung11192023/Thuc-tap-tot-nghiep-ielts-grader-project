import json
import os
from pathlib import Path
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

# ── Project Paths ─────────────────────────────────────────────────────────────

ROOT = Path(__file__).resolve().parent.parent

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

    # Default LLM (any OpenAI-compatible endpoint; DashScope/Qwen by default)
    default_llm_model: str = "qwen-flash"
    default_base_url: str = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
    default_llm_temperature: float = 0.0
    default_llm_max_tokens: int = 2_000
    # API key for DEFAULT_BASE_URL. Empty → falls back to QWEN_API_KEY.
    llm_api_key: str = ""
    # Override the model configured on the Langfuse REWRITE prompts (empty → use Langfuse config).
    rewrite_llm_model: str = ""
    # Vision model used to read Writing Task 1 charts/diagrams.
    vision_llm_model: str = "qwen3.7-plus"  # natively multimodal; counts map/diagram elements more reliably than qwen3-vl-plus
    vision_max_tokens: int = 1_500
    # Per-request timeout (seconds) for every LLM call.
    llm_timeout_seconds: float = 180.0
    # DashScope Qwen3.x hybrid models "think" by default (≈2.5× slower and can exhaust
    # max_tokens on the REWRITE pass). Sent as extra_body only to DashScope endpoints.
    llm_enable_thinking: bool = False
    # Writing Task 2 flow: "legacy" (4 criterion agents) or "reference" (one call with band-ladder references).
    writing_task2_pipeline: str = "reference"
    reference_corpus_dir: str = str(ROOT / "data" / "reference_corpus")
    # Override the model in the Langfuse config of writing/task2/grade (empty → use Langfuse config).
    grade_llm_model: str = ""
    # Essay type classifier: "jev" uses TypeSafe when a key is set, else the Qwen prompt; "qwen" skips Jev.
    essay_classifier: str = "jev"
    typesafe_api_key: str = ""
    jev_model: str = "jev-latest"
    jev_timeout_seconds: float = 5.0
    # Max size (bytes) of a Task 1 image downloaded for the vision model.
    max_image_bytes: int = 8 * 1024 * 1024

    # Speaking. Device "auto" uses the GPU when one is available; on a CPU-only VPS use
    # SPEECH_STT_MODEL=small.en and SPEECH_STT_COMPUTE_TYPE=int8.
    speech_device: str = "auto"
    speech_stt_model: str = "medium.en"
    speech_stt_compute_type: str = "auto"
    speech_stt_beam_size: int = 5
    speech_phoneme_model: str = "facebook/wav2vec2-lv-60-espeak-cv-ft"
    # Shared with Core API. Empty disables the check, for local development only.
    ai_engine_secret: str = ""

    # Server
    enable_ngrok: bool = False
    server_reload: bool = False

    @property
    def resolved_llm_api_key(self) -> str:
        return self.llm_api_key or self.qwen_api_key

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
