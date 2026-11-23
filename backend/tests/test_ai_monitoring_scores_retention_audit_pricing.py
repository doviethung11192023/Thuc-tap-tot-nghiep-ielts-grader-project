"""Score Expert − AI lên trace, dọn dữ liệu cũ, đọc audit log, sửa giá và ngân sách (spec 008)."""
import asyncio
from datetime import datetime, timedelta, timezone

import httpx
import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.domain_errors import DomainError, InvalidRequestError, NotFoundError
from app.core.security import User, get_current_active_user
from app.main import app
from app.services.admin import staff_accounts
from app.services.ai_monitoring import (
    ai_expert_gap_pairs as pairs, ai_expert_gap_scores as scores, ai_pricing_admin as pricing, audit_log_queries as audit,
    model_pricing, tracing_retention as retention,
)
from app.services.ai_monitoring.ai_expert_gap_pairs import EvalPair
from app.services.expert import dispatcher
from ai_monitoring_test_support import ADMIN_ID, RichFakeSupabase

NOW = datetime(2026, 11, 22, 5, 0, tzinfo=timezone.utc)


def _ago(**delta) -> str:
    return (NOW - timedelta(**delta)).isoformat()


class FakeHttp:
    """Thay httpx.AsyncClient của module: ghi lại request, trả lần lượt các phản hồi."""

    def __init__(self, *responses):
        self.responses, self.sent = list(responses), []

    def __call__(self, **_kwargs):
        return self

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_exc):
        return False

    async def post(self, url, json=None, headers=None):
        self.sent.append({"url": url, "json": json, "headers": headers})
        response = self.responses.pop(0) if self.responses else _ok({})
        if isinstance(response, Exception):
            raise response
        return response


def _ok(body, status=200):
    return httpx.Response(status, json=body, request=httpx.Request("POST", "http://engine"))


# ---------- score lên trace ----------
def _pair(**kwargs):
    attempt = {"id": "W1", "skill": kwargs.get("skill", "writing"), "test_id": "t"}
    ai = {"id": "ai1", "overall_band": 6.0, "created_at": "x"}
    expert = {"id": "ex1", "overall_band": 7.5, "created_at": "x"}
    return EvalPair(attempt, ai, expert, kwargs.get("ai", {("TA", 1): 6.0, ("CC", 1): 6.0}),
                    kwargs.get("expert", {("TA", 1): 7.0, ("CC", 1): 5.5}))


def test_score_items_cover_overall_and_every_criterion_per_trace():
    items = scores.build_score_items(_pair(), ["t1", "t2"])
    assert {(i["trace_id"], i["name"], i["value"]) for i in items} == {
        (t, name, value) for t in ("t1", "t2")
        for name, value in (("expert_minus_ai_overall", 1.5), ("expert_minus_ai_ta", 1.0), ("expert_minus_ai_cc", -0.5))}


def test_speaking_scores_use_criterion_codes_and_names_match_the_engine_pattern():
    import re
    pair = _pair(skill="speaking", ai={("FC", 0): 6.0, ("P", 0): 6.0}, expert={("FC", 1): 6.5, ("P", 1): 5.0})
    names = {i["name"]: i["value"] for i in scores.build_score_items(pair, ["t"])}
    assert names == {"expert_minus_ai_overall": 1.5, "expert_minus_ai_fc": 0.5, "expert_minus_ai_p": -1.0}
    assert all(re.match(r"^expert_minus_ai_(overall|ta|tr|cc|lr|gra|fc|p)$", n) for n in names)


@pytest.fixture
def push_env(monkeypatch):
    monkeypatch.setattr(scores, "load_pairs", lambda *a, **k: [_pair()])
    monkeypatch.setattr(scores, "load_runs", lambda ids: {"ai1": [{"trace_id": "t1"}, {"trace_id": None}, {"trace_id": "t2"}]})
    monkeypatch.setattr(settings, "AI_ENGINE_SECRET", "s3cret")
    monkeypatch.setattr(settings, "AI_ENGINE_URL", "http://engine:8001/grade")


