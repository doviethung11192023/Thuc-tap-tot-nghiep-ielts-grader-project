"""Ghi đè cấu hình chạy: kiểm khoảng, model cho phép, gọi thử trước khi lưu, audit, báo engine nạp lại (US9)."""
from ai_services_test_support import (  # noqa: F401
    ADMIN_ID, EFFECTIVE, as_role, audit_rows, client, fake_db, fake_engine,
)
from app.clients import ai_engine_admin_client as engine_client

BASE = "/api/v1/admin/ai-services/runtime-config"


def _stored(fake_db):
    rows = [r for r in fake_db.tables.get("system_settings", []) if r["key"] == "ai_runtime_config"]
    return rows[0]["value"] if rows else None


def test_save_step_runs_test_then_saves_audits_and_refreshes(client, fake_db, fake_engine):
    response = client.put(f"{BASE}/steps/writing_rewrite", json={"model": "qwen3.7-plus", "temperature": 0.5})
    assert response.status_code == 200
    assert _stored(fake_db)["steps"] == {"writing_rewrite": {"model": "qwen3.7-plus", "temperature": 0.5}}
    # Thứ tự: đọc effective → gọi thử → refresh; gọi thử dùng cấu hình sau khi lưu, max_tokens lấy từ effective
    test_call = fake_engine.by_path("/admin/services/test")[0]["json"]
    assert test_call == {"kind": "llm", "model": "qwen3.7-plus", "temperature": 0.5, "max_tokens": 4000,
                         "api_key": None, "use_env_key": False}
    assert fake_engine.paths()[-1] == "/admin/runtime-config/refresh"
    audit = audit_rows(fake_db, "update_ai_runtime_config")[0]
    assert audit["entity_id"] == "steps.writing_rewrite" and audit["before"] == {}
    assert audit["after"] == {"model": "qwen3.7-plus", "temperature": 0.5}


def test_null_removes_only_that_field_and_other_steps_stay(client, fake_db):
    fake_db.tables["system_settings"].append({"key": "ai_runtime_config", "value": {
        "steps": {"writing_rewrite": {"model": "qwen3.7-plus", "temperature": 0.5},
                  "writing_vision": {"model": "qwen-flash"}}, "llm": {"timeout_seconds": 90}, "jev": {}}})
    assert client.put(f"{BASE}/steps/writing_rewrite", json={"temperature": None}).status_code == 200
    stored = _stored(fake_db)
    assert stored["steps"] == {"writing_rewrite": {"model": "qwen3.7-plus"}, "writing_vision": {"model": "qwen-flash"}}
    assert stored["llm"] == {"timeout_seconds": 90}


def test_removing_last_override_drops_the_step_entry(client, fake_db):
    fake_db.tables["system_settings"].append({"key": "ai_runtime_config", "value": {
        "steps": {"writing_rewrite": {"model": "qwen3.7-plus"}}, "llm": {}, "jev": {}}})
    assert client.put(f"{BASE}/steps/writing_rewrite", json={"model": None}).status_code == 200
    assert _stored(fake_db)["steps"] == {}


def test_failed_test_call_returns_422_and_saves_nothing(client, fake_db, fake_engine):
    fake_engine.routes[("POST", "/admin/services/test")] = {"ok": False, "latency_ms": 5, "error": "model_not_found"}
    response = client.put(f"{BASE}/steps/writing_rewrite", json={"model": "qwen3.7-plus"})
    assert response.status_code == 422 and response.json()["detail"] == "Gọi thử thất bại: model_not_found"
    assert _stored(fake_db) is None and not audit_rows(fake_db)
    assert "/admin/runtime-config/refresh" not in fake_engine.paths()


def test_engine_down_blocks_saving(client, fake_db, fake_engine):
    fake_engine.routes[("POST", "/admin/services/test")] = engine_client.AiEngineUnavailable("down")
    response = client.put(f"{BASE}/steps/writing_rewrite", json={"temperature": 1})
    assert response.status_code == 502 and _stored(fake_db) is None


def test_out_of_range_values_rejected_before_any_engine_call(client, fake_db, fake_engine):
    for body in ({"temperature": 2.5}, {"temperature": -0.1}, {"max_tokens": 0}, {"max_tokens": 16001}):
        assert client.put(f"{BASE}/steps/writing_rewrite", json=body).status_code == 422, body
    assert client.put(f"{BASE}/steps/writing_rewrite", json={}).status_code == 422
    assert not fake_engine.by_path("/admin/services/test") and _stored(fake_db) is None


