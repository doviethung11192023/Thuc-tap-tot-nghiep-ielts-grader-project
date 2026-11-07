"""Classifier order: Jev, then the Qwen prompt, then Unknown. No default type."""
from types import SimpleNamespace

import httpx
import pytest

from services import jev_client, task_type_classifier as classifier

OPTIONS = {"Opinion": "one claim", "Discussion": "two views"}


class FakePromptManager:
    def __init__(self, fail=False):
        self.fail = fail

    def get_classify_prompt(self, title):
        if self.fail:
            raise RuntimeError("langfuse down")
        return SimpleNamespace(langfuse_prompt=SimpleNamespace(config={"options": OPTIONS}))


@pytest.fixture
def setup(monkeypatch):
    settings = SimpleNamespace(
        essay_classifier="jev", typesafe_api_key="key", jev_model="jev-latest", jev_timeout_seconds=1
    )
    monkeypatch.setattr(classifier, "get_settings", lambda: settings)
    monkeypatch.setattr(jev_client, "get_settings", lambda: settings)
    monkeypatch.setattr(classifier, "get_prompt_manager", lambda: FakePromptManager())
    return SimpleNamespace(settings=settings, monkeypatch=monkeypatch)


def stub(setup, jev=None, qwen=None):
    setup.monkeypatch.setattr(jev_client, "choose_essay_type", lambda title, options: jev)

    def fake_qwen(compiled):
        if isinstance(qwen, Exception):
            raise qwen
        return qwen

    setup.monkeypatch.setattr(classifier, "_classify_with_prompt", fake_qwen)


def test_jev_answers_first(setup):
    stub(setup, jev="Discussion", qwen="Opinion")
    result = classifier.classify_task_type("Discuss both views.")
    assert (result.task_type, result.classifier) == ("Discussion", "jev")


def test_falls_back_to_qwen_when_jev_fails(setup):
    stub(setup, jev=None, qwen="Opinion")
    result = classifier.classify_task_type("Do you agree?")
    assert (result.task_type, result.classifier) == ("Opinion", "qwen")


def test_missing_key_skips_jev(setup, monkeypatch):
    setup.settings.typesafe_api_key = ""
    stub(setup, jev="Discussion", qwen="Opinion")
    assert classifier.classify_task_type("Do you agree?").classifier == "qwen"


def test_setting_can_turn_jev_off(setup):
    setup.settings.essay_classifier = "qwen"
    stub(setup, jev="Discussion", qwen="Opinion")
    assert classifier.classify_task_type("Do you agree?").classifier == "qwen"


def test_no_valid_answer_is_unknown_and_never_opinion(setup):
    stub(setup, jev=None, qwen=RuntimeError("boom"))
    result = classifier.classify_task_type("Do you agree?")
    assert (result.task_type, result.classifier, result.description) == ("Unknown", "none", "")


def test_empty_title_is_unknown(setup):
    stub(setup, jev="Opinion", qwen="Opinion")
    assert classifier.classify_task_type("  ").task_type == "Unknown"


def test_prompt_outage_is_unknown(setup, monkeypatch):
    monkeypatch.setattr(classifier, "get_prompt_manager", lambda: FakePromptManager(fail=True))
    stub(setup, jev="Opinion", qwen="Opinion")
    assert classifier.classify_task_type("Do you agree?").task_type == "Unknown"


def jev_transport(setup, response=None, error=None):
    sent = {}

    def fake_post(url, **kwargs):
        sent.update(kwargs, url=url)
        if error:
            raise error
        return response

    setup.monkeypatch.setattr(jev_client.httpx, "post", fake_post)
    return sent


def jev_response(body, status=200):
    return httpx.Response(status, json=body, request=httpx.Request("POST", "https://x"))


def test_jev_sends_the_title_and_the_options_only(setup):
    body = {"answers": {"essay_type": {"choice": "Opinion"}}}
    sent = jev_transport(setup, jev_response(body))
    assert jev_client.choose_essay_type("Do you agree?", OPTIONS) == "Opinion"
    assert sent["json"]["state"] == "Do you agree?"
    assert set(sent["json"]) == {"state", "model", "questions"}
    assert sent["json"]["questions"]["essay_type"]["criteria"] == OPTIONS
    assert sent["headers"]["Authorization"] == "Bearer key"


@pytest.mark.parametrize("response", [
    jev_response({"answers": {"essay_type": {"choice": "Poetry"}}}),
    jev_response({"unexpected": True}),
    jev_response({}, status=429),
    jev_response({}, status=403),
])
def test_jev_rejects_bad_answers(setup, response):
    jev_transport(setup, response)
    assert jev_client.choose_essay_type("Do you agree?", OPTIONS) is None


def test_jev_timeout_returns_none(setup):
    jev_transport(setup, error=httpx.ReadTimeout("slow"))
    assert jev_client.choose_essay_type("Do you agree?", OPTIONS) is None
