"""Usage meter, per-run Langfuse trace (no-op on failure), and the run info /grade* endpoints return."""
import asyncio
from contextlib import contextmanager
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

import main
from services.langfuse import run_trace as rt_module
from services.langfuse import usage_meter
from services.langfuse.prompt_manager import PromptFetchError
from services.langfuse.run_trace import RunContext, run_trace

SECRET = "test-engine-secret"
RUN_ID = "11111111-1111-1111-1111-111111111111"
BODY = {"title": "T", "essay": "An essay.", "run_id": RUN_ID, "attempt_id": "att-1", "skill": "writing",
        "mode": "practice"}


def response(prompt_tokens=10, completion_tokens=5):
    return SimpleNamespace(usage=SimpleNamespace(prompt_tokens=prompt_tokens, completion_tokens=completion_tokens))


# ── usage meter ──────────────────────────────────────────────────────────────
def test_meter_sums_per_model_including_worker_threads():
    meter = usage_meter.start_usage_meter()

    async def run():
        usage_meter.record_usage(response(10, 5), "a")
        await asyncio.gather(*(asyncio.to_thread(usage_meter.record_usage, response(1, 2), "b") for _ in range(3)))
        usage_meter.record_usage(response(7, 3), "a")

    asyncio.run(run())
    usage_meter.stop_usage_meter()
    assert sorted(meter.snapshot(), key=lambda x: x["model"]) == [
        {"model": "a", "input_tokens": 17, "output_tokens": 8},
        {"model": "b", "input_tokens": 3, "output_tokens": 6}]


def test_recording_is_harmless_without_a_meter_or_usage():
    usage_meter.record_usage(response(), "a")                       # no meter: nothing happens
    meter = usage_meter.start_usage_meter()
    usage_meter.record_usage(SimpleNamespace(choices=[]), "a")      # test double without usage
    usage_meter.record_usage(SimpleNamespace(usage=SimpleNamespace(prompt_tokens=None, completion_tokens="x")), "a")
    usage_meter.stop_usage_meter()
    assert meter.snapshot() == [{"model": "a", "input_tokens": 0, "output_tokens": 0}]


# ── run trace ────────────────────────────────────────────────────────────────
class FakeSpan:
    def __init__(self):
        self.updates = []

    def update(self, **kwargs):
        self.updates.append(kwargs)


class FakeLangfuse:
    def __init__(self):
        self.span, self.opened, self.closed = FakeSpan(), [], []

    def create_trace_id(self, seed):
        return f"trace-for-{seed}"

    @contextmanager
    def start_as_current_observation(self, **kwargs):
        self.opened.append(kwargs)
        try:
            yield self.span
        finally:
            self.closed.append(True)


@pytest.fixture
def fake_langfuse(monkeypatch):
    fake = FakeLangfuse()
    monkeypatch.setattr(rt_module, "get_langfuse_client", lambda: fake)
    monkeypatch.setattr("langfuse.propagate_attributes", lambda **kw: _recorded(fake, kw))
    return fake


@contextmanager
def _recorded(fake, kwargs):
    fake.propagated = kwargs
    yield


def test_trace_id_comes_from_the_run_id_and_carries_no_personal_data(fake_langfuse):
    context = RunContext(RUN_ID, "att-1", "writing", "mock", 2)
    with run_trace(context, "writing-grade") as trace:
        assert trace.trace_id == f"trace-for-{RUN_ID}"
    assert fake_langfuse.opened[0]["trace_context"] == {"trace_id": f"trace-for-{RUN_ID}"}
    assert fake_langfuse.opened[0]["metadata"] == {"run_id": RUN_ID, "attempt_id": "att-1", "skill": "writing",
                                                   "mode": "mock", "task_no": "2"}
    assert fake_langfuse.propagated["session_id"] == "att-1"
    assert not {"user_id", "user", "email", "name"} & set(fake_langfuse.propagated)
    assert fake_langfuse.closed == [True]


def test_no_run_id_means_no_trace(fake_langfuse):
    with run_trace(RunContext(), "x") as trace:
        assert trace.trace_id is None
    with run_trace(None, "x") as trace:
        assert trace.trace_id is None
    assert fake_langfuse.opened == []


def test_langfuse_failure_is_a_no_op(monkeypatch):
    def broken():
        raise RuntimeError("langfuse down")

    monkeypatch.setattr(rt_module, "get_langfuse_client", broken)
    with run_trace(RunContext(RUN_ID), "x") as trace:
        assert trace.trace_id is None
        trace.mark_error("ignored")


