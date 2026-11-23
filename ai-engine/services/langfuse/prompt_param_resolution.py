"""
How the model, temperature and max_tokens of one prompt are decided, and from where.

Order (spec 008 FR-034): Admin override of the step (source "app") > .env override of the call
(source "env") > Langfuse prompt config ("langfuse") > built-in default ("default"; a value that
came from .env but is not an override, like DEFAULT_LLM_MODEL, is reported as "env").

PromptManager uses this for every compiled prompt, and the effective-config endpoint uses the same
function, so what the Admin page shows is what grading really does.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from services.langfuse.prompt_registry import (
    ANSWER_KEY_PROMPT_NAME,
    CHART_PROMPT_NAME,
    GRADE_PROMPT_NAME,
    REWRITE_PROMPT_NAMES,
    SPEAKING_OVERALL_PROMPT_NAME,
    SPEAKING_PART_PROMPT_NAMES,
)
from services.runtime_config.runtime_config_model import RuntimeConfig

PARAM_NAMES = ("model", "temperature", "max_tokens")

# The Speaking reports are generated with DEFAULT_LLM_MODEL whatever the Langfuse config says (long-standing
# behaviour, kept); only an Admin override changes their model.
_DEFAULT_MODEL_PROMPTS = frozenset({SPEAKING_OVERALL_PROMPT_NAME, *SPEAKING_PART_PROMPT_NAMES.values()})
_VISION_PROMPTS = frozenset({CHART_PROMPT_NAME, ANSWER_KEY_PROMPT_NAME})
_REWRITE_PROMPTS = frozenset(REWRITE_PROMPT_NAMES.values())


@dataclass(frozen=True)
class Param:
    value: Any
    source: str          # app | env | langfuse | default


def _from_settings(settings: Any, field: str) -> Param:
    """A value from Settings: "env" when .env or the environment set it, else the code default."""
    explicit = field in getattr(settings, "model_fields_set", ())
    return Param(getattr(settings, field), "env" if explicit else "default")


def _base_model(name: str, config: dict, settings: Any) -> Param:
    if name in _REWRITE_PROMPTS and getattr(settings, "rewrite_llm_model", ""):
        return Param(settings.rewrite_llm_model, "env")
    if name == GRADE_PROMPT_NAME and getattr(settings, "grade_llm_model", ""):
        return Param(settings.grade_llm_model, "env")
    if name in _VISION_PROMPTS:
        return _from_settings(settings, "vision_llm_model")
    if name not in _DEFAULT_MODEL_PROMPTS and config.get("model"):
        return Param(config["model"], "langfuse")
    return _from_settings(settings, "default_llm_model")


def _base_max_tokens(name: str, config: dict, settings: Any) -> Param:
    if "max_tokens" in config and config["max_tokens"] is not None:
        return Param(int(config["max_tokens"]), "langfuse")
    if name == CHART_PROMPT_NAME:
        fallback = _from_settings(settings, "vision_max_tokens")
        return Param(int(fallback.value), fallback.source)
    return Param(4000 if name in _REWRITE_PROMPTS else 2000, "default")


def resolve_prompt_params(name: str, config: dict | None, settings: Any,
                          runtime: RuntimeConfig | None = None) -> dict[str, Param]:
    """model, temperature and max_tokens of prompt `name`, each with its source."""
    from services.runtime_config.ai_step_registry import step_for_prompt   # lazy: avoids an import cycle

    config = config or {}
    params = {
        "model": _base_model(name, config, settings),
        "temperature": (Param(float(config["temperature"]), "langfuse")
                        if config.get("temperature") is not None else Param(0.0, "default")),
        "max_tokens": _base_max_tokens(name, config, settings),
    }
    override = runtime.step(step_for_prompt(name)) if runtime else None
    if override:
        for field in PARAM_NAMES:
            value = getattr(override, field)
            if value is not None:
                params[field] = Param(value, "app")
    return params
