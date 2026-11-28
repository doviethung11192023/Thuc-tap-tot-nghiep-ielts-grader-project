"""Health and effective-config endpoints: parallel checks, no model loading, sources, no full keys."""
import asyncio
import time
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

import main
from services.service_admin import effective_config as ec
from services.service_admin import service_health as sh
from services.service_admin.service_test_call import ServiceTestRequest
from services.speaking import phoneme_recognizer, speech_transcriber
from services.runtime_config import request_runtime_config as rrc
from services.runtime_config import runtime_config_client as rcc
from services.runtime_config.runtime_config_model import RuntimeConfig
from settings.config import Settings

SECRET = "test-engine-secret"


@pytest.fixture
def settings(monkeypatch):
    values = Settings(_env_file=None, qwen_api_key="env-llm-key-ab12", typesafe_api_key="", langfuse_public_key="pk",
                      langfuse_secret_key="sk-lf", default_llm_model="qwen-flash")
    for module in (sh, ec):
        monkeypatch.setattr(module, "get_settings", lambda: values)
    monkeypatch.setattr("services.llm.llm_client.get_settings", lambda: values)
    monkeypatch.setattr("services.writing.jev_client.get_settings", lambda: values)
    return values


def test_local_checks_only_read_module_variables(monkeypatch, settings):
    def forbidden(*args, **kwargs):
        raise AssertionError("health must not load a model")

    for module in (speech_transcriber, phoneme_recognizer):
        monkeypatch.setattr(module, "load_model", forbidden)
    monkeypatch.setattr(speech_transcriber, "_get_model", forbidden)
    monkeypatch.setattr(phoneme_recognizer, "_load", forbidden)

    monkeypatch.setattr(speech_transcriber, "_model", None)
    monkeypatch.setattr(phoneme_recognizer, "_model", SimpleNamespace(device="cuda"))
    monkeypatch.setattr(sh, "_load_failures", {})
    assert sh._check_whisper()["status"] == "not_loaded"
    assert sh._check_phoneme()["status"] == "loaded" and "cuda" in sh._check_phoneme()["detail"]

    sh.record_load_failure("whisper", RuntimeError("no gpu"))
    assert sh._check_whisper()["status"] == "error" and "no gpu" in sh._check_whisper()["error"]
    monkeypatch.setattr(speech_transcriber, "_model", SimpleNamespace(model=SimpleNamespace(device="cpu",
                                                                                             compute_type="int8")))
    assert sh._check_whisper()["detail"] == f"{settings.speech_stt_model} · cpu · int8"


def test_network_checks_run_in_parallel_and_time_out(monkeypatch, settings):
    async def slow_test(req: ServiceTestRequest):
        await asyncio.sleep(0.3)
        return {"ok": True, "latency_ms": 300, "error": None}

    monkeypatch.setattr(sh, "run_service_test", slow_test)
    monkeypatch.setattr(sh, "CHECK_TIMEOUT_SECONDS", 0.2)
    monkeypatch.setattr(sh, "get_langfuse_client", lambda: SimpleNamespace(auth_check=lambda: True))
    monkeypatch.setattr(sh, "get_runtime_config_client", lambda: SimpleNamespace(refresh=lambda: {
        "source": "env", "last_ok_at": None, "last_error": "ConnectionError: refused"}))
    started = time.perf_counter()
    result = asyncio.run(sh.check_health("all"))
    assert time.perf_counter() - started < 0.45
    by_name = {item["service"]: item for item in result["services"]}
    assert set(by_name) == set(sh.SERVICES)
    assert by_name["llm"]["status"] == "timeout"
    assert by_name["jev"]["status"] == "not_configured"
    assert by_name["langfuse"]["status"] == "ok" and by_name["langfuse"]["latency_ms"] is not None
    assert by_name["config_sync"]["status"] == "env_fallback" and "refused" in by_name["config_sync"]["error"]
    assert result["checked_at"]


def test_single_service_and_status_mapping(monkeypatch, settings):
    async def failing_test(req):
        return {"ok": False, "latency_ms": 12, "error": "APITimeoutError: Request timed out"}

    monkeypatch.setattr(sh, "run_service_test", failing_test)
    only = asyncio.run(sh.check_health("llm"))
    assert [s["service"] for s in only["services"]] == ["llm"] and only["services"][0]["status"] == "timeout"
    assert only["services"][0]["detail"] == "qwen-flash"

    def broken_auth():
        raise RuntimeError("401 sk-lf-secret rejected")

    monkeypatch.setattr(sh, "get_langfuse_client", lambda: SimpleNamespace(auth_check=broken_auth))
    result = asyncio.run(sh.check_health("langfuse"))["services"][0]
    assert result["status"] == "error" and "sk-lf" not in result["error"]


def test_config_sync_error_with_an_older_good_config(monkeypatch, settings):
    monkeypatch.setattr(sh, "get_runtime_config_client", lambda: SimpleNamespace(refresh=lambda: {
        "source": "core", "last_ok_at": "2026-11-22T00:00:00Z", "last_error": "HTTPStatusError: 500"}))
    assert asyncio.run(sh.check_health("config_sync"))["services"][0]["status"] == "error"


