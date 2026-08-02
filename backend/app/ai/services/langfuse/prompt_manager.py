from dataclasses import dataclass
from typing import Any, Literal, Dict

from settings.config import get_settings
from .client import get_langfuse_client


AgentCriterion = Literal["ta", "cc", "lr", "gra"]


PROMPT_NAMES: dict[AgentCriterion, str] = {
    "ta": "TA/System Prompt",
    "cc": "CC/ System prompt",
    "lr": "LR/ System prompt",
    "gra": "GRA/ System prompt",
}

SHARE_VARIABLES = {"title": str, "essay": str, "word_count": int}

CRITERION_VARIABLES = {
    "ta": {
        **SHARE_VARIABLES,
        "task_type_knowledge": str
        },
    "cc": {
        **SHARE_VARIABLES,
    },
    "lr": {
        **SHARE_VARIABLES,
        "lexical_stats": Dict
    },
    "gra": {
        **SHARE_VARIABLES,
        "grammar": Dict
    }
}


@dataclass(frozen=True)
class CompiledPrompt:
    messages: list[dict[str, str]]
    model: str
    temperature: float
    max_tokens: int
    langfuse_prompt: Any


class PromptManager:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.langfuse = get_langfuse_client()

    def get_agent_prompt(
        self,
        criterion: AgentCriterion,
        *,
        title: str,
        essay: str,
        **variables: Any,
    ) -> CompiledPrompt:
        prompt_name = PROMPT_NAMES[criterion]

        prompt = self.langfuse.get_prompt(
            name=prompt_name,
            type="chat",
            label="production",
            cache_ttl_seconds=self.settings.langfuse_cache_ttl_seconds,
        )

        messages = prompt.compile(
            title=title,
            essay=essay,
            **variables,
        )

        config = prompt.config or {}

        return CompiledPrompt(
            messages=messages,
            model=config.get(
                "model",
                self.settings.default_llm_model,
            ),
            temperature=float(config.get("temperature", 0.0)),
            max_tokens=int(config.get("max_tokens", 2000)),
            langfuse_prompt=prompt,
        )

    def get_rewrite_prompt(
        self,
        title: str,
        essay: str,
        ta_feedback: str,
        cc_feedback: str,
        lr_feedback: str,
        gra_feedback: str,
    ) -> CompiledPrompt:
        prompt = self.langfuse.get_prompt(
            name="REWRITE/ System prompt",
            type="chat",
            label="production",
            cache_ttl_seconds=self.settings.langfuse_cache_ttl_seconds,
        )

        messages = prompt.compile(
            title=title,
            essay=essay,
            ta_feedback=ta_feedback,
            cc_feedback=cc_feedback,
            lr_feedback=lr_feedback,
            gra_feedback=gra_feedback,
        )

        config = prompt.config or {}

        return CompiledPrompt(
            messages=messages,
            model=config.get(
                "model",
                self.settings.default_llm_model,
            ),
            temperature=float(config.get("temperature", 0.0)),
            max_tokens=int(config.get("max_tokens", 4000)),
            langfuse_prompt=prompt,
        )