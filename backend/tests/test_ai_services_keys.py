"""API key trong app: mã hoá, gọi thử trước khi lưu, quay về .env, và không bao giờ lộ key đầy đủ (SC-011, FR-045)."""
import json
import logging

from ai_services_test_support import (  # noqa: F401
    ADMIN_ID, ENV_KEY_LAST4, as_role, audit_rows, client, encryption_key, fake_db, fake_engine,
)
from app.clients import ai_engine_admin_client as engine_client
from app.services.ai_services.ai_secret_cipher import decrypt_secret

BASE = "/api/v1/admin/ai-services/keys"
NEW_KEY = "sk-secret-NEWKEY-abcdef0123456789"


def _secret_row(fake_db, provider="dashscope"):
    return next((r for r in fake_db.tables.get("ai_provider_secrets", []) if r["provider"] == provider), None)


def test_list_shows_env_key_masked_and_encryption_state(client, encryption_key):
    items = {i["provider"]: i for i in client.get(BASE).json()["data"]}
    dash, typesafe = items["dashscope"], items["typesafe"]
    assert (dash["configured"], dash["source"], dash["last4"]) == (True, "env", ENV_KEY_LAST4)
    assert (typesafe["configured"], typesafe["source"], typesafe["last4"]) == (False, "none", None)
    assert dash["encryption_ready"] is True and dash["label"] == "DashScope (LLM)"


def test_list_without_encryption_key_reports_not_ready(client):
    assert client.get(BASE).json()["data"][0]["encryption_ready"] is False


def test_replace_without_encryption_key_is_409_and_never_calls_engine(client, fake_engine):
    response = client.put(f"{BASE}/dashscope", json={"api_key": NEW_KEY})
    assert response.status_code == 409 and "mã hoá" in response.json()["detail"]
    assert not fake_engine.by_path("/admin/services/test")


def test_replace_tests_candidate_key_then_encrypts_and_refreshes(client, fake_db, fake_engine, encryption_key):
    response = client.put(f"{BASE}/dashscope", json={"api_key": f"  {NEW_KEY}  "})
    assert response.status_code == 200
    assert response.json()["data"] == {"provider": "dashscope", "last4": NEW_KEY[-4:], "source": "app"}
    assert fake_engine.by_path("/admin/services/test")[0]["json"] == {
        "kind": "llm", "api_key": NEW_KEY, "use_env_key": False}
    row = _secret_row(fake_db)
    assert NEW_KEY not in row["ciphertext"] and decrypt_secret(row["ciphertext"]) == NEW_KEY
    assert row["updated_by"] == ADMIN_ID and fake_engine.paths()[-1] == "/admin/runtime-config/refresh"
    audit = audit_rows(fake_db, "replace_ai_provider_key")[0]
    assert audit["before"] == {"last4": ENV_KEY_LAST4, "source": "env"}
    assert audit["after"] == {"last4": NEW_KEY[-4:], "source": "app"}


def test_typesafe_key_is_tested_as_jev(client, fake_engine, encryption_key):
    assert client.put(f"{BASE}/typesafe", json={"api_key": NEW_KEY}).status_code == 200
    assert fake_engine.by_path("/admin/services/test")[0]["json"]["kind"] == "jev"


def test_failed_test_call_saves_nothing_and_error_hides_key(client, fake_db, fake_engine, encryption_key):
    fake_engine.routes[("POST", "/admin/services/test")] = {
        "ok": False, "latency_ms": 9, "error": f"401 Incorrect API key provided: {NEW_KEY}"}
    response = client.put(f"{BASE}/dashscope", json={"api_key": NEW_KEY})
    assert response.status_code == 422 and NEW_KEY not in response.text
    assert _secret_row(fake_db) is None and not audit_rows(fake_db)


def test_engine_http_error_detail_hides_key(client, fake_engine, encryption_key):
    fake_engine.routes[("POST", "/admin/services/test")] = engine_client.AiEngineHttpError(
        400, f"bad request {NEW_KEY}")
    response = client.put(f"{BASE}/dashscope", json={"api_key": NEW_KEY})
    assert response.status_code == 422 and NEW_KEY not in response.text