# ── effective config ─────────────────────────────────────────────────────────
class FakeManager:
    configs = {"writing/task2/ta": {"model": "lf-ta"}, "writing/common/cc": {"model": "lf-cc", "temperature": 0.4}}

    def _fetch(self, name):
        if name == "writing/task1/keycheck":
            raise RuntimeError("unavailable")
        return SimpleNamespace(config=self.configs.get(name, {"model": "lf-default"}))


def test_effective_config_shape_sources_and_no_full_key(monkeypatch, settings):
    monkeypatch.setattr(ec, "get_prompt_manager", lambda: FakeManager())
    runtime = RuntimeConfig.model_validate({
        "steps": {"writing_rewrite": {"model": "app-model", "max_tokens": 3000}},
        "llm": {"timeout_seconds": 90}, "jev": {"model": "app-jev"}, "keys": {"dashscope": "app-secret-key-zzzz"}})
    monkeypatch.setattr(ec, "get_runtime_config_client", lambda: SimpleNamespace(
        get=lambda: runtime, status=lambda: {"source": "core", "last_ok_at": "t", "last_error": None}))
    result = ec.build_effective_config()

    steps = {s["step"]: s for s in result["steps"]}
    assert list(steps) == ["writing_criteria", "writing_task2_grade", "writing_rewrite", "writing_vision",
                           "writing_classify", "writing_keycheck", "writing_material", "speaking_grading"]
    assert steps["writing_rewrite"]["model"] == {"value": "app-model", "source": "app"}
    assert steps["writing_rewrite"]["max_tokens"] == {"value": 3000, "source": "app"}
    assert steps["writing_rewrite"]["temperature"] == {"value": 0.0, "source": "default"}
    assert "per_prompt" not in steps["writing_rewrite"]
    criteria = steps["writing_criteria"]
    assert {p["name"]: p["model"] for p in criteria["per_prompt"]}["writing/common/cc"] == "lf-cc"
    assert "per_prompt" in criteria and "note" in criteria
    assert "Không đọc được" in steps["writing_keycheck"]["note"]
    assert result["llm"]["timeout_seconds"] == {"value": 90, "source": "app"}
    assert result["llm"]["enable_thinking"] == {"value": False, "source": "default"}
    assert result["jev"]["model"] == {"value": "app-jev", "source": "app"}
    assert result["jev"]["timeout_seconds"]["source"] == "default"
    assert result["env_keys"] == {"dashscope": {"configured": True, "last4": "ab12"},
                                  "typesafe": {"configured": False, "last4": None}}
    assert result["config_sync"] == {"source": "core", "last_ok_at": "t", "last_error": None}
    assert "app-secret-key-zzzz" not in str(result) and "env-llm-key-ab12" not in str(result)


def test_refresh_and_health_routes(monkeypatch, settings):
    for name in ("warm_up_nlp_tools", "load_stt_model", "load_phoneme_model"):
        monkeypatch.setattr(main, name, lambda: None)
    monkeypatch.setattr(main.get_settings(), "ai_engine_secret", SECRET)
    ok = rcc.RuntimeConfigClient(fetcher=lambda: {"version": "v9"})
    rcc.set_runtime_config_client(ok)
    with TestClient(main.app, headers={"X-AI-Engine-Secret": SECRET}) as client:
        body = client.post("/admin/runtime-config/refresh").json()
        assert body["source"] == "core" and body["version"] == "v9" and body["fetched_at"] and "error" not in body

        def down():
            raise ConnectionError("core down")

        rcc.set_runtime_config_client(rcc.RuntimeConfigClient(fetcher=down))
        body = client.post("/admin/runtime-config/refresh").json()
        assert body["source"] == "env" and "core down" in body["error"]
        assert client.get("/admin/services/health", params={"service": "whisper"}).json()["services"][0]["service"] \
            == "whisper"
        assert client.get("/admin/services/health", params={"service": "bogus"}).status_code == 422


def test_admin_routes_need_the_secret_even_when_allow_no_secret_is_on(monkeypatch):
    """ALLOW_NO_SECRET chỉ mở route chấm cho máy local, không bao giờ mở route quản trị (đổi prompt, xoá trace)."""
    from fastapi.testclient import TestClient
    from main import app
    from settings.config import get_settings
    settings = get_settings()
    monkeypatch.setattr(settings, "ai_engine_secret", "")
    monkeypatch.setattr(settings, "allow_no_secret", True)
    client = TestClient(app)
    assert client.get("/admin/services/health").status_code == 503
    assert client.post("/admin/traces/delete", json={"trace_ids": ["x"]}).status_code == 503
    monkeypatch.setattr(settings, "ai_engine_secret", "s3cret")
    assert client.put("/admin/prompts/production", json={"name": "writing/common/cc", "version": 1}).status_code == 403
