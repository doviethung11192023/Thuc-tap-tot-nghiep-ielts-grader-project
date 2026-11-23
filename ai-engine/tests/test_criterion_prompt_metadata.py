"""grading_runs.model and prompt_versions come from the four criterion prompts (FR-30)."""
from types import SimpleNamespace

from services.langfuse.prompt_manager import CompiledPrompt
from services.prompt_builder import CriterionPrompts


def _compiled(model: str, version: int) -> CompiledPrompt:
    return CompiledPrompt([], model, 0.0, 100, SimpleNamespace(version=version))


def test_one_model_for_all_criteria():
    prompts = CriterionPrompts(*(_compiled("qwen-flash", 1) for _ in range(4)))
    assert prompts.model_label() == "qwen-flash"


def test_models_grouped_when_criteria_differ():
    prompts = CriterionPrompts(
        _compiled("qwen3.7-plus", 3), _compiled("qwen-flash", 1),
        _compiled("qwen-flash", 1), _compiled("qwen-flash", 3),
    )
    assert prompts.model_label() == "ta=qwen3.7-plus; cc,lr,gra=qwen-flash"
    assert prompts.prompt_versions() == {"ta": 3, "cc": 1, "lr": 1, "gra": 3}
