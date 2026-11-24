"""POST /admin/services/test logic: exact candidate parameters, key choice, redaction, null fields."""
import asyncio
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from services.writing import jev_client
from services.service_admin import service_test_call as stc
from services.runtime_config import request_runtime_config as rrc
from services.runtime_config.runtime_config_model import RuntimeConfig
from settings.config import Settings

KEY = "sk-candidate-key-0001"


class FakeOpenAI:
    instances = []
    error = None

    def __init__(self, **kwargs):
        self.init, self.calls = kwargs, []
        FakeOpenAI.instances.append(self)
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))

    async def _create(self, **kwargs):
        self.calls.append(kwargs)
        if FakeOpenAI.error:
            raise FakeOpenAI.error
        return SimpleNamespace(choices=[SimpleNamespace()])

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False


@pytest.fixture(autouse=True)
def env(monkeypatch):
    FakeOpenAI.instances, FakeOpenAI.error = [], None
    settings = Settings(_env_file=None, qwen_api_key="env-llm-key-9999", typesafe_api_key="env-ts-key-8888")
    for module in (stc, jev_client):
        monkeypatch.setattr(module, "get_settings", lambda: settings)
    monkeypatch.setattr("services.llm.llm_client.get_settings", lambda: settings)
    monkeypatch.setattr(stc, "AsyncOpenAI", FakeOpenAI)
    monkeypatch.setattr(stc, "ensure_langfuse_client", lambda: None)
    return settings


def run(**fields):
    return asyncio.run(stc.run_service_test(stc.ServiceTestRequest(**fields)))


def test_llm_call_uses_exactly_the_candidate_parameters():
    result = run(kind="llm", model="qwen3.7-plus", temperature=0.2, max_tokens=4000, timeout_seconds=30,
                 enable_thinking=True, api_key=f"  {KEY} ")
    assert result["ok"] is True and result["error"] is None and result["latency_ms"] >= 0
    client = FakeOpenAI.instances[0]
    assert client.init["api_key"] == KEY and client.init["timeout"] == 30
    call = client.calls[0]
    assert call["model"] == "qwen3.7-plus" and call["temperature"] == 0.2 and call["max_tokens"] == 4000
    assert call["extra_body"] == {"enable_thinking": True}
    assert call["messages"] == [{"role": "user", "content": "Reply with OK"}]


def test_null_fields_mean_the_value_in_effect(env):
    result = run(kind="llm", model=None, temperature=None, max_tokens=None, timeout_seconds=None,
                 enable_thinking=None, api_key=None, use_env_key=False)
    assert result["ok"]
    client = FakeOpenAI.instances[0]
    assert client.init["api_key"] == "env-llm-key-9999" and client.init["timeout"] == 180.0
    call = client.calls[0]
    assert call["model"] == env.default_llm_model and "temperature" not in call
    assert call["extra_body"] == {"enable_thinking": False}


def test_key_in_effect_prefers_the_app_key():
    rt = rrc.RequestRuntime(RuntimeConfig.model_validate({"keys": {"dashscope": "app-key-77777"}}))
    with rrc.bound_runtime(rt):
        run(kind="llm")
    assert FakeOpenAI.instances[0].init["api_key"] == "app-key-77777"


def test_use_env_key_ignores_the_app_key_and_reports_a_missing_env_key(env):
    rt = rrc.RequestRuntime(RuntimeConfig.model_validate({"keys": {"dashscope": "app-key-77777"}}))
    with rrc.bound_runtime(rt):
        run(kind="llm", use_env_key=True)
        assert FakeOpenAI.instances[0].init["api_key"] == "env-llm-key-9999"
        env.qwen_api_key = ""
        assert run(kind="llm", use_env_key=True) == {"ok": False, "latency_ms": 0, "error": "env_key_missing"}


def test_provider_error_is_cut_and_never_contains_the_key():
    FakeOpenAI.error = RuntimeError(f"401 Incorrect API key provided: {KEY}. " + "x" * 600)
    result = run(kind="llm", api_key=KEY)
    assert result["ok"] is False and len(result["error"]) <= 300
    assert KEY not in result["error"] and "sk-candidate" not in result["error"]
    assert result["latency_ms"] >= 0


def test_jev_one_classification_of_a_fixed_title(monkeypatch):
    sent = {}

    def fake_request(api_key, model, timeout, title, options):
        sent.update(key=api_key, model=model, timeout=timeout, title=title, options=options)
        return "Opinion"

    monkeypatch.setattr(jev_client, "request_choice", fake_request)
    assert run(kind="jev", model="jev-x", timeout_seconds=4, api_key="ts-candidate-1")["ok"]
    assert sent["key"] == "ts-candidate-1" and sent["model"] == "jev-x" and sent["timeout"] == 4
    assert sent["title"] == stc._SAMPLE_TITLE and sent["options"]
    sent.clear()
    assert run(kind="jev")["ok"] and sent["key"] == "env-ts-key-8888" and sent["model"] == "jev-latest"
    assert run(kind="jev", use_env_key=True)["ok"]


def test_jev_failure_is_redacted(monkeypatch):
    def failing(*args):
        raise RuntimeError(f"401 bad token env-ts-key-8888")

    monkeypatch.setattr(jev_client, "request_choice", failing)
    result = run(kind="jev")
    assert result["ok"] is False and "env-ts-key-8888" not in result["error"]


def test_request_validation():
    with pytest.raises(ValidationError):
        stc.ServiceTestRequest(kind="other")
    stc.ServiceTestRequest(kind="llm", model=None, temperature=None, max_tokens=None, timeout_seconds=None,
                           enable_thinking=None, api_key=None)