def test_push_sends_to_the_engine_with_secret_for_traces_that_exist(push_env, monkeypatch):
    http = FakeHttp(_ok({"sent": 6, "failed": []}))
    monkeypatch.setattr(scores.httpx, "AsyncClient", http)
    assert asyncio.run(scores.push_expert_gap_scores("W1")) == 6
    call = http.sent[0]
    assert call["url"] == "http://engine:8001/admin/traces/scores"
    assert call["headers"]["X-AI-Engine-Secret"] == "s3cret"
    assert {i["trace_id"] for i in call["json"]["items"]} == {"t1", "t2"} and len(call["json"]["items"]) == 6


def test_push_batches_of_50(push_env, monkeypatch):
    monkeypatch.setattr(scores, "load_runs", lambda ids: {"ai1": [{"trace_id": f"t{i}"} for i in range(40)]})
    http = FakeHttp()
    monkeypatch.setattr(scores.httpx, "AsyncClient", http)
    asyncio.run(scores.push_expert_gap_scores("W1"))
    assert [len(c["json"]["items"]) for c in http.sent] == [50, 50, 20]


def test_engine_failure_is_swallowed_and_never_retried(push_env, monkeypatch):
    http = FakeHttp(httpx.ConnectError("engine down"))
    monkeypatch.setattr(scores.httpx, "AsyncClient", http)
    asyncio.run(scores._push_safely("W1"))              # không raise
    assert len(http.sent) == 1


def test_database_failure_is_swallowed_too(monkeypatch):
    def broken(*args, **kwargs):
        raise RuntimeError("db down")
    monkeypatch.setattr(scores, "load_pairs", broken)
    asyncio.run(scores._push_safely("W1"))


def test_attempt_without_pair_or_traces_sends_nothing(push_env, monkeypatch):
    http = FakeHttp()
    monkeypatch.setattr(scores.httpx, "AsyncClient", http)
    monkeypatch.setattr(scores, "load_pairs", lambda *a, **k: [])
    assert asyncio.run(scores.push_expert_gap_scores("W1")) == 0 and http.sent == []


def test_scheduling_never_raises_even_without_an_event_loop():
    scores.schedule_expert_gap_scores("W1")              # không có loop đang chạy: chỉ log


def test_scheduling_runs_in_the_background(push_env, monkeypatch):
    done = []

    async def fake_push(attempt_id):
        done.append(attempt_id)

    monkeypatch.setattr(scores, "push_expert_gap_scores", fake_push)

    async def main():
        scores.schedule_expert_gap_scores("W9")
        await asyncio.gather(*scores._background)

    asyncio.run(main())
    assert done == ["W9"]


def test_expert_submit_still_succeeds_when_scoring_cannot_start(monkeypatch):
    """submit_expert_final_review gọi schedule_expert_gap_scores sau khi lưu; lỗi ở đó không được phá việc nộp."""
    db = RichFakeSupabase(
        review_assignments=[{"id": "as1", "expert_id": "x1", "ended_at": None, "evaluation_id": "ex1",
                             "attempt_id": "W1", "request_id": "rq1", "note": None}],
        evaluations=[{"id": "ex1", "attempt_id": "W1", "evaluator_type": "expert", "status": "draft"},
                     {"id": "ai1", "attempt_id": "W1", "evaluator_type": "ai", "overall_band": 6.0,
                      "created_at": "2026-11-10T00:00:00+00:00", "is_official": True}],
        review_requests=[{"id": "rq1"}], attempts=[{"id": "W1", "status": "waiting_expert", "learner_id": "l1"}],
        annotations=[], criterion_scores=[])
    monkeypatch.setattr(dispatcher, "db", lambda: db)
    monkeypatch.setattr(dispatcher, "notify_expert_completed", lambda *a: None)
    monkeypatch.setattr(dispatcher, "invalidate_user_profile_cache", lambda *a: None)
    monkeypatch.setattr(scores.asyncio, "get_running_loop", lambda: (_ for _ in ()).throw(RuntimeError("no loop")))
    result = asyncio.run(dispatcher.submit_expert_final_review("as1", "x1", {"overall_band": 6.5, "feedback": "ok"}))
    assert result["status"] == "completed"
    assert next(e for e in db.tables["evaluations"] if e["id"] == "ex1")["is_official"] is True


