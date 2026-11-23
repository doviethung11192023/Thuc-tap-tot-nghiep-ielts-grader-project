"""
Single source of truth for every prompt name on Langfuse.

Langfuse turns "/" in a prompt name into folders, so the names below ARE the
folder layout shown in the Langfuse UI (label "production" is what the code reads):

    writing/
      common/   cc, lr, gra            criteria shared by Task 1 and Task 2
      task1/    classify               visual type from the image (light vision model)
                ta, chart, rewrite     Task Achievement, vision chart reader, upgraded report
      task2/    ta, rewrite, classify  Task Response, upgraded essay, essay type classifier
                grade                  all four criteria in one call (reference flow)
      task1/    answer-key, keycheck   per-task answer key draft; key-point extraction (spec 006)
      common/   outline, sample        per-task outline and sample essay drafts (spec 006)
    speaking/
      common/   fc, lr, gra, pr        criteria scored on the whole test transcript
                overall                synthesis: summary + study plan from the 4 criteria
      part1/    feedback               per-part answer feedback + upgraded sample answers
      part2/    feedback
      part3/    feedback

Langfuse is the only place prompts are stored and edited (no local copies).
``scripts/sync_langfuse_prompts.py`` checks Langfuse against this registry.
"""
from __future__ import annotations

from typing import Literal

AgentCriterion = Literal["ta", "cc", "lr", "gra"]
WritingTask = Literal["task1", "task2"]
SpeakingCriterion = Literal["fc", "lr", "gra", "pr"]
SpeakingPart = Literal["part1", "part2", "part3"]

# ── Writing ───────────────────────────────────────────────────────────────────
# Task 2 criterion agents (CC/LR/GRA are shared with Task 1).
PROMPT_NAMES: dict[AgentCriterion, str] = {
    "ta": "writing/task2/ta",
    "cc": "writing/common/cc",
    "lr": "writing/common/lr",
    "gra": "writing/common/gra",
}

# Task 1 overrides (only TA differs: Task Achievement instead of Task Response).
TASK1_PROMPT_NAMES: dict[AgentCriterion, str] = {
    "ta": "writing/task1/ta",
}

REWRITE_PROMPT_NAMES: dict[WritingTask, str] = {
    "task1": "writing/task1/rewrite",
    "task2": "writing/task2/rewrite",
}

CHART_PROMPT_NAME = "writing/task1/chart"

# Task 1 visual type, read from the image by a light vision model.
VISUAL_CLASSIFY_PROMPT_NAME = "writing/task1/classify"

# Essay type classifier: option definitions shared by every classifier backend.
CLASSIFY_PROMPT_NAME = "writing/task2/classify"
# One call for all four criteria, with band-ladder references.
GRADE_PROMPT_NAME = "writing/task2/grade"

# Per-task material drafted by AI, approved by an Admin (spec 006, ADR-30).
ANSWER_KEY_PROMPT_NAME = "writing/task1/answer-key"   # vision: figures, overview, key features
KEYCHECK_PROMPT_NAME = "writing/task1/keycheck"       # which key features the report covers, figures stated
OUTLINE_PROMPT_NAME = "writing/common/outline"
SAMPLE_PROMPT_NAME = "writing/common/sample"

# ── Speaking ──────────────────────────────────────────────────────────────────
SPEAKING_PROMPT_NAMES: dict[SpeakingCriterion, str] = {
    "fc": "speaking/common/fc",
    "lr": "speaking/common/lr",
    "gra": "speaking/common/gra",
    "pr": "speaking/common/pr",
}

SPEAKING_PART_PROMPT_NAMES: dict[SpeakingPart, str] = {
    "part1": "speaking/part1/feedback",
    "part2": "speaking/part2/feedback",
    "part3": "speaking/part3/feedback",
}

SPEAKING_OVERALL_PROMPT_NAME = "speaking/common/overall"

# ── Aggregates ────────────────────────────────────────────────────────────────
WRITING_PROMPT_NAMES: tuple[str, ...] = tuple(sorted({
    *PROMPT_NAMES.values(),
    *TASK1_PROMPT_NAMES.values(),
    *REWRITE_PROMPT_NAMES.values(),
    CHART_PROMPT_NAME,
    VISUAL_CLASSIFY_PROMPT_NAME,
    CLASSIFY_PROMPT_NAME,
    GRADE_PROMPT_NAME,
    ANSWER_KEY_PROMPT_NAME,
    KEYCHECK_PROMPT_NAME,
    OUTLINE_PROMPT_NAME,
    SAMPLE_PROMPT_NAME,
}))

ALL_SPEAKING_PROMPT_NAMES: tuple[str, ...] = tuple(sorted({
    *SPEAKING_PROMPT_NAMES.values(),
    *SPEAKING_PART_PROMPT_NAMES.values(),
    SPEAKING_OVERALL_PROMPT_NAME,
}))

ALL_PROMPT_NAMES: tuple[str, ...] = WRITING_PROMPT_NAMES + ALL_SPEAKING_PROMPT_NAMES


def resolve_agent_prompt_name(criterion: AgentCriterion, task: WritingTask = "task2") -> str:
    """Langfuse prompt name of a Writing criterion agent for the given task."""
    if task == "task1" and criterion in TASK1_PROMPT_NAMES:
        return TASK1_PROMPT_NAMES[criterion]
    return PROMPT_NAMES[criterion]
