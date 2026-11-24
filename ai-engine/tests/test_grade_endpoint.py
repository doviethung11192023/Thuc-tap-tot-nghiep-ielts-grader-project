"""/grade contract: backward compatible payload, Task 1 fields, error mapping."""
import pytest
from fastapi.testclient import TestClient

import main as serve
from api import grading_routes
from services.langfuse.prompt_manager import PromptFetchError

SECRET = "test-engine-secret"


@pytest.fixture
def client(monkeypatch):
    import main     # the lifespan lives in main: stub its warm-ups so tests never load NLP or speech models
    for name in ("warm_up_nlp_tools", "load_stt_model", "load_phoneme_model"):
        monkeypatch.setattr(main, name, lambda: None)
    calls = []

    async def fake_pipeline(**kwargs):
        calls.append(kwargs)
        return {"task_type": kwargs["task_type"] or "task2", "scores": {"overall_band": 6.5}}

    monkeypatch.setattr(grading_routes, "run_grading_pipeline", fake_pipeline)
    settings = main.get_settings()
    monkeypatch.setattr(settings, "ai_engine_secret", SECRET)
    monkeypatch.setattr(settings, "allow_no_secret", False)
    with TestClient(serve.app, headers={"X-AI-Engine-Secret": SECRET}) as c:
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
    monkeypatch.setattr(grading_routes, "run_grading_pipeline", failing)
    res = client.post("/grade", json={"title": "x", "essay": "Text."})
    assert res.status_code == 502
    assert "TA_TASK1" in res.json()["detail"]


def test_wrong_secret_is_forbidden(client):
    res = client.post("/grade", json={"title": "t", "essay": "Text."}, headers={"X-AI-Engine-Secret": "nope"})
    assert res.status_code == 403
    assert client.calls == []


def test_missing_secret_config_fails_closed(client, monkeypatch):
    """Deploy quên đặt AI_ENGINE_SECRET: không ai chấm được, kể cả request không có header."""
    monkeypatch.setattr(serve.get_settings(), "ai_engine_secret", "")
    res = client.post("/grade", json={"title": "t", "essay": "Text."}, headers={"X-AI-Engine-Secret": ""})
    assert res.status_code == 503
    assert client.calls == []


def test_allow_no_secret_opens_endpoint_for_local_runs(client, monkeypatch):
    settings = serve.get_settings()
    monkeypatch.setattr(settings, "ai_engine_secret", "")
    monkeypatch.setattr(settings, "allow_no_secret", True)
    assert client.post("/grade", json={"title": "t", "essay": "Text."}, headers={"X-AI-Engine-Secret": ""}).status_code == 200


def test_lifespan_skips_speech_preload_when_disabled(monkeypatch):
    import main
    called = []
    monkeypatch.setattr(main, "warm_up_nlp_tools", lambda: None)
    monkeypatch.setattr(main, "load_stt_model", lambda: called.append("stt"))
    monkeypatch.setattr(main, "load_phoneme_model", lambda: called.append("phoneme"))
    monkeypatch.setattr(main.get_settings(), "speech_preload_models", False)
    with TestClient(serve.app) as c:
        assert c.get("/health").status_code == 200
    assert called == []
