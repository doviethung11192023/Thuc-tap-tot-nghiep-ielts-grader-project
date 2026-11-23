"""Đồng bộ giá model với nhà cung cấp: đọc trang giá Alibaba, dự phòng LiteLLM, lưu + audit khi giá đổi (spec 008)."""
import pytest
from fastapi.testclient import TestClient

from app.core.security import User, get_current_active_user
from app.main import app
from app.services.admin import staff_accounts
from app.services.ai_monitoring import ai_pricing_admin, model_price_sources as sources, model_price_sync, model_pricing
from ai_monitoring_test_support import ADMIN_ID, RichFakeSupabase


def _row(*cells: str) -> str:
    return "<tr>" + "".join(f'<td style={{{{ verticalAlign: "top" }}}}>\n  {c}\n</td>' for c in cells) + "</tr>"


# Rút gọn đúng cấu trúc trang model-pricing.md thật: mỗi họ model có các tab vùng, bậc sau không lặp tên model
OFFICIAL_MD = "\n".join([
    '<Tab title="Singapore">', "<table><tbody>",
    _row("qwen3.7-plus\n\n  > [Context cache](/x) enjoys a discount", "International", "0\\<Token≤256K",
         "Original\\$0.4 (20% off for a limited time)", "Original\\$1.6 (20% off for a limited time)",
         "Original\\$1.6 (20% off for a limited time)", "1 million Tokens"),
    _row("256K\\<Token≤1M", "Original\\$1.2", "Original\\$4.8", "Original\\$4.8"),
    _row("qwen-flash", "International", "0\\<Token≤256K", "\\$0.05", "\\$0.4", "1 million Tokens"),
    "</tbody></table></Tab>",
    '<Tab title="China (Beijing)">', "<table><tbody>",
    _row("qwen-flash", "0\\<Token≤128K", "\\$0.022", "\\$0.216"),
    _row("qwen3.8-flash", "0\\<Token≤1M", "\\$0.113", "\\$0.382"),
    "</tbody></table></Tab>",
])


def test_official_parser_reads_first_tier_of_the_singapore_tab_only():
    found = sources.parse_official_prices(OFFICIAL_MD, {"qwen-flash", "qwen3.7-plus", "qwen3.8-flash"})
    assert found["qwen-flash"] == {"input_per_1m": 0.05, "output_per_1m": 0.4, "note": None}
    assert found["qwen3.7-plus"]["input_per_1m"] == 0.4 and found["qwen3.7-plus"]["output_per_1m"] == 1.6
    assert found["qwen3.7-plus"]["note"] == "20% off for a limited time"   # giá lưu là giá niêm yết
    assert "qwen3.8-flash" not in found                                    # chỉ có ở Bắc Kinh, không lấy nhầm vùng


def test_litellm_parser_converts_per_token_and_takes_first_tier():
    table = {"dashscope/qwen-flash": {"tiered_pricing": [
                {"input_cost_per_token": 5e-08, "output_cost_per_token": 4e-07, "range": [0, 256000]},
                {"input_cost_per_token": 2.5e-07, "output_cost_per_token": 2e-06, "range": [256000, 1000000]}]},
             "dashscope/qwen3.8-flash": {"input_cost_per_token": 1.5e-07, "output_cost_per_token": 4.7e-07},
             "dashscope/broken": {"input_cost_per_token": None}}
    found = sources.parse_litellm_prices(table, {"qwen-flash", "qwen3.8-flash", "broken", "absent"})
    assert found == {"qwen-flash": {"input_per_1m": 0.05, "output_per_1m": 0.4, "note": None},
                     "qwen3.8-flash": {"input_per_1m": 0.15, "output_per_1m": 0.47, "note": None}}


@pytest.fixture
def sync_db(monkeypatch):
    fake = RichFakeSupabase(system_settings=[
        {"key": "ai_model_prices", "value": {"qwen-flash": {"input_per_1m": 0.05, "output_per_1m": 0.4},
                                             "qwen3.7-plus": {"input_per_1m": None, "output_per_1m": None},
                                             "custom-model": {"input_per_1m": 9, "output_per_1m": 9}}},
        {"key": "ai_monthly_budget_usd", "value": 20},
        {"key": "ai_runtime_config", "value": {"steps": {}, "llm": {}, "jev": {}}}])
    for module in (model_price_sync, model_pricing, ai_pricing_admin, staff_accounts):
        monkeypatch.setattr(module, "db", lambda: fake)
    return fake