# ---------- dọn dữ liệu cũ ----------
@pytest.fixture
def retention_db(monkeypatch):
    fake = RichFakeSupabase(grading_runs=[
        {"id": "r91", "trace_id": "t91", "status": "done", "started_at": _ago(days=91)},
        {"id": "r95", "trace_id": "t95", "status": "done", "started_at": _ago(days=95)},
        {"id": "r89", "trace_id": "t89", "status": "done", "started_at": _ago(days=89)},
        {"id": "r100", "trace_id": "t100", "status": "done", "started_at": _ago(days=100)},
        {"id": "r92-none", "trace_id": None, "status": "done", "started_at": _ago(days=92)},
        {"id": "f200", "status": "failed", "output": {"usage": []}, "error": "boom", "input_tokens": 5, "cost_usd": 0.1,
         "started_at": _ago(days=200)},
        {"id": "f10", "status": "failed", "output": {"usage": []}, "error": "boom", "started_at": _ago(days=10)},
        {"id": "d200", "status": "done", "output": {"scores": {}}, "error": None, "started_at": _ago(days=200)}])
    for module in (retention, staff_accounts):
        monkeypatch.setattr(module, "db", lambda: fake)
    monkeypatch.setattr(retention, "now_vn", lambda: NOW)
    monkeypatch.setattr(settings, "AI_ENGINE_URL", "http://engine:8001/grade")
    return fake


def test_only_traces_aged_90_to_97_days_are_sent_for_deletion(retention_db, monkeypatch):
    http = FakeHttp(_ok({"deleted": 2, "failed": []}))
    monkeypatch.setattr(retention.httpx, "AsyncClient", http)
    assert asyncio.run(retention.delete_old_traces()) == 2
    assert http.sent[0]["url"] == "http://engine:8001/admin/traces/delete"
    assert http.sent[0]["json"] == {"trace_ids": ["t91", "t95"]}


def test_failed_run_content_is_cleared_after_180_days_and_usage_is_kept(retention_db):
    assert retention.clear_old_failed_outputs() == 1
    old = next(r for r in retention_db.tables["grading_runs"] if r["id"] == "f200")
    assert old["output"] is None and old["error"] is None and old["input_tokens"] == 5 and old["cost_usd"] == 0.1
    kept = {r["id"]: r for r in retention_db.tables["grading_runs"]}
    assert kept["f10"]["output"] is not None and kept["d200"]["output"] == {"scores": {}}
    assert retention.clear_old_failed_outputs() == 0              # chạy lặp vô hại


def test_purge_writes_a_system_audit_row_only_when_something_was_removed(retention_db, monkeypatch):
    monkeypatch.setattr(retention.httpx, "AsyncClient", FakeHttp(_ok({"deleted": 2, "failed": []})))
    result = asyncio.run(retention.purge_old_ai_traces())
    assert result == {"traces": 2, "outputs_cleared": 1}
    row = retention_db.tables["audit_logs"][0]
    assert row["actor_type"] == "system" and row["admin_id"] is None and row["action"] == "purge_ai_traces"
    assert row["after"] == result
    monkeypatch.setattr(retention.httpx, "AsyncClient", FakeHttp(_ok({"deleted": 0})))
    asyncio.run(retention.purge_old_ai_traces())
    assert len(retention_db.tables["audit_logs"]) == 1


def test_engine_down_still_clears_old_outputs(retention_db, monkeypatch):
    monkeypatch.setattr(retention.httpx, "AsyncClient", FakeHttp(httpx.ConnectError("down")))
    result = asyncio.run(retention.purge_old_ai_traces())
    assert result == {"traces": 0, "outputs_cleared": 1}