def test_key_length_and_provider_validated(client, encryption_key):
    assert client.put(f"{BASE}/dashscope", json={"api_key": "short"}).status_code == 422
    assert client.put(f"{BASE}/dashscope", json={"api_key": "x" * 513}).status_code == 422
    assert client.put(f"{BASE}/openai", json={"api_key": NEW_KEY}).status_code == 404


def test_second_replace_records_previous_app_key_in_audit(client, fake_db, encryption_key):
    client.put(f"{BASE}/dashscope", json={"api_key": NEW_KEY})
    client.put(f"{BASE}/dashscope", json={"api_key": "sk-second-key-0000000000ZZ99"})
    audits = audit_rows(fake_db, "replace_ai_provider_key")
    assert audits[1]["before"] == {"last4": NEW_KEY[-4:], "source": "app"}
    assert [i["source"] for i in client.get(BASE).json()["data"]][0] == "app"


def test_no_response_log_or_audit_contains_full_key_or_ciphertext(client, fake_db, fake_engine, encryption_key, caplog):
    """SC-011: quét mọi thứ trình duyệt, log và audit nhìn thấy trong luồng thay key, gọi thử lỗi và quay về."""
    caplog.set_level(logging.DEBUG)
    seen = [client.get(BASE).text]
    fake_engine.routes[("POST", "/admin/services/test")] = {"ok": False, "latency_ms": 1, "error": f"bad {NEW_KEY}"}
    seen.append(client.put(f"{BASE}/dashscope", json={"api_key": NEW_KEY}).text)
    fake_engine.routes[("POST", "/admin/services/test")] = {"ok": True, "latency_ms": 1, "error": None}
    seen.append(client.put(f"{BASE}/dashscope", json={"api_key": NEW_KEY}).text)
    ciphertext = _secret_row(fake_db)["ciphertext"]
    seen += [client.get(BASE).text, client.delete(f"{BASE}/dashscope").text]
    seen.append(json.dumps(audit_rows(fake_db)))
    seen.append(caplog.text)
    for text in seen:
        assert NEW_KEY not in text and ciphertext not in text
    assert len(audit_rows(fake_db)) == 2   # thay key + quay về; lần gọi thử lỗi không ghi


def test_revert_to_env_tests_env_key_deletes_row_and_audits(client, fake_db, fake_engine, encryption_key):
    client.put(f"{BASE}/dashscope", json={"api_key": NEW_KEY})
    fake_engine.calls.clear()
    response = client.delete(f"{BASE}/dashscope")
    assert response.status_code == 200 and _secret_row(fake_db) is None
    assert fake_engine.by_path("/admin/services/test")[0]["json"] == {
        "kind": "llm", "api_key": None, "use_env_key": True}
    audit = audit_rows(fake_db, "revert_ai_provider_key")[0]
    assert audit["before"] == {"last4": NEW_KEY[-4:], "source": "app"}
    assert audit["after"] == {"last4": ENV_KEY_LAST4, "source": "env"}
    assert fake_engine.paths()[-1] == "/admin/runtime-config/refresh"


def test_revert_is_refused_when_env_key_missing(client, fake_db, fake_engine, encryption_key):
    client.put(f"{BASE}/dashscope", json={"api_key": NEW_KEY})
    fake_engine.routes[("POST", "/admin/services/test")] = {"ok": False, "latency_ms": 1, "error": "env_key_missing"}
    response = client.delete(f"{BASE}/dashscope")
    assert response.status_code == 422 and ".env" in response.json()["detail"]
    assert _secret_row(fake_db) is not None and not audit_rows(fake_db, "revert_ai_provider_key")


def test_revert_without_app_key_is_404(client):
    assert client.delete(f"{BASE}/dashscope").status_code == 404


def test_list_when_engine_down_does_not_pretend_env_key(client, fake_engine):
    fake_engine.routes[("GET", "/admin/services/effective-config")] = engine_client.AiEngineUnavailable("down")
    dash = client.get(BASE).json()["data"][0]
    assert dash["env_known"] is False and dash["source"] == "none"


def test_learner_and_expert_are_forbidden(client, encryption_key):
    for role in ("learner", "expert"):
        as_role(role)
        assert client.get(BASE).status_code == 403
        assert client.put(f"{BASE}/dashscope", json={"api_key": NEW_KEY}).status_code == 403
        assert client.delete(f"{BASE}/dashscope").status_code == 403
