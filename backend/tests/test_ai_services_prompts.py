"""Proxy prompt: Core kiểm model cho phép, ghi audit khi thành công, engine lỗi thì 502 và không ghi (US5)."""
from ai_services_test_support import as_role, audit_rows, client, fake_db, fake_engine  # noqa: F401
from app.clients.ai_engine import admin_client as engine_client

BASE = "/api/v1/admin/prompts"
BODY = {"name": "writing/task2/grade", "prompt": [{"role": "system", "content": "Hi {{essay}}"}],
        "config": {"model": "qwen3.7-plus", "temperature": 0.1}}


def test_list_and_detail_are_forwarded(client, fake_engine):
    fake_engine.routes[("GET", "/admin/prompts")] = [{"name": "writing/task2/grade", "production_version": 3}]
    fake_engine.routes[("GET", "/admin/prompts/detail")] = {"name": "writing/task2/grade", "version": 2}
    assert client.get(BASE).json()["data"][0]["production_version"] == 3
    assert client.get(f"{BASE}/detail", params={"name": "writing/task2/grade", "version": 2}).json()["data"]["version"] == 2
    assert fake_engine.by_path("/admin/prompts/detail")[0]["params"] == {"name": "writing/task2/grade", "version": 2}


def test_create_version_audits_on_success(client, fake_db, fake_engine):
    fake_engine.routes[("POST", "/admin/prompts/versions")] = {"name": "writing/task2/grade", "version": 8}
    response = client.post(f"{BASE}/versions", json=BODY)
    assert response.status_code == 201 and response.json()["data"]["version"] == 8
    assert fake_engine.by_path("/admin/prompts/versions")[0]["json"]["config"]["model"] == "qwen3.7-plus"
    audit = audit_rows(fake_db, "create_prompt_version")[0]
    assert audit["entity"] == "prompts" and audit["entity_id"] == "writing/task2/grade"
    assert audit["after"] == {"name": "writing/task2/grade", "version": 8}


def test_model_outside_price_table_is_rejected_without_calling_engine(client, fake_db, fake_engine):
    response = client.post(f"{BASE}/versions", json={**BODY, "config": {"model": "gpt-unknown"}})
    assert response.status_code == 422 and "gpt-unknown" in response.json()["detail"]
    assert not fake_engine.by_path("/admin/prompts/versions") and not audit_rows(fake_db)


def test_config_without_model_is_allowed(client, fake_engine):
    fake_engine.routes[("POST", "/admin/prompts/versions")] = {"name": "n", "version": 1}
    assert client.post(f"{BASE}/versions", json={**BODY, "config": {"temperature": 0.3}}).status_code == 201


def test_engine_validation_reason_is_passed_through_without_audit(client, fake_db, fake_engine):
    fake_engine.routes[("POST", "/admin/prompts/versions")] = engine_client.AiEngineHttpError(
        422, "Thiếu biến bắt buộc: essay")
    response = client.post(f"{BASE}/versions", json=BODY)
    assert response.status_code == 422 and response.json()["detail"] == "Thiếu biến bắt buộc: essay"
    assert not audit_rows(fake_db)


def test_engine_down_or_langfuse_error_is_502_without_audit(client, fake_db, fake_engine):
    fake_engine.routes[("POST", "/admin/prompts/versions")] = engine_client.AiEngineUnavailable("down")
    fake_engine.routes[("PUT", "/admin/prompts/production")] = engine_client.AiEngineHttpError(500, "langfuse boom")
    first = client.post(f"{BASE}/versions", json=BODY)
    second = client.put(f"{BASE}/production", json={"name": "writing/task2/grade", "version": 2})
    assert first.status_code == second.status_code == 502
    assert first.json()["detail"] == "Không kết nối được Langfuse/AI engine" and "boom" not in second.text
    assert not audit_rows(fake_db)


def test_set_production_audits_previous_and_new_version(client, fake_db, fake_engine):
    fake_engine.routes[("PUT", "/admin/prompts/production")] = {
        "name": "writing/task2/grade", "previous_version": 3, "version": 2}
    assert client.put(f"{BASE}/production", json={"name": "writing/task2/grade", "version": 2}).status_code == 200
    audit = audit_rows(fake_db, "set_prompt_production")[0]
    assert audit["before"] == {"version": 3} and audit["after"] == {"version": 2}


def test_learner_and_expert_are_forbidden(client):
    for role in ("learner", "expert"):
        as_role(role)
        assert client.get(BASE).status_code == 403
        assert client.post(f"{BASE}/versions", json=BODY).status_code == 403
        assert client.put(f"{BASE}/production", json={"name": "n", "version": 1}).status_code == 403
