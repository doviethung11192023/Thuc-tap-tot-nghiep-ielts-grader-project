"""Shape of the runtime config the Core API returns (spec 008 contract F)."""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, SecretStr, field_validator



class StepOverride(BaseModel):
    """Admin override of one step; a missing or null field means no override."""
    model_config = ConfigDict(extra="ignore")
    model: str | None = None
    temperature: float | None = None
    max_tokens: int | None = None

    @field_validator("model")
    @classmethod
    def _blank_model_is_none(cls, value: str | None) -> str | None:
        return value.strip() or None if value else None

    def is_empty(self) -> bool:
        return self.model is None and self.temperature is None and self.max_tokens is None


class LlmOverride(BaseModel):
    model_config = ConfigDict(extra="ignore")
    timeout_seconds: float | None = None
    enable_thinking: bool | None = None


class JevOverride(BaseModel):
    model_config = ConfigDict(extra="ignore")
    model: str | None = None
    timeout_seconds: float | None = None


class RuntimeKeys(BaseModel):
    """Decrypted provider keys; null means "use the key in .env". SecretStr keeps them out of repr and logs."""
    model_config = ConfigDict(extra="ignore")
    dashscope: SecretStr | None = Field(default=None, repr=False)
    typesafe: SecretStr | None = Field(default=None, repr=False)

    def value(self, provider: str) -> str | None:
        secret = getattr(self, provider, None)
        text = secret.get_secret_value().strip() if secret else ""
        return text or None


class RuntimeConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    version: str | None = None
    steps: dict[str, StepOverride] = Field(default_factory=dict)
    llm: LlmOverride = Field(default_factory=LlmOverride)
    jev: JevOverride = Field(default_factory=JevOverride)
    keys: RuntimeKeys = Field(default_factory=RuntimeKeys)

    @field_validator("steps")
    @classmethod
    def _only_known_steps(cls, steps: dict[str, StepOverride]) -> dict[str, StepOverride]:
        """Unknown step keys are dropped, so a newer Core never breaks an older engine."""
        from services.runtime_config.ai_step_registry import STEP_KEYS   # lazy: the registry imports services.langfuse
        return {key: value for key, value in steps.items() if key in STEP_KEYS and not value.is_empty()}

    def step(self, step_key: str | None) -> StepOverride | None:
        return self.steps.get(step_key) if step_key else None

    def secret_values(self) -> list[str]:
        return [v for v in (self.keys.value("dashscope"), self.keys.value("typesafe")) if v]


EMPTY_CONFIG = RuntimeConfig()
