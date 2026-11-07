"""Pipeline routing: Task 1 uses vision + Task 1 knowledge; Task 2 uses the classifier."""
from types import SimpleNamespace

import pytest

import services.grading_pipeline as gp
from schemas.llm_output import AgentCriterionOutput, AllAgentOutputs
from schemas.task_type import TaskTypeResult
from services.chart_describer import ChartDescription
from services.langfuse.prompt_manager import CompiledPrompt, resolve_agent_prompt_name
from services.prompt_builder import CriterionPrompts

ESSAY = "The bar chart compares aid from six countries between 2008 and 2010. Overall, the USA gave the most."


@pytest.mark.parametrize("raw, expected", [
    (None, "task2"), ("", "task2"), ("task2", "task2"), ("task1", "task1"),
    ("Task 1", "task1"), ("writing_task1", "task1"), ("1", "task1"), ("other", "task2"),
])
def test_normalize_task(raw, expected):
    assert gp.normalize_task(raw) == expected


def test_prompt_name_resolution():
    assert resolve_agent_prompt_name("ta", "task1") == "writing/task1/ta"
    assert resolve_agent_prompt_name("cc", "task1") == "writing/common/cc"
    assert resolve_agent_prompt_name("ta", "task2") == "writing/task2/ta"


@pytest.fixture
def stubbed(monkeypatch):
    seen = {}
    out = AgentCriterionOutput(band=6.0, summary="s")

    monkeypatch.setattr(gp, "check_grammar", lambda processed: [])
    monkeypatch.setattr(gp, "compute_lexical", lambda processed: object())
    monkeypatch.setattr(gp, "get_prompt_manager", lambda: object())

    def fake_classifier(title):
        seen["classifier_called"] = True
        return TaskTypeResult(task_type="Opinion", description="d")

    async def fake_describe(title, image_url, pm):
        seen["image_url"] = image_url
        return ChartDescription(available=True, chart_type="bar_chart", overview="USA highest")

    def fake_build(**kwargs):
        seen["build"] = kwargs
        ta = CompiledPrompt([], "plus", 0.0, 100, SimpleNamespace(version=3))
        other = CompiledPrompt([], "flash", 0.0, 100, SimpleNamespace(version=1))
        return CriterionPrompts(ta, other, other, other)

    async def fake_eval(prompts):
        return AllAgentOutputs(ta=out, cc=out, lr=out, gra=out)

    class FakeSynthesis:
        def __init__(self, prompt_manager=None):
            pass

        async def synthesize_and_rewrite(self, **kwargs):
            seen["synthesis_task"] = kwargs["task"]
            seen["synthesis_visual"] = kwargs.get("visual_description")
            return {"task_type": kwargs["task"], "scores": {"overall_band": 6.0}, "inline_annotations": []}

    monkeypatch.setattr(gp, "classify_task_type", fake_classifier)
    monkeypatch.setattr(gp, "describe_chart", fake_describe)
    monkeypatch.setattr(gp, "build_criterion_prompts", fake_build)
    monkeypatch.setattr(gp, "evaluate_all_criteria", fake_eval)
    monkeypatch.setattr(gp, "SynthesisService", FakeSynthesis)
    return seen


@pytest.mark.asyncio
async def test_task1_routing(stubbed):
    result = await gp.run_grading_pipeline("The chart shows aid.", ESSAY, "task1", "https://r2/x.png")
    assert stubbed["image_url"] == "https://r2/x.png"
    assert "classifier_called" not in stubbed
    assert stubbed["build"]["task"] == "task1"
    assert stubbed["build"]["task_type"].task_type == "bar_chart"
    assert "USA highest" in stubbed["build"]["visual_description"]
    assert stubbed["synthesis_task"] == "task1"
    assert "USA highest" in stubbed["synthesis_visual"]
    assert result["visual_analysis"]["chart_type"] == "bar_chart"
    assert result["task_subtype"] == "bar_chart"
    assert result["model"] == "ta=plus; cc,lr,gra=flash"
    assert result["prompt_versions"] == {"ta": 3, "cc": 1, "lr": 1, "gra": 1}


@pytest.mark.asyncio
async def test_task2_legacy_routing(stubbed):
    result = await gp.run_grading_pipeline("Discuss both views.", ESSAY, pipeline="legacy")
    assert stubbed["classifier_called"]
    assert stubbed["build"]["task"] == "task2"
    assert stubbed["build"]["visual_description"] == ""
    assert "visual_analysis" not in result
    assert result["task_type"] == "task2"