# ---------- audit log ----------
@pytest.fixture
def audit_db(monkeypatch):
    def row(rid, when, actor, admin, action, entity, **extra):
        return {"id": rid, "created_at": when, "actor_type": actor, "admin_id": admin, "action": action,
                "entity": entity, "entity_id": "x", "before": {"v": 1}, "after": {"v": 2}, **extra}

    fake = RichFakeSupabase(
        audit_logs=[row("a1", "2026-11-20T10:00:00+00:00", "admin", "ad1", "regrade_ai", "attempts"),
                    row("a2", "2026-11-21T10:00:00+00:00", "admin", "ad2", "update_ai_budget", "system_settings"),
                    row("a3", "2026-11-21T20:00:00+00:00", "system", None, "purge_ai_traces", "grading_runs"),
                    row("a4", "2026-11-22T09:00:00+00:00", "admin", "ad1", "regrade_ai", "attempts")],
        profiles=[{"id": "ad1", "email": "one@x.com"}, {"id": "ad2", "email": "two@x.com"}])
    monkeypatch.setattr(audit, "db", lambda: fake)
    return fake


def _log_ids(result):
    return [i["id"] for i in result["items"]]


def test_audit_list_is_newest_first_with_admin_emails(audit_db):
    result = audit.list_audit_logs(1, 20)
    assert _log_ids(result) == ["a4", "a3", "a2", "a1"] and result["total"] == 4
    assert result["items"][0]["admin_email"] == "one@x.com" and result["items"][1]["admin_email"] is None


def test_audit_filters_by_actor_action_entity_and_vietnam_day(audit_db):
    assert _log_ids(audit.list_audit_logs(1, 20, actor="ad1")) == ["a4", "a1"]
    assert _log_ids(audit.list_audit_logs(1, 20, actor="system")) == ["a3"]
    assert _log_ids(audit.list_audit_logs(1, 20, action="update_ai_budget")) == ["a2"]
    assert _log_ids(audit.list_audit_logs(1, 20, entity="attempts")) == ["a4", "a1"]
    # 20:00 UTC ngày 21/11 = 03:00 ngày 22/11 giờ VN
    assert _log_ids(audit.list_audit_logs(1, 20, date_from="2026-11-22", date_to="2026-11-22")) == ["a4", "a3"]
    assert audit.list_audit_logs(2, 2)["items"][0]["id"] == "a2"


def test_audit_detail_has_before_and_after(audit_db):
    item = audit.get_audit_log("a2")
    assert item["before"] == {"v": 1} and item["after"] == {"v": 2} and item["admin_email"] == "two@x.com"
    with pytest.raises(NotFoundError):
        audit.get_audit_log("nope")
    with pytest.raises(InvalidRequestError):
        audit.list_audit_logs(1, 20, date_from="22/11/2026")


# ---------- giá và ngân sách ----------
@pytest.fixture
def price_db(monkeypatch):
    fake = RichFakeSupabase(system_settings=[
        {"key": "ai_model_prices", "value": {"qwen-flash": {"input_per_1m": None, "output_per_1m": None},
                                             "qwen3.7-plus": {"input_per_1m": 1, "output_per_1m": 4}}},
        {"key": "ai_monthly_budget_usd", "value": 20},
        {"key": "ai_runtime_config", "value": {"steps": {"writing_rewrite": {"model": "qwen3.7-plus"},
                                                         "writing_vision": {"model": "qwen3.7-plus"}}, "llm": {}, "jev": {"model": "jev-1"}}}])
    for module in (pricing, model_pricing, staff_accounts):
        monkeypatch.setattr(module, "db", lambda: fake)
    return fake


def _audits(db, action):
    return [r for r in db.tables.get("audit_logs", []) if r["action"] == action]


def test_get_pricing_lists_models_in_use_by_step_overrides(price_db):
    data = pricing.get_pricing()
    assert data["budget_usd"] == 20.0 and data["prices"]["qwen3.7-plus"]["output_per_1m"] == 4.0
    assert data["models_in_use"] == [{"model": "qwen3.7-plus", "steps": ["writing_rewrite", "writing_vision"]}]