def _provider(monkeypatch, prices, errors=()):
    srcs = {m: "alibaba_official" for m in prices}
    monkeypatch.setattr(model_price_sync, "fetch_provider_prices", lambda models: (
        {m: p for m, p in prices.items() if m in models}, srcs, list(errors)))


def _audits(db):
    return [r for r in db.tables.get("audit_logs", []) if r["action"] == "sync_ai_model_prices"]


def test_cron_sync_updates_changed_prices_with_system_audit_and_keeps_unknown_models(sync_db, monkeypatch):
    _provider(monkeypatch, {"qwen-flash": {"input_per_1m": 0.05, "output_per_1m": 0.4, "note": None},
                            "qwen3.7-plus": {"input_per_1m": 0.4, "output_per_1m": 1.6, "note": "20% off"}})
    status = model_price_sync.sync_model_prices()
    prices = model_pricing.get_prices()
    assert prices["qwen3.7-plus"] == {"input_per_1m": 0.4, "output_per_1m": 1.6}
    assert prices["custom-model"] == {"input_per_1m": 9.0, "output_per_1m": 9.0}     # không có ở nguồn: giữ nguyên
    assert [status["models"][m]["status"] for m in ("qwen-flash", "qwen3.7-plus", "custom-model")] == \
        ["unchanged", "updated", "not_found"]
    assert status["models"]["qwen3.7-plus"]["previous"] == {"input_per_1m": None, "output_per_1m": None}
    audit = _audits(sync_db)
    assert len(audit) == 1 and audit[0]["actor_type"] == "system" and audit[0]["admin_id"] is None
    assert list(audit[0]["after"]["prices"]) == ["qwen3.7-plus"]
    saved = next(r for r in sync_db.tables["system_settings"] if r["key"] == "ai_model_prices")
    assert saved["updated_by"] is None and saved["admin_role"] is None   # CHECK: cùng NULL khi hệ thống ghi
    assert ai_pricing_admin.get_pricing()["sync"]["last_change_at"] == status["checked_at"]


def test_sync_without_changes_writes_no_audit_and_keeps_last_change_time(sync_db, monkeypatch):
    _provider(monkeypatch, {"qwen-flash": {"input_per_1m": 0.05, "output_per_1m": 0.4, "note": None}})
    sync_db.tables["system_settings"].append({"key": "ai_model_price_sync", "value": {"last_change_at": "2026-11-01"}})
    status = model_price_sync.sync_model_prices(ADMIN_ID)
    assert not _audits(sync_db) and status["last_change_at"] == "2026-11-01"


def test_unreachable_sources_change_nothing_and_report_the_error(sync_db, monkeypatch):
    _provider(monkeypatch, {}, errors=["Trang giá Alibaba: ConnectError"])
    before = model_pricing.get_prices()
    status = model_price_sync.sync_model_prices()
    assert model_pricing.get_prices() == before and not _audits(sync_db)
    assert status["errors"] == ["Trang giá Alibaba: ConnectError"]
    assert {r["status"] for r in status["models"].values()} == {"not_found"}


def test_sync_route_is_admin_triggered_and_audited_as_admin(sync_db, monkeypatch):
    _provider(monkeypatch, {"qwen3.7-plus": {"input_per_1m": 0.4, "output_per_1m": 1.6, "note": None}})
    app.dependency_overrides[get_current_active_user] = lambda: User(id=ADMIN_ID, role="admin")
    try:
        res = TestClient(app).post("/api/v1/admin/ai-pricing/sync")
    finally:
        app.dependency_overrides.clear()
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["prices"]["qwen3.7-plus"]["input_per_1m"] == 0.4 and data["sync"]["models"]["qwen3.7-plus"]["status"] == "updated"
    assert _audits(sync_db)[0]["admin_id"] == ADMIN_ID


def test_sync_route_rejects_non_admin(sync_db):
    app.dependency_overrides[get_current_active_user] = lambda: User(id="u1", role="learner")
    try:
        assert TestClient(app).post("/api/v1/admin/ai-pricing/sync").status_code == 403
    finally:
        app.dependency_overrides.clear()
