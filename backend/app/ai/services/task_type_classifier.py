"""
Essay type classifier: one of 6 Task 2 types from the title alone.

Order: Jev (TypeSafe) when configured, then the Langfuse prompt `writing/task2/classify`,
then "Unknown". There is no default type: a wrong type would select the wrong references.
"""
from __future__ import annotations

import json
import logging

from schemas.task_type import UNKNOWN_TASK_TYPE, TaskTypeResult
from services import jev_client
from services.llm_client import get_sync_llm_client, llm_extra_body, strip_markdown_fence
from services.prompt_builder import get_prompt_manager
from settings.config import get_settings

logger = logging.getLogger(__name__)

_TASK_TYPES = {
    "Opinion": """# Trigger
- Do you agree or disagree?
- To what extent do you agree or disagree?
- What is your opinion?
- Positive or negative development?

# Mandatory Requirements
✓ Directly answer the question.
✓ State a clear position.
✓ Maintain the same position throughout.
✓ Develop reasons supporting the position.

# Position Rules
A position must be identifiable from the introduction.
The conclusion must not contradict the position.
Partial agreement is acceptable if clearly stated.

# Development Rules
Reasons must explain WHY.
Examples should strengthen the reasons.

# Common Mistakes
- unclear opinion
- changing opinion
- discussing both sides without taking a position
- unsupported claims""",

    "Discussion": """# Trigger
Discuss both views...
Discuss both views and give your opinion...

# Mandatory Requirements
✓ Discuss View A.
✓ Discuss View B.
✓ Give own opinion if requested.

# Position Rules
Personal opinion is required only when explicitly requested.

# Development Rules
Both views must receive meaningful development.

# Common Mistakes
- ignoring one view
- opinion missing
- opinion inconsistent
- one side only briefly mentioned""",

    "Advantages_Disadvantages": """# Trigger
Advantages and disadvantages
Outweigh
Positive or negative development

# Mandatory Requirements
Discuss Variant
✓ advantages
✓ disadvantages
Opinion optional.

Outweigh Variant
✓ advantages
✓ disadvantages
✓ clear verdict

Positive / Negative Development
✓ evaluation
✓ supporting reasons

# Common Mistakes
- only advantages
- only disadvantages
- missing verdict
- confusing positive development with outweigh""",

    "Cause_Solution": """# Mandatory Requirements
✓ causes
✓ solutions

# Development Rules
Solutions should logically address identified causes.

# Common Mistakes
- solutions unrelated to causes
- only causes
- only solutions""",

    "Cause_Effect": """# Mandatory Requirements
✓ causes
✓ effects

# Common Mistakes
- writing solutions instead of effects
- effects unrelated to causes""",

    "Two_Part_Question": """# Mandatory Requirements
Treat every explicit question as an independent requirement.
Each question must receive:
✓ direct answer
✓ sufficient development

# Common Mistakes
- answering only one question
- unequal development
- mixing answers together"""
}


def _result(task_type: str, classifier: str) -> TaskTypeResult:
    return TaskTypeResult(task_type, _TASK_TYPES.get(task_type, ""), classifier)


def _classify_with_prompt(compiled) -> str | None:
    response = get_sync_llm_client().chat.completions.create(
        model=compiled.model,
        messages=compiled.messages,
        temperature=compiled.temperature,
        max_tokens=compiled.max_tokens,
        response_format={"type": "json_object"},
        extra_body=llm_extra_body(),
    )
    data = json.loads(strip_markdown_fence(response.choices[0].message.content or "{}"))
    task_type = data.get("task_type")
    return task_type if task_type in _TASK_TYPES else None


def classify_task_type(title: str) -> TaskTypeResult:
    """Classify a Task 2 title. Failures end in "Unknown" and never stop the grading."""
    unknown = _result(UNKNOWN_TASK_TYPE, "none")
    if not title or not title.strip():
        logger.warning("Empty task title: essay type is unknown")
        return unknown

    try:
        compiled = get_prompt_manager().get_classify_prompt(title)
    except Exception as e:
        logger.warning("Classifier prompt unavailable (%s): essay type is unknown", e)
        return unknown

    if get_settings().essay_classifier == "jev" and jev_client.is_configured():
        options = (compiled.langfuse_prompt.config or {}).get("options") or {}
        task_type = jev_client.choose_essay_type(title, options)
        if task_type:
            return _result(task_type, "jev")
        logger.warning("Jev gave no valid type: falling back to the Qwen classifier")

    try:
        task_type = _classify_with_prompt(compiled)
    except Exception as e:
        logger.warning("Qwen classifier failed: %s", e)
        task_type = None
    return _result(task_type, "qwen") if task_type else unknown
