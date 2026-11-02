import json
from types import SimpleNamespace

import pytest

import services.chart_describer as cd
from services.langfuse.prompt_manager import CompiledPrompt


class FakePromptManager:
    def get_chart_prompt(self, title):
        return CompiledPrompt(
            messages=[{"role": "system", "content": "sys"}, {"role": "user", "content": f"P: {title}"}],
            model="vision-model", temperature=0.0, max_tokens=500, langfuse_prompt=None,
        )


def test_guess_type_from_prompt():
    assert cd.guess_type_from_prompt("The pie charts show...") == "pie_chart"
    assert cd.guess_type_from_prompt("The diagram shows the process of making tea") == "process"
    assert cd.guess_type_from_prompt("Something else") == "mixed"


def test_parse_description_normalizes_type_and_lists():
    raw = "```json\n" + json.dumps({
        "chart_type": "bar", "overview": "Japan gave most.",
        "key_features": ["a", "b"], "data_points": "x\ny",
    }) + "\n```"
    desc = cd._parse_description(raw)
    assert desc.available and desc.chart_type == "bar_chart"
    assert desc.data_points == ["x", "y"]
    assert "Visual type: bar_chart" in desc.to_prompt_text()


@pytest.mark.asyncio
async def test_no_image_falls_back():
    desc = await cd.describe_chart("The line graph shows", None, FakePromptManager())
    assert not desc.available and desc.chart_type == "line_graph"
    assert "No image" in desc.to_prompt_text()


@pytest.mark.asyncio
async def test_download_failure_falls_back(monkeypatch):
    async def boom(url):
        raise ValueError("404")
    monkeypatch.setattr(cd, "_image_to_data_url", boom)
    desc = await cd.describe_chart("The table shows", "https://x/y.png", FakePromptManager())
    assert not desc.available and desc.chart_type == "table"


@pytest.mark.asyncio
async def test_vision_call_attaches_image(monkeypatch):
    async def fake_data_url(url):
        return "data:image/png;base64,AAAA"
    sent = {}

    async def create(**kwargs):
        sent.update(kwargs)
        content = json.dumps({"chart_type": "pie_chart", "overview": "o", "key_features": [], "data_points": []})
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])

    fake_client = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create)))
    monkeypatch.setattr(cd, "_image_to_data_url", fake_data_url)
    monkeypatch.setattr(cd, "get_async_llm_client", lambda: fake_client)

    desc = await cd.describe_chart("Prompt", "https://x/y.png", FakePromptManager())
    assert desc.available and desc.chart_type == "pie_chart"
    assert sent["model"] == "vision-model"
    user = sent["messages"][-1]
    assert user["content"][0]["image_url"]["url"].startswith("data:image/png")
    assert user["content"][1]["text"] == "P: Prompt"