def test_body_exception_still_propagates_and_closes_the_span(fake_langfuse):
    with pytest.raises(ValueError):
        with run_trace(RunContext(RUN_ID), "x"):
            raise ValueError("boom")
    assert fake_langfuse.closed == [True]


# ── endpoints ────────────────────────────────────────────────────────────────
@pytest.fixture
def client(monkeypatch, fake_langfuse):
    for name in ("warm_up_nlp_tools", "load_stt_model", "load_phoneme_model"):
        monkeypatch.setattr(main, name, lambda: None)
    monkeypatch.setattr(main.get_settings(), "ai_engine_secret", SECRET)
    monkeypatch.setattr(main.get_settings(), "allow_no_secret", False)
    with TestClient(main.app, headers={"X-AI-Engine-Secret": SECRET}, raise_server_exceptions=False) as c:
        yield c


def test_grade_returns_trace_usage_and_model(client, monkeypatch):
    async def pipeline(**kwargs):
        usage_meter.record_usage(response(100, 40), "qwen-flash")
        usage_meter.record_usage(response(10, 90), "qwen3.7-plus")
        return {"scores": {"overall_band": 6.0}, "model": "ta=a; cc=b"}

    monkeypatch.setattr(main, "run_grading_pipeline", pipeline)
    body = client.post("/grade", json={**BODY, "task_type": "task1"}).json()
    assert body["trace_id"] == f"trace-for-{RUN_ID}"
    assert body["scores"] == {"overall_band": 6.0}
    assert {u["model"] for u in body["usage"]} == {"qwen-flash", "qwen3.7-plus"}
    assert body["model"] == "qwen3.7-plus"                    # no prompt recorded: model with most output tokens


def test_model_is_the_main_step_model_after_overrides(client, monkeypatch):
    from services.runtime_config.request_runtime_config import current_request_runtime

    async def pipeline(**kwargs):
        runtime = current_request_runtime()
        runtime.record_model("writing/common/cc", "other")
        runtime.record_model("writing/task2/grade", "overridden-model")
        return {}

    monkeypatch.setattr(main, "run_grading_pipeline", pipeline)
    assert client.post("/grade", json=BODY).json()["model"] == "overridden-model"


def test_request_without_run_context_runs_as_before(client, monkeypatch, fake_langfuse):
    async def pipeline(**kwargs):
        return {"scores": {}}

    monkeypatch.setattr(main, "run_grading_pipeline", pipeline)
    body = client.post("/grade", json={"title": "T", "essay": "An essay."}).json()
    assert body["scores"] == {} and body["trace_id"] is None and body["usage"] == []
    assert fake_langfuse.opened == []


def test_errors_carry_usage_and_trace_id(client, monkeypatch):
    async def failing(**kwargs):
        usage_meter.record_usage(response(5, 1), "qwen-flash")
        raise RuntimeError("provider said sk-abcdef123456 is wrong")

    monkeypatch.setattr(main, "run_grading_pipeline", failing)
    res = client.post("/grade", json=BODY)
    assert res.status_code == 500
    body = res.json()
    assert body["trace_id"] == f"trace-for-{RUN_ID}"
    assert body["usage"] == [{"model": "qwen-flash", "input_tokens": 5, "output_tokens": 1}]
    assert "sk-abcdef123456" not in body["detail"]

    async def missing(**kwargs):
        raise PromptFetchError("prompt gone")

    monkeypatch.setattr(main, "run_grading_pipeline", missing)
    res = client.post("/grade", json=BODY)
    assert res.status_code == 502 and "prompt gone" in res.json()["detail"] and "usage" in res.json()


def test_speaking_and_material_endpoints_return_run_info(client, monkeypatch):
    async def speaking(title, answers, unanswered):
        usage_meter.record_usage(response(3, 4), "m")
        return {"no_speech": False}

    async def material(kind, task, title, image_url, key, manager):
        return "draft"

    monkeypatch.setattr(main, "run_speaking_pipeline", speaking)
    monkeypatch.setattr(main, "draft_material", material)
    monkeypatch.setattr(main, "get_prompt_manager", lambda: None)
    res = client.post("/grade-speaking", json={
        "run_id": RUN_ID, "answers": [{"response_id": "r", "part": 1, "question": "q", "audio_url": "u"}]}).json()
    assert res["trace_id"] and res["usage"] == [{"model": "m", "input_tokens": 3, "output_tokens": 4}]
    res = client.post("/draft-material", json={"run_id": RUN_ID, "kind": "outline", "title": "x"}).json()
    assert res["content"] == "draft" and res["trace_id"]
