"""Sức khoẻ service AI (US11) và việc trang Cài đặt chung không còn thấy/sửa khoá AI (FR-052)."""
from ai_services_test_support import as_role, client, fake_db, fake_engine  # noqa: F401
from app.clients.ai_engine import admin_client as engine_client

HEALTH = "/api/v1/admin/ai-services/health"
SETTINGS = "/api/v1/admin/core/settings"
ENGINE_SERVICES = {"checked_at": "t", "services": [
    {"service": "llm", "status": "ok", "latency_ms": 640, "detail": "qwen-flash", "error": None},
    {"service": "whisper", "status": "not_loaded", "latency_ms": None, "detail": "medium.en", "error": None}]}


def _by_name(response):
    return {s["service"]: s for s in response.json()["data"]["services"]}


def test_engine_up_merges_core_check_and_engine_rows_with_labels(client, fake_engine):
    fake_engine.routes[("GET", "/admin/services/health")] = ENGINE_SERVICES
    rows = _by_name(client.get(HEALTH))
    assert rows["ai_engine"]["status"] == "ok" and rows["ai_engine"]["label"] == "AI engine (chấm bài)"
    assert rows["llm"]["status"] == "ok" and rows["llm"]["latency_ms"] == 640 and rows["llm"]["label"]
    assert rows["whisper"]["status"] == "not_loaded"
    assert rows["jev"]["status"] == "unknown"   # engine không trả dòng này
    assert fake_engine.calls[0]["timeout"] == 3.0 and fake_engine.by_path("/admin/services/health")[0]["timeout"] == 20.0


def test_engine_down_marks_dependent_rows_unknown(client, fake_engine):
    fake_engine.routes[("GET", "/health")] = engine_client.AiEngineUnavailable("Không kết nối được (ConnectError)")
    response = client.get(HEALTH)
    rows = _by_name(response)
    assert rows["ai_engine"]["status"] == "error"
    assert {r["status"] for n, r in rows.items() if n != "ai_engine"} == {"unknown"}
    assert len(rows) == 8 and not fake_engine.by_path("/admin/services/health")


def test_engine_timeout_is_reported_as_timeout(client, fake_engine):
    fake_engine.routes[("GET", "/health")] = engine_client.AiEngineUnavailable("Hết thời gian chờ (ReadTimeout)")
    assert _by_name(client.get(HEALTH))["ai_engine"]["status"] == "timeout"


def test_health_call_failing_after_alive_check_gives_unknown(client, fake_engine):
    fake_engine.routes[("GET", "/admin/services/health")] = engine_client.AiEngineUnavailable("Hết thời gian chờ")
    rows = _by_name(client.get(HEALTH))
    assert rows["ai_engine"]["status"] == "ok" and rows["llm"]["status"] == "unknown"


def test_single_service_check_and_invalid_name(client, fake_engine):
    fake_engine.routes[("GET", "/admin/services/health")] = ENGINE_SERVICES
    rows = _by_name(client.get(HEALTH, params={"service": "llm"}))
    assert list(rows) == ["llm"] and fake_engine.by_path("/admin/services/health")[0]["params"] == {"service": "llm"}
    assert list(_by_name(client.get(HEALTH, params={"service": "ai_engine"}))) == ["ai_engine"]
    assert client.get(HEALTH, params={"service": "nope"}).status_code == 422


def test_health_is_admin_only(client):
    for role in ("learner", "expert"):
        as_role(role)
        assert client.get(HEALTH).status_code == 403


def test_core_settings_hides_ai_keys_and_keeps_the_rest(client, fake_db):
    fake_db.tables["system_settings"] += [
        {"key": "ai_runtime_config", "value": {}}, {"key": "trace_view_days", "value": 30},
        {"key": "ai_monthly_budget_usd", "value": 20}, {"key": "auto_submit_grace", "value": 10},
        {"key": "ai_tutor_config", "value": {"enabled": True}}]
    keys = sorted(r["key"] for r in client.get(SETTINGS).json()["data"])
    # ai_tutor_config không thuộc spec 008: vẫn hiện và sửa được ở trang Cài đặt
    assert keys == ["ai_tutor_config", "auto_submit_grace"]


def test_core_settings_put_of_ai_keys_is_400_and_does_not_write(client, fake_db):
    fake_db.tables["system_settings"] += [{"key": "ai_monthly_budget_usd", "value": 20},
                                          {"key": "trace_view_days", "value": 30},
                                          {"key": "auto_submit_grace", "value": 10}]
    for key in ("ai_monthly_budget_usd", "ai_model_prices", "trace_view_days"):
        response = client.put(f"{SETTINGS}/{key}", json={"value": 1})
        assert response.status_code == 400 and response.json()["detail"] == "Quản lý ở trang Service AI"
    budget = next(r for r in fake_db.tables["system_settings"] if r["key"] == "ai_monthly_budget_usd")
    assert budget["value"] == 20 and not fake_db.tables.get("audit_logs")
    assert client.put(f"{SETTINGS}/auto_submit_grace", json={"value": 15}).status_code == 200
    fake_db.tables["system_settings"].append({"key": "ai_tutor_config", "value": {"enabled": True}})
    assert client.put(f"{SETTINGS}/ai_tutor_config", json={"value": {"enabled": False}}).status_code == 200
