"""
Task Type Classifier — classifies an IELTS Task 2 title into one of 6 types
using few-shot LLM prompting.
"""
from __future__ import annotations
import json
from openai import OpenAI
from settings.config import get_settings
from schemas.task_type import TaskTypeResult

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

_FEW_SHOT_EXAMPLES = [
    ("To what extent do you agree or disagree that unpaid community service should be compulsory for high school students?", "Opinion"),
    ("Some people prefer to live in cities while others prefer to live in the countryside. Discuss both views and give your own opinion.", "Discussion"),
    ("What are the advantages and disadvantages of working from home?", "Advantages_Disadvantages"),
    ("In many cities, traffic congestion is a serious problem. What are the causes of this problem and what solutions can be suggested?", "Cause_Solution"),
    ("Many young people are moving from rural areas to cities. What are the causes and effects of this trend?", "Cause_Effect"),
    ("What are the most important qualities of a good leader? Are these qualities innate or can they be learned?", "Two_Part_Question"),
]

_SYSTEM_PROMPT = """You are an IELTS task type classifier. Given an IELTS Writing Task 2 title, output ONLY a JSON object with one field: {"task_type": "<type>"}.
Valid types: Opinion, Discussion, Advantages_Disadvantages, Cause_Solution, Cause_Effect, Two_Part_Question."""

def _build_messages(title: str) -> list[dict]:
    messages = [{"role": "system", "content": _SYSTEM_PROMPT}]
    for example_title, example_type in _FEW_SHOT_EXAMPLES:
        messages.append({"role": "user", "content": example_title})
        messages.append({"role": "assistant", "content": json.dumps({"task_type": example_type})})
    messages.append({"role": "user", "content": title})
    return messages

def _get_client() -> OpenAI:
    settings = get_settings()
    # Use Qwen via OpenAI-compatible API (or Gemini with openai compat)
    return OpenAI(
        api_key=settings.qwen_api_key,
        base_url=settings.default_base_url,
    )

def classify_task_type(title: str) -> TaskTypeResult:
    """Classify the IELTS title into one of 6 task types."""
    client = _get_client()
    response = client.chat.completions.create(
        model=get_settings().default_llm_model,
        messages=_build_messages(title),
        temperature=0.0,
        response_format={"type": "json_object"},
    )
    data = json.loads(response.choices[0].message.content)
    task_type = data.get("task_type", "Opinion")
    description = _TASK_TYPES.get(task_type, _TASK_TYPES["Opinion"])
    return TaskTypeResult(task_type=task_type, description=description)