def test_boundary_values_accepted(client):
    assert client.put(f"{BASE}/steps/writing_rewrite", json={"temperature": 0, "max_tokens": 16000}).status_code == 200


def test_model_must_be_in_price_table_for_steps(client, fake_db):
    response = client.put(f"{BASE}/steps/writing_rewrite", json={"model": "gpt-unknown"})
    assert response.status_code == 422 and "gpt-unknown" in response.json()["detail"]
    assert _stored(fake_db) is None


def test_unknown_step_is_404(client):
    assert client.put(f"{BASE}/steps/not_a_step", json={"temperature": 1}).status_code == 404


def test_llm_group_range_and_save(client, fake_db, fake_engine):
    assert client.put(f"{BASE}/llm", json={"timeout_seconds": 9}).status_code == 422
    assert client.put(f"{BASE}/llm", json={"timeout_seconds": 601}).status_code == 422
    assert client.put(f"{BASE}/llm", json={"timeout_seconds": 120, "enable_thinking": True}).status_code == 200
    assert _stored(fake_db)["llm"] == {"timeout_seconds": 120, "enable_thinking": True}
    assert fake_engine.by_path("/admin/services/test")[-1]["json"]["enable_thinking"] is True
    assert audit_rows(fake_db, "update_ai_runtime_config")[0]["entity_id"] == "llm"


def test_jev_model_is_not_limited_by_price_table_but_timeout_is(client, fake_db, fake_engine):
    assert client.put(f"{BASE}/jev", json={"timeout_seconds": 31}).status_code == 422
    assert client.put(f"{BASE}/jev", json={"model": "jev-other", "timeout_seconds": 8}).status_code == 200
    assert _stored(fake_db)["jev"] == {"model": "jev-other", "timeout_seconds": 8}
    assert fake_engine.by_path("/admin/services/test")[-1]["json"]["kind"] == "jev"


def test_get_view_merges_override_effective_and_allowed_models(client, fake_db):
    client.put(f"{BASE}/steps/writing_rewrite", json={"model": "qwen3.7-plus"})
    data = client.get(BASE).json()["data"]
    assert len(data["steps"]) == 8 and data["allowed_models"] == ["qwen-flash", "qwen3.7-plus"]
    rewrite = next(s for s in data["steps"] if s["step"] == "writing_rewrite")
    assert rewrite["override"] == {"model": "qwen3.7-plus"} and rewrite["effective"]["model"]["value"] == "qwen-flash"
    assert data["updated_by_email"] == "admin@example.com" and "warning" not in data
    assert data["llm"]["effective"] == EFFECTIVE["llm"]


def test_get_view_when_engine_down_still_returns_overrides(client, fake_db, fake_engine):
    client.put(f"{BASE}/steps/writing_rewrite", json={"model": "qwen3.7-plus"})
    fake_engine.routes[("GET", "/admin/services/effective-config")] = engine_client.AiEngineUnavailable("down")
    data = client.get(BASE).json()["data"]
    rewrite = next(s for s in data["steps"] if s["step"] == "writing_rewrite")
    assert rewrite["effective"] is None and rewrite["override"] == {"model": "qwen3.7-plus"}
    assert data["warning"] and data["allowed_models"]


def test_refresh_failure_does_not_fail_the_save(client, fake_db, fake_engine):
    fake_engine.routes[("POST", "/admin/runtime-config/refresh")] = engine_client.AiEngineUnavailable("down")
    assert client.put(f"{BASE}/steps/writing_rewrite", json={"temperature": 1}).status_code == 200
    assert _stored(fake_db)["steps"]["writing_rewrite"] == {"temperature": 1}


def test_learner_and_expert_are_forbidden(client):
    for role in ("learner", "expert"):
        as_role(role)
        assert client.get(BASE).status_code == 403
        assert client.put(f"{BASE}/steps/writing_rewrite", json={"temperature": 1}).status_code == 403
        assert client.put(f"{BASE}/llm", json={"timeout_seconds": 30}).status_code == 403
        assert client.put(f"{BASE}/jev", json={"timeout_seconds": 3}).status_code == 403
