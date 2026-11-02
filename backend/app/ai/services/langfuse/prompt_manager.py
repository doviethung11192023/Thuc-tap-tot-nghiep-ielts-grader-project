from dataclasses import dataclass
from typing import Any, Dict

from settings.config import get_settings
from .client import get_langfuse_client


# Prompt names / folder layout live in prompt_registry; re-exported here for callers.
from .prompt_registry import (  # noqa: E402,F401
    ALL_PROMPT_NAMES,
    CHART_PROMPT_NAME,
    PROMPT_NAMES,
    REWRITE_PROMPT_NAMES,
    SPEAKING_OVERALL_PROMPT_NAME,
    SPEAKING_PART_PROMPT_NAMES,
    SPEAKING_PROMPT_NAMES,
    TASK1_PROMPT_NAMES,
    AgentCriterion,
    WritingTask,
    resolve_agent_prompt_name,
)

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


class PromptFetchError(RuntimeError):
    """A Langfuse prompt could not be fetched (mapped to HTTP 502 by serve.py)."""


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

    def _fetch(self, name: str):
        try:
            return self.langfuse.get_prompt(
                name=name,
                type="chat",
                label="production",
                cache_ttl_seconds=self.settings.langfuse_cache_ttl_seconds,
            )
        except Exception as err:
            raise PromptFetchError(f"Langfuse prompt '{name}' (label=production) unavailable: {err}") from err

    def get_agent_prompt(
        self,
        criterion: AgentCriterion,
        *,
        title: str,
        essay: str,
        task: WritingTask = "task2",
        **variables: Any,
    ) -> CompiledPrompt:
        prompt = self._fetch(resolve_agent_prompt_name(criterion, task))

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
        task: WritingTask = "task2",
        visual_description: str = "",
    ) -> CompiledPrompt:
        prompt = self._fetch(REWRITE_PROMPT_NAMES[task])

        messages = prompt.compile(
            title=title,
            essay=essay,
            ta_feedback=ta_feedback,
            cc_feedback=cc_feedback,
            lr_feedback=lr_feedback,
            gra_feedback=gra_feedback,
            # Task 1 only: chart data = ground truth for figures (unused by the Task 2 prompt).
            visual_description=visual_description,
        )

        config = prompt.config or {}

        return CompiledPrompt(
            messages=messages,
            # REWRITE_LLM_MODEL (env) wins over the Langfuse config so the provider can be switched.
            model=self.settings.rewrite_llm_model or config.get(
                "model",
                self.settings.default_llm_model,
            ),
            temperature=float(config.get("temperature", 0.0)),
            max_tokens=int(config.get("max_tokens", 4000)),
            langfuse_prompt=prompt,
        )

    def get_chart_prompt(self, title: str) -> CompiledPrompt:
        """System + user text for the Task 1 vision pass (the image is attached by the caller)."""
        prompt = self._fetch(CHART_PROMPT_NAME)
        messages = prompt.compile(title=title)
        config = prompt.config or {}
        return CompiledPrompt(
            messages=messages,
            model=self.settings.vision_llm_model,
            temperature=float(config.get("temperature", 0.0)),
            max_tokens=int(config.get("max_tokens", self.settings.vision_max_tokens)),
            langfuse_prompt=prompt,
        )