def test_update_prices_saves_and_audits_old_and_new(price_db):
    new = {"qwen-flash": {"input_per_1m": 0.05, "output_per_1m": 0.4}, "qwen3.7-plus": {"input_per_1m": 1, "output_per_1m": 4},
           "qwen-max": {"input_per_1m": None, "output_per_1m": None}}
    pricing.update_pricing(ADMIN_ID, new, has_prices=True)
    assert model_pricing.allowed_models() == ["qwen-flash", "qwen-max", "qwen3.7-plus"]
    row = _audits(price_db, "update_ai_model_prices")[0]
    assert row["admin_id"] == ADMIN_ID and row["before"]["prices"]["qwen-flash"]["input_per_1m"] is None
    assert row["after"]["prices"]["qwen-flash"]["input_per_1m"] == 0.05


def test_cannot_remove_a_model_a_step_override_uses(price_db):
    with pytest.raises(DomainError) as caught:
        pricing.update_pricing(ADMIN_ID, {"qwen-flash": {}}, has_prices=True)
    assert caught.value.status_code == 422
    assert "qwen3.7-plus" in caught.value.detail and "writing_rewrite" in caught.value.detail
    assert not _audits(price_db, "update_ai_model_prices") and "qwen3.7-plus" in model_pricing.get_prices()


@pytest.mark.parametrize("bad", [{"m": {"input_per_1m": -1, "output_per_1m": 1}}, {"m": {"input_per_1m": "1"}}, {}, {"": {}}])
def test_invalid_prices_are_rejected_without_changes(price_db, bad):
    with pytest.raises(InvalidRequestError):
        pricing.update_pricing(ADMIN_ID, bad, has_prices=True)
    assert len(model_pricing.get_prices()) == 2


def test_budget_can_be_changed_or_turned_off_with_audit(price_db):
    pricing.update_pricing(ADMIN_ID, budget_usd=35.5, has_budget=True)
    assert model_pricing.get_budget() == 35.5
    assert _audits(price_db, "update_ai_budget")[0]["before"] == {"budget_usd": 20.0}
    pricing.update_pricing(ADMIN_ID, budget_usd=None, has_budget=True)
    assert model_pricing.get_budget() is None
    assert _audits(price_db, "update_ai_budget")[1]["after"] == {"budget_usd": None}
    with pytest.raises(InvalidRequestError):
        pricing.update_pricing(ADMIN_ID, budget_usd=-5, has_budget=True)


def test_invalid_budget_blocks_the_price_change_in_the_same_request(price_db):
    with pytest.raises(InvalidRequestError):
        pricing.update_pricing(ADMIN_ID, {"x": {}}, -1, has_prices=True, has_budget=True)
    assert "x" not in model_pricing.get_prices()


def test_pricing_routes_work_for_admin_and_report_conflicts(price_db):
    app.dependency_overrides[get_current_active_user] = lambda: User(id=ADMIN_ID, role="admin")
    try:
        http = TestClient(app)
        assert http.get("/api/v1/admin/ai-pricing").json()["data"]["budget_usd"] == 20.0
        bad = http.put("/api/v1/admin/ai-pricing", json={"prices": {"qwen-flash": {}}})
        assert bad.status_code == 422 and "writing_rewrite" in bad.json()["detail"]
        ok = http.put("/api/v1/admin/ai-pricing", json={"budget_usd": None})
        assert ok.status_code == 200 and ok.json()["data"]["budget_usd"] is None
        assert http.post("/api/v1/admin/regrade/preview", json={"attempt_ids": ["not-a-uuid"]}).status_code == 422
    finally:
        app.dependency_overrides.clear()


def test_saving_unchanged_prices_or_budget_writes_no_audit(price_db):
    """Form Chi phí gửi cả bảng giá lẫn ngân sách mỗi lần Lưu: phần không đổi không được ghi audit."""
    current = model_pricing.get_prices()
    pricing.update_pricing(ADMIN_ID, current, 20, has_prices=True, has_budget=True)
    assert not _audits(price_db, "update_ai_model_prices") and not _audits(price_db, "update_ai_budget")
    pricing.update_pricing(ADMIN_ID, current, 25, has_prices=True, has_budget=True)
    assert not _audits(price_db, "update_ai_model_prices") and len(_audits(price_db, "update_ai_budget")) == 1
