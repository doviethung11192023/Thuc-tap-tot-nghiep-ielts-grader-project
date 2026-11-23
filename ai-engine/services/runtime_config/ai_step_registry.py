"""
The 8 AI steps an Admin can override (spec 008, data-model section 2).

A step groups the Langfuse prompts that share one model/temperature/max_tokens override.
Prompt names come from prompt_registry, so a renamed prompt cannot silently drop out of a step
(tests check that every name in ALL_PROMPT_NAMES belongs to exactly one step).
"""
from __future__ import annotations

from services.langfuse.prompt_registry import (
    ANSWER_KEY_PROMPT_NAME,
    CHART_PROMPT_NAME,
    CLASSIFY_PROMPT_NAME,
    GRADE_PROMPT_NAME,
    KEYCHECK_PROMPT_NAME,
    OUTLINE_PROMPT_NAME,
    PROMPT_NAMES,
    REWRITE_PROMPT_NAMES,
    SAMPLE_PROMPT_NAME,
    SPEAKING_OVERALL_PROMPT_NAME,
    SPEAKING_PART_PROMPT_NAMES,
    SPEAKING_PROMPT_NAMES,
    TASK1_PROMPT_NAMES,
    VISUAL_CLASSIFY_PROMPT_NAME,
)

# Order matters only for display: the Admin page lists steps in this order.
STEP_PROMPTS: dict[str, tuple[str, ...]] = {
    "writing_criteria": (TASK1_PROMPT_NAMES["ta"], PROMPT_NAMES["ta"], PROMPT_NAMES["cc"],
                         PROMPT_NAMES["lr"], PROMPT_NAMES["gra"]),
    "writing_task2_grade": (GRADE_PROMPT_NAME,),
    "writing_rewrite": (REWRITE_PROMPT_NAMES["task1"], REWRITE_PROMPT_NAMES["task2"]),
    "writing_vision": (CHART_PROMPT_NAME, ANSWER_KEY_PROMPT_NAME),
    "writing_classify": (VISUAL_CLASSIFY_PROMPT_NAME, CLASSIFY_PROMPT_NAME),
    "writing_keycheck": (KEYCHECK_PROMPT_NAME,),
    "writing_material": (OUTLINE_PROMPT_NAME, SAMPLE_PROMPT_NAME),
    "speaking_grading": (*SPEAKING_PROMPT_NAMES.values(), SPEAKING_OVERALL_PROMPT_NAME,
                         *SPEAKING_PART_PROMPT_NAMES.values()),
}

STEP_LABELS: dict[str, str] = {
    "writing_criteria": "Writing: chấm từng tiêu chí (TA/TR, CC, LR, GRA)",
    "writing_task2_grade": "Writing Task 2: chấm một lượt (Reference)",
    "writing_rewrite": "Writing: viết lại bài (rewrite)",
    "writing_vision": "Writing Task 1: đọc biểu đồ (vision)",
    "writing_classify": "Writing: phân loại dạng đề",
    "writing_keycheck": "Writing Task 1: kiểm điểm chính",
    "writing_material": "Writing: soạn dàn ý và bài mẫu",
    "speaking_grading": "Speaking: chấm và nhận xét",
}

STEP_KEYS: tuple[str, ...] = tuple(STEP_PROMPTS)

_STEP_BY_PROMPT: dict[str, str] = {name: step for step, names in STEP_PROMPTS.items() for name in names}


def step_for_prompt(name: str) -> str | None:
    """Step that owns a Langfuse prompt name, or None for an unregistered name."""
    return _STEP_BY_PROMPT.get(name)
