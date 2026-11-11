"""
Fingerprint of the grading setup for one Writing task (spec 006 US4).

The Core API reuses an earlier result only when the essay, the task material and this fingerprint
all match, so any change of pipeline, model or production prompt version forces a fresh grading.
"""
from __future__ import annotations

import hashlib
import json

from services.langfuse.prompt_manager import PromptManager
from services.langfuse.prompt_registry import (
    CHART_PROMPT_NAME, CLASSIFY_PROMPT_NAME, GRADE_PROMPT_NAME, KEYCHECK_PROMPT_NAME, PROMPT_NAMES,
    REWRITE_PROMPT_NAMES, TASK1_PROMPT_NAMES, VISUAL_CLASSIFY_PROMPT_NAME,
)
from settings.config import get_settings


def prompt_names_for(task: str, task2_pipeline: str) -> list[str]:
    shared = [PROMPT_NAMES["cc"], PROMPT_NAMES["lr"], PROMPT_NAMES["gra"]]
    if task == "task1":
        return [TASK1_PROMPT_NAMES["ta"], *shared, REWRITE_PROMPT_NAMES["task1"], CHART_PROMPT_NAME,
                VISUAL_CLASSIFY_PROMPT_NAME, KEYCHECK_PROMPT_NAME]
    if task2_pipeline == "reference":
        return [CLASSIFY_PROMPT_NAME, GRADE_PROMPT_NAME, REWRITE_PROMPT_NAMES["task2"]]
    return [PROMPT_NAMES["ta"], *shared, CLASSIFY_PROMPT_NAME, REWRITE_PROMPT_NAMES["task2"]]


def grading_fingerprint(task: str, pm: PromptManager) -> str:
    """Raises PromptFetchError when Langfuse is down: then nobody can grade, and nothing is reused."""
    s = get_settings()
    names = prompt_names_for(task, s.writing_task2_pipeline)
    setup = {
        "task": task,
        "task2_pipeline": s.writing_task2_pipeline if task == "task2" else None,
        "models": [s.default_llm_model, s.vision_llm_model, s.rewrite_llm_model, s.grade_llm_model,
                   s.essay_classifier],
        "prompts": {name: pm._fetch(name).version for name in names},
    }
    return hashlib.sha256(json.dumps(setup, sort_keys=True).encode()).hexdigest()
