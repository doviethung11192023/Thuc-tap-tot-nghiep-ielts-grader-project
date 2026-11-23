from dataclasses import dataclass
from typing import Any, Dict

from services.runtime_config.request_runtime_config import current_request_runtime, current_runtime_config
from settings.config import get_settings
from .client import get_langfuse_client
from .prompt_param_resolution import resolve_prompt_params


# Prompt names / folder layout live in prompt_registry; re-exported here for callers.
from .prompt_registry import (  # noqa: E402,F401
    ALL_PROMPT_NAMES,
    ANSWER_KEY_PROMPT_NAME,
    CHART_PROMPT_NAME,
    KEYCHECK_PROMPT_NAME,
    OUTLINE_PROMPT_NAME,
    SAMPLE_PROMPT_NAME,
    VISUAL_CLASSIFY_PROMPT_NAME,
    CLASSIFY_PROMPT_NAME,
    GRADE_PROMPT_NAME,
    PROMPT_NAMES,
    REWRITE_PROMPT_NAMES,
    SPEAKING_OVERALL_PROMPT_NAME,
    SPEAKING_PART_PROMPT_NAMES,
    SPEAKING_PROMPT_NAMES,
    SpeakingCriterion,
    SpeakingPart,
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
    # where model / temperature / max_tokens came from: app | env | langfuse | default (spec 008)
    sources: dict[str, str] | None = None


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

    def _finish(self, name: str, prompt: Any, messages: list[dict[str, str]]) -> CompiledPrompt:
        """Decide model, temperature and max_tokens (Admin override applied last) and note the model used."""
        params = resolve_prompt_params(name, prompt.config, self.settings, current_runtime_config())
        runtime = current_request_runtime()
        if runtime:
            runtime.record_model(name, params["model"].value)
        return CompiledPrompt(
            messages=messages,
            model=params["model"].value,
            temperature=params["temperature"].value,
            max_tokens=params["max_tokens"].value,
            langfuse_prompt=prompt,
            sources={key: param.source for key, param in params.items()},
        )

    def _compile_speaking(self, name: str, **variables: Any) -> CompiledPrompt:
        prompt = self._fetch(name)
        return self._finish(name, prompt, prompt.compile(**variables))

    def get_speaking_criterion_prompt(self, criterion: SpeakingCriterion, **variables: Any) -> CompiledPrompt:
        return self._compile_speaking(SPEAKING_PROMPT_NAMES[criterion], **variables)

    def get_speaking_part_prompt(self, part: SpeakingPart, **variables: Any) -> CompiledPrompt:
        return self._compile_speaking(SPEAKING_PART_PROMPT_NAMES[part], **variables)

    def get_speaking_overall_prompt(self, **variables: Any) -> CompiledPrompt:
        return self._compile_speaking(SPEAKING_OVERALL_PROMPT_NAME, **variables)

    def get_agent_prompt(
        self,
        criterion: AgentCriterion,
        *,
        title: str,
        essay: str,
        task: WritingTask = "task2",
        **variables: Any,
    ) -> CompiledPrompt:
        name = resolve_agent_prompt_name(criterion, task)
        prompt = self._fetch(name)
        return self._finish(name, prompt, prompt.compile(title=title, essay=essay, **variables))

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
        name = REWRITE_PROMPT_NAMES[task]
        prompt = self._fetch(name)
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
        # REWRITE_LLM_MODEL (env) wins over the Langfuse config so the provider can be switched.
        return self._finish(name, prompt, messages)

    def get_classify_prompt(self, title: str) -> CompiledPrompt:
        """Essay type classifier for one Task 2 title; the model comes from the Langfuse config."""
        return self._compile_speaking(CLASSIFY_PROMPT_NAME, title=title)

    def get_visual_classify_prompt(self) -> CompiledPrompt:
        """Task 1 visual type; model and limits come from the Langfuse config."""
        return self._compile_speaking(VISUAL_CLASSIFY_PROMPT_NAME)

    def get_grade_prompt(self, **variables: Any) -> CompiledPrompt:
        """All four Task 2 criteria in one call; GRADE_LLM_MODEL (env) wins over the Langfuse config model."""
        return self._compile_speaking(GRADE_PROMPT_NAME, **variables)

    def get_chart_prompt(self, title: str) -> CompiledPrompt:
        """System + user text for the Task 1 vision pass (the image is attached by the caller)."""
        prompt = self._fetch(CHART_PROMPT_NAME)
        # the vision model comes from VISION_LLM_MODEL, not from the Langfuse config
        return self._finish(CHART_PROMPT_NAME, prompt, prompt.compile(title=title))

    # ── Per-task material (spec 006) ──────────────────────────────────────────
    def get_keycheck_prompt(self, **variables: Any) -> CompiledPrompt:
        """Key-point extraction for one Task 1 report against an approved answer key."""
        return self._compile_speaking(KEYCHECK_PROMPT_NAME, **variables)

    def get_answer_key_prompt(self, title: str) -> CompiledPrompt:
        """Vision draft of a Task 1 answer key; the image is attached by the caller."""
        return self._compile_speaking(ANSWER_KEY_PROMPT_NAME, title=title)

    def get_material_prompt(self, kind: str, **variables: Any) -> CompiledPrompt:
        """Outline or sample essay draft for one Writing task."""
        return self._compile_speaking(OUTLINE_PROMPT_NAME if kind == "outline" else SAMPLE_PROMPT_NAME, **variables)
