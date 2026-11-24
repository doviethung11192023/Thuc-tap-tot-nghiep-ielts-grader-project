"""Prompt admin (mock Langfuse): list, detail, new version without label, production label, validation."""
from types import SimpleNamespace

from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient

from api import admin_routes
import main
from services.langfuse import prompt_admin as pa
from services.langfuse.prompt_registry import ALL_PROMPT_NAMES

NAME = "writing/task2/ta"
SECRET = "test-engine-secret"


class NotFound(Exception):
    status_code = 404


def message(role, content):
    return SimpleNamespace(role=role, content=content, model_dump=lambda exclude_none=True: {"role": role, "content": content})


def version(number, labels, text="Grade {{essay}} for {{ title }}", config=None):
    return SimpleNamespace(name=NAME, version=number, labels=labels, config=config or {"model": "m"}, type="chat",
                           prompt=[message("system", text)], model_extra={"createdAt": "2026-11-01T00:00:00Z"})


class FakeClient:
    def __init__(self, versions):
        self.versions = {v.version: v for v in versions}
        self.created, self.updated, self.cache_cleared = [], [], 0
        outer = self
        self.api = SimpleNamespace(prompts=SimpleNamespace(get=outer._get, list=outer._list))

    def _get(self, name, version=None, label=None):
        # Như Langfuse thật: tên có "/" phải được mã hoá URL, tên thô trả 404 (lỗi gặp khi nghiệm thu 2026-11-22)
        if name != quote(NAME, safe=""):
            raise NotFound()
        if version is not None:
            found = self.versions.get(version)
        else:
            found = next((v for v in self.versions.values() if label in v.labels), None)
        if found is None:
            raise NotFound()
        return found

    def _list(self, page, limit):
        meta = SimpleNamespace(name=NAME, versions=list(self.versions))
        return SimpleNamespace(data=[meta], meta=SimpleNamespace(total_pages=1))

    def create_prompt(self, **kwargs):
        self.created.append(kwargs)
        return SimpleNamespace(version=max(self.versions) + 1)

    def update_prompt(self, **kwargs):
        self.updated.append(kwargs)

    def clear_prompt_cache(self):
        self.cache_cleared += 1


@pytest.fixture
def fake():
    return FakeClient([version(1, []), version(2, ["production"]), version(3, [])])


def test_overview_lists_every_registered_prompt(fake):
    items = pa.list_prompts(fake)
    assert [i["name"] for i in items] == list(ALL_PROMPT_NAMES)
    ta = next(i for i in items if i["name"] == NAME)
    assert ta["production_version"] == 2 and ta["step"] == "writing_criteria"
    assert ta["required_variables"] == ["essay", "title"]
    assert [v["version"] for v in ta["versions"]] == [3, 2, 1]
    assert [v["is_production"] for v in ta["versions"]] == [False, True, False]
    assert ta["versions"][0]["created_at"] == "2026-11-01T00:00:00Z"
    other = next(i for i in items if i["name"] == "writing/common/cc")
    assert other["production_version"] is None and other["versions"] == []


def test_detail_defaults_to_production_and_rejects_unknown(fake):
    detail = pa.get_prompt_detail(NAME, None, fake)
    assert detail["version"] == 2 and detail["prompt"][0]["role"] == "system" and detail["config"] == {"model": "m"}
    assert pa.get_prompt_detail(NAME, 1, fake)["labels"] == []
    with pytest.raises(pa.PromptVersionNotFound):
        pa.get_prompt_detail(NAME, 9, fake)
    with pytest.raises(pa.PromptNotRegistered):
        pa.get_prompt_detail("not/registered", 1, fake)


def test_new_version_has_no_label_and_keeps_required_variables(fake):
    result = pa.create_version(NAME, [{"role": "system", "content": "New {{essay}} and {{title}}"}],
                               {"model": "m2", "temperature": 0.1}, fake)
    assert result == {"name": NAME, "version": 4}
    sent = fake.created[0]
    assert sent["labels"] == [] and sent["type"] == "chat" and sent["config"] == {"model": "m2", "temperature": 0.1}


