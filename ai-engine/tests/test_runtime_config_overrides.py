"""Step overrides: order app > env > Langfuse > default, sources, LLM client key/timeout, Jev settings."""
from types import SimpleNamespace

import pytest

from services import jev_client, llm_client
from services.langfuse import prompt_manager as pm_module
from services.langfuse.prompt_param_resolution import resolve_prompt_params
from services.runtime_config import request_runtime_config as rrc
from services.runtime_config.runtime_config_model import RuntimeConfig
from settings.config import Settings

GRADE, REWRITE, CHART, TA2 = "writing/task2/grade", "writing/task2/rewrite", "writing/task1/chart", "writing/task2/ta"
PART1, FC = "speaking/part1/feedback", "speaking/common/fc"


def settings(**values) -> Settings:
    return Settings(_env_file=None, **values)


def runtime(**sections) -> RuntimeConfig:
    return RuntimeConfig.model_validate(sections)


def values(params):
    return {key: (p.value, p.source) for key, p in params.items()}


def test_no_override_keeps_the_old_rules():
    s = settings(rewrite_llm_model="env-rewrite", grade_llm_model="env-grade", vision_llm_model="env-vision")
    config = {"model": "lf-model", "temperature": 0.3, "max_tokens": 1234}
    assert values(resolve_prompt_params(TA2, config, s))["model"] == ("lf-model", "langfuse")
    assert values(resolve_prompt_params(REWRITE, config, s))["model"] == ("env-rewrite", "env")
    assert values(resolve_prompt_params(GRADE, config, s))["model"] == ("env-grade", "env")
    assert values(resolve_prompt_params(CHART, config, s))["model"] == ("env-vision", "env")
    assert values(resolve_prompt_params(TA2, config, s))["temperature"] == (0.3, "langfuse")
    assert values(resolve_prompt_params(TA2, config, s))["max_tokens"] == (1234, "langfuse")


def test_defaults_and_their_sources():
    s = settings()
    assert values(resolve_prompt_params(TA2, {}, s)) == {
        "model": ("qwen-flash", "default"), "temperature": (0.0, "default"), "max_tokens": (2000, "default")}
    assert values(resolve_prompt_params(REWRITE, {}, s))["max_tokens"] == (4000, "default")
    assert values(resolve_prompt_params(CHART, {}, s))["max_tokens"] == (1500, "default")
    assert values(resolve_prompt_params(TA2, {}, settings(default_llm_model="x")))["model"] == ("x", "env")


def test_speaking_reports_keep_using_the_default_model_unless_overridden():
    s = settings()
    config = {"model": "lf-model"}
    assert values(resolve_prompt_params(PART1, config, s))["model"] == ("qwen-flash", "default")
    assert values(resolve_prompt_params(FC, config, s))["model"] == ("lf-model", "langfuse")


def test_app_override_wins_over_env_and_langfuse_only_for_its_step():
    s = settings(rewrite_llm_model="env-rewrite")
    rt = runtime(steps={"writing_rewrite": {"model": "app-model", "temperature": 0.0, "max_tokens": 777}})
    rewrite = values(resolve_prompt_params(REWRITE, {"model": "lf"}, s, rt))
    assert rewrite == {"model": ("app-model", "app"), "temperature": (0.0, "app"), "max_tokens": (777, "app")}
    other = values(resolve_prompt_params(TA2, {"model": "lf"}, s, rt))
    assert other["model"] == ("lf", "langfuse")


def test_partial_override_changes_only_the_given_fields():
    rt = runtime(steps={"writing_criteria": {"temperature": 0.5}})
    params = values(resolve_prompt_params(TA2, {"model": "lf", "temperature": 0.1}, settings(), rt))
    assert params["model"] == ("lf", "langfuse") and params["temperature"] == (0.5, "app")


class FakeLangfuse:
    def __init__(self, config):
        self.config = config

    def get_prompt(self, **kwargs):
        return SimpleNamespace(config=self.config, version=3, compile=lambda **v: [{"role": "user", "content": "hi"}])


