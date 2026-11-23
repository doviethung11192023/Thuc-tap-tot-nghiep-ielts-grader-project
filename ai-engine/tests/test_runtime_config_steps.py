"""The 8 AI steps: every registered prompt belongs to exactly one."""
from collections import Counter

from services.langfuse.prompt_registry import ALL_PROMPT_NAMES
from services.runtime_config.ai_step_registry import STEP_KEYS, STEP_LABELS, STEP_PROMPTS, step_for_prompt

EXPECTED_STEPS = ["writing_criteria", "writing_task2_grade", "writing_rewrite", "writing_vision",
                  "writing_classify", "writing_keycheck", "writing_material", "speaking_grading"]


def test_step_keys_are_the_contract_keys():
    assert list(STEP_KEYS) == EXPECTED_STEPS
    assert set(STEP_LABELS) == set(EXPECTED_STEPS)


def test_every_prompt_belongs_to_exactly_one_step():
    counts = Counter(name for names in STEP_PROMPTS.values() for name in names)
    assert set(counts) == set(ALL_PROMPT_NAMES)
    assert all(count == 1 for count in counts.values())
    assert all(step_for_prompt(name) for name in ALL_PROMPT_NAMES)


def test_unknown_prompt_has_no_step():
    assert step_for_prompt("writing/unknown") is None