@pytest.mark.parametrize("messages,config,reason", [
    ([{"role": "system", "content": "no variables"}], {}, "Missing variables"),
    ([{"role": "system", "content": "{{essay}} only"}], {}, "{{title}}"),
    ([{"role": "robot", "content": "{{essay}} {{title}}"}], {}, "role"),
    ([{"role": "system", "content": "   "}], {}, "role"),
    ([{"role": "system", "content": "{{essay}} {{title}}"}], {"temperature": "hot"}, "temperature"),
    ([{"role": "system", "content": "{{essay}} {{title}}"}], {"max_tokens": 1.5}, "max_tokens"),
])
def test_invalid_versions_are_rejected_without_calling_langfuse(fake, messages, config, reason):
    with pytest.raises(pa.PromptValidationError) as error:
        pa.create_version(NAME, messages, config, fake)
    assert reason in str(error.value) and fake.created == []


def test_new_version_of_unregistered_prompt_is_rejected(fake):
    with pytest.raises(pa.PromptNotRegistered):
        pa.create_version("evil/prompt", [{"role": "user", "content": "x"}], {}, fake)


def test_set_production_moves_the_label_and_clears_the_cache(fake):
    result = pa.set_production(NAME, 3, fake)
    assert result == {"name": NAME, "previous_version": 2, "version": 3}
    assert fake.updated == [{"name": NAME, "version": 3, "new_labels": ["production"]}] and fake.cache_cleared == 1
    with pytest.raises(pa.PromptVersionNotFound):
        pa.set_production(NAME, 99, fake)


def test_langfuse_error_becomes_unavailable(fake):
    def boom(*args, **kwargs):
        raise ConnectionError("down")

    fake.api.prompts.get = boom
    with pytest.raises(pa.LangfuseUnavailable):
        pa.get_prompt_detail(NAME, 1, fake)


# ── routes ───────────────────────────────────────────────────────────────────
@pytest.fixture
def http(monkeypatch, fake):
    for name in ("warm_up_nlp_tools", "load_stt_model", "load_phoneme_model"):
        monkeypatch.setattr(main, name, lambda: None)
    monkeypatch.setattr(main.get_settings(), "ai_engine_secret", SECRET)
    monkeypatch.setattr(pa, "get_langfuse_client", lambda: fake)
    with TestClient(main.app, headers={"X-AI-Engine-Secret": SECRET}) as client:
        yield client


def test_routes_status_codes(http, fake):
    ok = http.post("/admin/prompts/versions", json={"name": NAME, "config": {},
                                                     "prompt": [{"role": "system", "content": "{{essay}} {{title}}"}]})
    assert ok.status_code == 201 and ok.json() == {"name": NAME, "version": 4}
    bad = http.post("/admin/prompts/versions", json={"name": NAME, "prompt": [{"role": "system", "content": "x"}]})
    assert bad.status_code == 422 and "Missing variables" in bad.json()["detail"]
    assert http.get("/admin/prompts/detail", params={"name": "nope", "version": 1}).status_code == 404
    assert http.get("/admin/prompts/detail", params={"name": NAME, "version": 1}).json()["version"] == 1
    assert http.put("/admin/prompts/production", json={"name": NAME, "version": 3}).json()["previous_version"] == 2
    assert len(http.get("/admin/prompts").json()) == len(ALL_PROMPT_NAMES)


def test_every_admin_route_needs_the_engine_secret(http):
    routes = [("get", "/admin/prompts"), ("get", "/admin/prompts/detail?name=x"), ("get", "/admin/services/health"),
              ("get", "/admin/services/effective-config"), ("post", "/admin/runtime-config/refresh"),
              ("post", "/admin/services/test"), ("post", "/admin/prompts/versions"),
              ("put", "/admin/prompts/production"), ("post", "/admin/traces/delete"),
              ("post", "/admin/traces/scores")]
    for method, url in routes:
        assert getattr(http, method)(url, headers={"X-AI-Engine-Secret": "wrong"}).status_code == 403, url
    paths = {route.path for route in admin_routes.router.routes}
    assert {url.split("?")[0] for _, url in routes} == paths
