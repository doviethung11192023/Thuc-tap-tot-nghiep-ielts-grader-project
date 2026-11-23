"""Danh sách lượt chấm, luật treo, trace_url, badge cảnh báo, ngân sách và phân quyền Admin (spec 008, US1, US2)."""
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import User, get_current_active_user
from app.main import app
from app.services.ai_monitoring import admin_alerts, ai_usage_report, grading_run_queries as queries, model_pricing
from app.services.ai_monitoring.ai_budget_status import budget_status
from ai_monitoring_test_support import ADMIN_ID, RichFakeSupabase

NOW = datetime(2026, 11, 22, 12, 0, tzinfo=timezone.utc)


def _ago(**delta) -> str:
    return (NOW - timedelta(**delta)).isoformat()


def _run(run_id, status, started, evaluation_id, **extra):
    return {"id": run_id, "evaluation_id": evaluation_id, "task_no": 1, "status": status, "started_at": started,
            "model": "qwen-flash", "prompt_versions": {"ta": 3, "cc": 1}, "trace_id": f"trace-{run_id}",
            "error": None, "input_tokens": 10, "output_tokens": 5, "cost_usd": 0.01, "latency_ms": 900,
            "finished_at": None, "output": None, **extra}


def _with_eval(run, attempt_id, skill="writing", mode="practice"):
    return {**run, "evaluations": {"attempt_id": attempt_id, "skill": skill, "attempts": {"mode": mode}}}


@pytest.fixture
def db(monkeypatch):
    runs = [
        _with_eval(_run("done-new", "done", _ago(minutes=5), "e1", finished_at=_ago(minutes=4)), "a1"),
        _with_eval(_run("running-fresh", "running", _ago(minutes=3), "e2"), "a2"),
        _with_eval(_run("running-stuck", "running", _ago(minutes=40), "e3"), "a3", skill="speaking", mode="mock"),
        _with_eval(_run("failed-attention", "failed", _ago(hours=2), "e4", error="x" * 500, model="qwen3.7-plus",
                        prompt_versions={"grade": 7}), "a4"),
        _with_eval(_run("failed-old-attempt-ok", "failed", _ago(hours=3), "e5", error="boom"), "a5"),
        _with_eval(_run("done-last-month", "done", _ago(days=40), "e6"), "a6"),
    ]
    fake = RichFakeSupabase(
        grading_runs=runs,
        attempts=[{"id": "a4", "status": "grading_failed"}, {"id": "a5", "status": "scored"},
                  {"id": "a7", "status": "grading_failed"}],
        evaluations=[{"id": "e4", "attempt_id": "a4"}, {"id": "e5", "attempt_id": "a5"}],
        system_settings=[{"key": "trace_view_days", "value": 30}, {"key": "ai_monthly_budget_usd", "value": 10},
                         {"key": "ai_model_prices", "value": {}}])
    for module in (queries, admin_alerts, model_pricing, ai_usage_report):
        monkeypatch.setattr(module, "db", lambda: fake)
    monkeypatch.setattr(queries, "_now", lambda: NOW)
    monkeypatch.setattr(settings, "LANGFUSE_BASE_URL", "https://lf.example.com/", raising=False)
    monkeypatch.setattr(settings, "LANGFUSE_PROJECT_ID", "proj1", raising=False)
    return fake


def _ids(result):
    return [item["id"] for item in result["items"]]


def test_list_is_newest_first_with_paging_and_total(db):
    result = queries.list_runs(1, 2, {})
    assert _ids(result) == ["running-fresh", "done-new"] and result["total"] == 6
    assert _ids(queries.list_runs(2, 2, {})) == ["running-stuck", "failed-attention"]
    assert _ids(queries.list_runs(3, 2, {})) == ["failed-old-attempt-ok", "done-last-month"]


def test_stuck_means_running_longer_than_25_minutes(db):
    assert _ids(queries.list_runs(1, 20, {"status": "stuck"})) == ["running-stuck"]
    items = {i["id"]: i for i in queries.list_runs(1, 20, {})["items"]}
    assert items["running-stuck"]["is_stuck"] is True
    assert items["running-fresh"]["is_stuck"] is False and items["done-new"]["is_stuck"] is False


def test_attention_is_failed_runs_of_grading_failed_attempts_plus_stuck(db):
    assert sorted(_ids(queries.list_runs(1, 20, {"status": "attention"}))) == ["failed-attention", "running-stuck"]


def test_filters_by_skill_model_attempt_and_prompt(db):
    assert _ids(queries.list_runs(1, 20, {"skill": "speaking"})) == ["running-stuck"]
    assert _ids(queries.list_runs(1, 20, {"model": "qwen3.7-plus"})) == ["failed-attention"]
    assert _ids(queries.list_runs(1, 20, {"attempt_id": "a3"})) == ["running-stuck"]
    assert _ids(queries.list_runs(1, 20, {"prompt_name": "grade", "prompt_version": "7"})) == ["failed-attention"]
    assert _ids(queries.list_runs(1, 20, {"prompt_name": "grade"})) == ["failed-attention"]
    assert len(queries.list_runs(1, 20, {"prompt_name": "ta", "prompt_version": "3"})["items"]) == 5


def test_date_filter_uses_vietnam_calendar_days(db):
    # started_at của done-last-month = 2026-10-13 12:00 UTC = 19:00 ngày 13/10 giờ VN
    assert _ids(queries.list_runs(1, 20, {"date_from": "2026-10-13", "date_to": "2026-10-13"})) == ["done-last-month"]
    assert queries.list_runs(1, 20, {"date_from": "2026-10-14", "date_to": "2026-10-14"})["total"] == 0


