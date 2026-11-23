"""Runtime config client: TTL, last good config, .env fallback, per-request snapshot, key redaction."""
import asyncio
from types import SimpleNamespace

import pytest

from services.runtime_config import request_runtime_config as rrc
from services.runtime_config import runtime_config_client as rcc
from services.runtime_config.runtime_config_model import RuntimeConfig
from services.runtime_config.secret_redaction import last4, redact_secrets

PAYLOAD = {"version": "v1", "steps": {"writing_rewrite": {"model": "m1", "temperature": 0.2},
                                       "not_a_step": {"model": "x"}},
           "llm": {"timeout_seconds": 90}, "jev": {}, "keys": {"dashscope": "sk-secret-1234", "typesafe": None}}


class Clock:
    now = 1000.0

    def __call__(self):
        return self.now


def make_client(responses):
    """responses: list of dicts or exceptions returned one per fetch."""
    calls = []
    clock = Clock()

    def fetch():
        calls.append(1)
        item = responses[min(len(calls), len(responses)) - 1]
        if isinstance(item, Exception):
            raise item
        return item

    return rcc.RuntimeConfigClient(fetcher=fetch, clock=clock), calls, clock


def test_fetch_is_cached_for_60_seconds():
    client, calls, clock = make_client([PAYLOAD])
    first = client.get()
    clock.now += 59
    assert client.get() is first and len(calls) == 1
    clock.now += 2
    client.get()
    assert len(calls) == 2


def test_parsing_drops_unknown_steps_and_hides_keys_in_repr():
    config = RuntimeConfig.model_validate(PAYLOAD)
    assert list(config.steps) == ["writing_rewrite"]
    assert config.keys.value("dashscope") == "sk-secret-1234" and config.keys.value("typesafe") is None
    assert "sk-secret-1234" not in repr(config) and "sk-secret-1234" not in config.model_dump_json()


def test_failed_fetch_keeps_last_good_config_and_retries_later():
    client, calls, clock = make_client([PAYLOAD, RuntimeError("core down"), PAYLOAD])
    good = client.get()
    clock.now += 61
    assert client.get() is good                       # fetch failed, last good config stays
    status = client.status()
    assert status["source"] == "core" and "core down" in status["last_error"]
    clock.now += 5
    client.get()
    assert len(calls) == 2                            # no retry inside the 15 s window
    clock.now += 15
    client.get()
    assert len(calls) == 3 and client.status()["last_error"] is None


def test_never_fetched_means_env_and_empty_config():
    client, _, _ = make_client([ConnectionError("refused")])
    config = client.get()
    assert config.steps == {} and config.keys.value("dashscope") is None
    assert client.status()["source"] == "env" and client.status()["version"] is None


def test_invalid_payload_counts_as_a_failed_fetch():
    client, _, _ = make_client([["not", "an", "object"]])
    client.get()
    assert client.status()["last_error"] and client.status()["source"] == "env"


def test_refresh_ignores_the_cache_and_reports_status():
    client, calls, _ = make_client([PAYLOAD])
    client.get()
    state = client.refresh()
    assert len(calls) == 2
    assert state["source"] == "core" and state["version"] == "v1" and state["fetched_at"]


def test_fetch_error_text_never_contains_the_engine_secret(monkeypatch):
    monkeypatch.setattr(rcc.get_settings(), "ai_engine_secret", "engine-secret-value")
    client, _, _ = make_client([RuntimeError("bad header engine-secret-value")])
    client.get()
    assert "engine-secret-value" not in client.status()["last_error"]


def test_snapshot_does_not_change_when_the_cache_changes():
    first = RuntimeConfig.model_validate(PAYLOAD)
    second = RuntimeConfig.model_validate({"steps": {"writing_rewrite": {"model": "m2"}}})
    client = SimpleNamespace(get=lambda: first, peek=lambda: first)
    rcc.set_runtime_config_client(client)

    async def request():
        await rrc.snapshot_for_request()
        before = rrc.current_runtime_config().step("writing_rewrite").model
        client.get = client.peek = lambda: second            # the cache refreshes mid-request
        await asyncio.sleep(0)
        return before, rrc.current_runtime_config().step("writing_rewrite").model

    assert asyncio.run(request()) == ("m1", "m1")
    rrc.clear_request_runtime()
    assert rrc.current_runtime_config().step("writing_rewrite").model == "m2"   # outside a request: the cache


def test_snapshot_is_visible_in_worker_threads():
    rcc.set_runtime_config_client(SimpleNamespace(get=lambda: RuntimeConfig.model_validate(PAYLOAD),
                                                  peek=lambda: RuntimeConfig()))

    async def request():
        await rrc.snapshot_for_request()
        return await asyncio.to_thread(lambda: rrc.current_runtime_config().llm.timeout_seconds)

    assert asyncio.run(request()) == 90


def test_redact_secrets():
    text = "Incorrect API key provided: sk-abcd****wxyz. key=my-private-key-9999"
    cleaned = redact_secrets(text, ["my-private-key-9999", None, ""])
    assert "sk-abcd" not in cleaned and "my-private-key-9999" not in cleaned
    assert last4("sk-1234567890ab") == "90ab" and last4("") is None
