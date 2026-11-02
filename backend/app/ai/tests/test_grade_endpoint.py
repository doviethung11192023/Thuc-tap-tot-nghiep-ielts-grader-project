"""/grade contract: backward compatible payload, Task 1 fields, error mapping."""
import pytest
from fastapi.testclient import TestClient

import main as serve
from services.langfuse.prompt_manager import PromptFetchError


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(serve, "warm_up_nlp_tools", lambda: None)
    calls = []

    async def fake_pipeline(**kwargs):
        calls.append(kwargs)
        return {"task_type": kwargs["task_type"] or "task2", "scores": {"overall_band": 6.5}}

    monkeypatch.setattr(serve, "run_grading_pipeline", fake_pipeline)
    with TestClient(serve.app) as c:
        c.calls = calls
        yield c


def test_legacy_payload_still_accepted(client):
    res = client.post("/grade", json={"title": "Some topic", "essay": "An essay."})
    assert res.status_code == 200
    assert client.calls[0]["task_type"] is None
    assert client.calls[0]["image_url"] is None


def test_task1_payload_forwards_image(client):
    body = {"title": "The chart shows...", "essay": "The bar chart...", "task_type": "task1",
            "image_url": "https://example.com/chart.png"}
    res = client.post("/grade", json=body)
    assert res.status_code == 200
    assert client.calls[0]["task_type"] == "task1"
    assert client.calls[0]["image_url"] == "https://example.com/chart.png"


def test_empty_title_allowed_but_blank_essay_rejected(client):
    assert client.post("/grade", json={"title": "", "essay": "Text."}).status_code == 200
    assert client.post("/grade", json={"title": "x", "essay": "   "}).status_code == 422
    assert client.post("/grade", json={"title": "x", "essay": ""}).status_code == 422


def test_prompt_fetch_error_maps_to_502(client, monkeypatch):
    async def failing(**kwargs):
        raise PromptFetchError("TA_TASK1 missing")
    monkeypatch.setattr(serve, "run_grading_pipeline", failing)
    res = client.post("/grade", json={"title": "x", "essay": "Text."})
    assert res.status_code == 502
    assert "TA_TASK1" in res.json()["detail"]