@pytest.fixture
def manager(monkeypatch):
    monkeypatch.setattr(pm_module, "get_langfuse_client", lambda: FakeLangfuse({"model": "lf", "max_tokens": 900}))
    monkeypatch.setattr(pm_module, "get_settings", lambda: settings())
    return pm_module.PromptManager()


def test_prompt_manager_applies_the_override_and_records_sources(manager):
    plain = manager.get_agent_prompt("ta", title="t", essay="e")
    assert (plain.model, plain.max_tokens, plain.sources["model"]) == ("lf", 900, "langfuse")

    rt = rrc.RequestRuntime(runtime(steps={"writing_criteria": {"model": "app-model"}}))
    with rrc.bound_runtime(rt):
        compiled = manager.get_agent_prompt("ta", title="t", essay="e")
        manager.get_agent_prompt("cc", title="t", essay="e")
    assert compiled.model == "app-model" and compiled.sources["model"] == "app"
    assert compiled.max_tokens == 900                      # untouched fields stay as before
    assert rt.used_models == {"writing/task2/ta": "app-model", "writing/common/cc": "app-model"}


def test_prompt_manager_reads_override_after_the_ttl_change_only_through_the_snapshot(manager):
    rt = rrc.RequestRuntime(runtime(steps={"writing_task2_grade": {"model": "snap"}}))
    with rrc.bound_runtime(rt):
        assert manager.get_grade_prompt().model == "snap"
        assert manager.get_chart_prompt("t").model == "qwen3.7-plus"      # other step: VISION_LLM_MODEL default


def test_llm_client_uses_app_key_and_timeout_and_caches_per_triple(monkeypatch):
    monkeypatch.setattr(llm_client, "get_settings", lambda: settings(qwen_api_key="env-key", llm_timeout_seconds=50))
    llm_client.build_async_client.cache_clear()
    plain = llm_client.get_async_llm_client()
    assert plain.api_key == "env-key" and plain.timeout == 50
    assert llm_client.get_async_llm_client() is plain

    rt = rrc.RequestRuntime(runtime(llm={"timeout_seconds": 90}, keys={"dashscope": "app-key"}))
    with rrc.bound_runtime(rt):
        changed = llm_client.get_async_llm_client()
        assert changed.api_key == "app-key" and changed.timeout == 90 and changed is not plain
        assert llm_client.get_sync_llm_client().api_key == "app-key"
    assert llm_client.get_async_llm_client() is plain       # the old client was never touched


def test_enable_thinking_comes_from_the_snapshot(monkeypatch):
    monkeypatch.setattr(llm_client, "get_settings", lambda: settings())
    assert llm_client.llm_extra_body() == {"enable_thinking": False}
    with rrc.bound_runtime(rrc.RequestRuntime(runtime(llm={"enable_thinking": True}))):
        assert llm_client.llm_extra_body() == {"enable_thinking": True}


def test_jev_uses_app_key_model_and_timeout(monkeypatch):
    monkeypatch.setattr(jev_client, "get_settings", lambda: settings(typesafe_api_key="", jev_model="env-jev"))
    assert not jev_client.is_configured()
    sent = {}

    def fake_post(url, headers, json, timeout):
        sent.update(headers=headers, model=json["model"], timeout=timeout)
        return SimpleNamespace(raise_for_status=lambda: None,
                               json=lambda: {"answers": {"essay_type": {"choice": "Opinion"}}})

    monkeypatch.setattr(jev_client.httpx, "post", fake_post)
    rt = rrc.RequestRuntime(runtime(jev={"model": "app-jev", "timeout_seconds": 9}, keys={"typesafe": "app-ts"}))
    with rrc.bound_runtime(rt):
        assert jev_client.is_configured()
        assert jev_client.choose_essay_type("title", {"Opinion": "x"}) == "Opinion"
    assert sent == {"headers": {"Authorization": "Bearer app-ts"}, "model": "app-jev", "timeout": 9}