def test_prompt_name_with_injection_chars_is_rejected(db):
    from app.core.domain_errors import InvalidRequestError
    with pytest.raises(InvalidRequestError):
        queries.list_runs(1, 20, {"prompt_name": "ta,status.eq.done"})
    with pytest.raises(InvalidRequestError):
        queries.list_runs(1, 20, {"status": "bogus"})


def test_error_is_shortened_and_trace_link_follows_view_days(db):
    items = {i["id"]: i for i in queries.list_runs(1, 20, {})["items"]}
    assert len(items["failed-attention"]["error_short"]) == 200
    assert items["done-new"]["trace_url"] == "https://lf.example.com/project/proj1/traces/trace-done-new"
    assert items["done-last-month"]["trace_url"] is None          # 40 ngày > trace_view_days = 30


def test_trace_link_hidden_without_trace_or_project(db, monkeypatch):
    assert queries.trace_url(None, _ago(days=1), 30) is None
    monkeypatch.setattr(settings, "LANGFUSE_PROJECT_ID", "", raising=False)
    assert queries.trace_url("t", _ago(days=1), 30) is None


def test_detail_has_full_error_output_evaluation_and_attempt(db):
    db.tables["grading_runs"][3]["output"] = {"usage": []}
    db.tables["evaluations"][0].update(status="failed", is_official=False, overall_band=None)
    db.tables["attempts"][0].update(skill="writing", mode="practice", tests={"title": "Chart test"})
    detail = queries.run_detail("failed-attention")
    assert len(detail["error"]) == 500 and detail["output"] == {"usage": []}
    assert detail["evaluation"]["status"] == "failed"
    assert detail["attempt"]["test_title"] == "Chart test"


def test_detail_unknown_run_is_404(db):
    from app.core.domain_errors import NotFoundError
    with pytest.raises(NotFoundError):
        queries.run_detail("nope")


# ---------- badge ----------
def test_alert_counts_and_total(db, monkeypatch):
    monkeypatch.setattr(admin_alerts, "month_cost_usd", lambda: 8.5)       # 85% của 10 USD
    summary = admin_alerts.alert_summary()
    assert summary["failed_attempts"] == 2 and summary["stuck_runs"] == 1
    assert summary["budget"]["state"] == "warning" and summary["budget"]["percent"] == 85.0
    assert summary["total"] == 4


def test_no_badge_when_everything_is_quiet(db, monkeypatch):
    db.tables["attempts"].clear()
    db.tables["grading_runs"][2]["status"] = "failed"
    monkeypatch.setattr(admin_alerts, "month_cost_usd", lambda: 1.0)
    summary = admin_alerts.alert_summary()
    assert summary["total"] == 0 and summary["budget"]["state"] == "ok"


@pytest.mark.parametrize("cost,budget,state", [(7.9, 10, "ok"), (8.0, 10, "warning"), (9.99, 10, "warning"),
                                               (10.0, 10, "exceeded"), (50, 10, "exceeded"),
                                               (5, 0, "off"), (5, None, "off")])
def test_budget_thresholds_80_and_100_percent(cost, budget, state):
    assert budget_status(cost, budget)["state"] == state


def test_exceeded_budget_counts_as_one_alert(db, monkeypatch):
    monkeypatch.setattr(admin_alerts, "month_cost_usd", lambda: 99.0)
    assert admin_alerts.alert_summary()["total"] == 2 + 1 + 1


# ---------- phân quyền ----------
@pytest.mark.parametrize("path", ["/grading-runs", "/grading-runs/11111111-1111-1111-1111-111111111111", "/alerts",
                                  "/ai-usage", "/ai-pricing", "/ai-expert-gap", "/ai-expert-gap/cases",
                                  "/ai-expert-gap/cases/11111111-1111-1111-1111-111111111111", "/audit-logs",
                                  "/audit-logs/11111111-1111-1111-1111-111111111111"])
@pytest.mark.parametrize("role", ["learner", "expert"])
def test_non_admin_is_forbidden_on_every_read_route(path, role):
    app.dependency_overrides[get_current_active_user] = lambda: User(id=ADMIN_ID, role=role)
    try:
        assert TestClient(app).get(f"/api/v1/admin{path}").status_code == 403
    finally:
        app.dependency_overrides.clear()


@pytest.mark.parametrize("role", ["learner", "expert"])
def test_non_admin_cannot_regrade_or_change_pricing(role):
    app.dependency_overrides[get_current_active_user] = lambda: User(id=ADMIN_ID, role=role)
    try:
        http = TestClient(app)
        body = {"attempt_ids": ["11111111-1111-1111-1111-111111111111"]}
        assert http.post("/api/v1/admin/regrade", json=body).status_code == 403
        assert http.post("/api/v1/admin/regrade/preview", json=body).status_code == 403
        assert http.put("/api/v1/admin/ai-pricing", json={"budget_usd": 5}).status_code == 403
    finally:
        app.dependency_overrides.clear()


def test_admin_can_list_runs_over_http(db):
    app.dependency_overrides[get_current_active_user] = lambda: User(id=ADMIN_ID, role="admin")
    try:
        response = TestClient(app).get("/api/v1/admin/grading-runs?status=stuck&limit=5")
    finally:
        app.dependency_overrides.clear()
    assert response.status_code == 200
    assert [i["id"] for i in response.json()["data"]["items"]] == ["running-stuck"]


def test_old_log_route_is_gone():
    app.dependency_overrides[get_current_active_user] = lambda: User(id=ADMIN_ID, role="admin")
    try:
        assert TestClient(app).get("/api/v1/admin/evaluations/logs").status_code == 404
    finally:
        app.dependency_overrides.clear()
