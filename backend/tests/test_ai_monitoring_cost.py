"""Chi phí và usage của lượt chấm (spec 008): tính giá, cộng token qua các lần thử, ghi cả khi lượt lỗi."""
import asyncio

import httpx
import pytest

from app.clients.ai_engine import grading_client as client
from app.clients.ai_engine.run_usage import AIEngineError, merge_usage, run_context
from app.services.ai_monitoring import ai_usage_report, model_pricing, run_usage_recorder
from app.services.speaking import speaking_grading_service as speaking
from app.services.writing import writing_grading_service as writing
from ai_monitoring_test_support import RichFakeSupabase

PRICES = {"qwen-flash": {"input_per_1m": 0.05, "output_per_1m": 0.4},
          "qwen3.7-plus": {"input_per_1m": 1.0, "output_per_1m": 4.0},
          "free-model": {"input_per_1m": None, "output_per_1m": None}}


# ---------- tính chi phí ----------
def test_cost_sums_every_model_by_per_million_price():
    usage = [{"model": "qwen-flash", "input_tokens": 1_000_000, "output_tokens": 500_000},
             {"model": "qwen3.7-plus", "input_tokens": 200_000, "output_tokens": 100_000}]
    # 0.05 + 0.2 + 0.2 + 0.4
    assert model_pricing.compute_cost(usage, PRICES) == pytest.approx(0.85)


def test_cost_is_unknown_when_any_model_has_no_price():
    usage = [{"model": "qwen-flash", "input_tokens": 10, "output_tokens": 10},
             {"model": "free-model", "input_tokens": 10, "output_tokens": 10}]
    assert model_pricing.compute_cost(usage, PRICES) is None
    assert model_pricing.compute_cost([{"model": "not-listed", "input_tokens": 1, "output_tokens": 1}], PRICES) is None


def test_cost_edge_cases():
    assert model_pricing.compute_cost([], PRICES) == 0.0          # dùng lại kết quả cũ, không gọi LLM
    assert model_pricing.compute_cost(None, PRICES) is None       # engine cũ không báo usage


def test_allowed_models_are_the_price_table_keys(monkeypatch):
    db = RichFakeSupabase(system_settings=[{"key": "ai_model_prices", "value": PRICES}])
    monkeypatch.setattr(model_pricing, "db", lambda: db)
    assert model_pricing.allowed_models() == ["free-model", "qwen-flash", "qwen3.7-plus"]
    assert model_pricing.get_prices()["free-model"] == {"input_per_1m": None, "output_per_1m": None}


def test_budget_zero_or_missing_means_off(monkeypatch):
    db = RichFakeSupabase(system_settings=[{"key": "ai_monthly_budget_usd", "value": 0}])
    monkeypatch.setattr(model_pricing, "db", lambda: db)
    assert model_pricing.get_budget() is None
    db.tables["system_settings"][0]["value"] = 20
    assert model_pricing.get_budget() == 20.0


# ---------- usage_columns ----------
@pytest.fixture
def priced(monkeypatch):
    monkeypatch.setattr(model_pricing, "get_prices", lambda: PRICES)


def test_done_columns_total_tokens_cost_and_trace(priced):
    ai = {"trace_id": "t1", "usage": [{"model": "qwen-flash", "input_tokens": 1_000_000, "output_tokens": 0},
                                      {"model": "qwen-flash", "input_tokens": 0, "output_tokens": 1_000_000}]}
    cols = run_usage_recorder.done_columns(ai)
    assert cols["input_tokens"] == 1_000_000 and cols["output_tokens"] == 1_000_000
    assert cols["cost_usd"] == pytest.approx(0.45) and cols["trace_id"] == "t1"


def test_old_engine_without_usage_records_nothing_invented(priced):
    assert run_usage_recorder.done_columns({"scores": {}}) == {}


def test_cached_result_costs_nothing_and_does_not_reuse_old_trace(priced):
    cols = run_usage_recorder.done_columns({"cached_from_run_id": "r0", "trace_id": "old",
                                            "usage": [{"model": "qwen-flash", "input_tokens": 9, "output_tokens": 9}]})
    assert cols == {"input_tokens": 0, "output_tokens": 0, "cost_usd": 0.0}


def test_failed_columns_keep_tokens_spent_before_the_error(priced):
    usage = [{"model": "qwen-flash", "input_tokens": 100, "output_tokens": 10},
             {"model": "qwen3.7-plus", "input_tokens": 5000, "output_tokens": 800}]
    cols = run_usage_recorder.failed_columns(AIEngineError("boom", usage, "t9"))
    assert cols["input_tokens"] == 5100 and cols["output_tokens"] == 810 and cols["trace_id"] == "t9"
    assert cols["model"] == "qwen3.7-plus" and cols["output"] == {"usage": usage}   # model tốn nhiều nhất
    assert cols["cost_usd"] is not None


def test_failure_after_the_engine_answered_still_counts_its_tokens(priced):
    result = {"trace_id": "t2", "usage": [{"model": "qwen-flash", "input_tokens": 10, "output_tokens": 5}]}
    cols = run_usage_recorder.failed_columns(ValueError("AI response missing score"), result)
    assert cols["input_tokens"] == 10 and cols["trace_id"] == "t2"


def test_failure_without_any_usage_leaves_columns_alone(priced):
    assert run_usage_recorder.failed_columns(ValueError("db down")) == {}


def test_unknown_price_gives_null_cost_but_keeps_tokens(monkeypatch):
    monkeypatch.setattr(model_pricing, "get_prices", lambda: {})
    cols = run_usage_recorder.usage_columns([{"model": "x", "input_tokens": 1, "output_tokens": 2}], None)
    assert cols == {"input_tokens": 1, "output_tokens": 2, "cost_usd": None}


# ---------- cộng usage qua các lần thử HTTP ----------
class FakeHttp:
    """Thay httpx.AsyncClient: trả lần lượt các phản hồi đã dựng, ghi lại body đã gửi."""

    def __init__(self, responses):
        self.responses, self.sent = list(responses), []

    def __call__(self, **_kwargs):
        return self

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_exc):
        return False

    async def post(self, _url, json=None, headers=None):
        self.sent.append(json)
        response = self.responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response


_real_sleep = asyncio.sleep


def _no_wait(_seconds):
    return _real_sleep(0)


def _resp(status, body):
    return httpx.Response(status, json=body, request=httpx.Request("POST", "http://engine"))


def test_merge_usage_adds_per_model():
    merged = merge_usage([{"model": "a", "input_tokens": 1, "output_tokens": 2}],
                         [{"model": "a", "input_tokens": 3, "output_tokens": 4}, {"model": "b", "input_tokens": 1}])
    assert merged == [{"model": "a", "input_tokens": 4, "output_tokens": 6},
                      {"model": "b", "input_tokens": 1, "output_tokens": 0}]


def test_grade_success_after_failed_attempt_carries_both_usages(monkeypatch):
    http = FakeHttp([
        _resp(500, {"detail": "x", "trace_id": "t1", "usage": [{"model": "m", "input_tokens": 100, "output_tokens": 0}]}),
        _resp(200, {"scores": {}, "trace_id": "t1", "usage": [{"model": "m", "input_tokens": 50, "output_tokens": 20}]}),
    ])
    monkeypatch.setattr(client.httpx, "AsyncClient", http)
    monkeypatch.setattr(client.asyncio, "sleep", _no_wait)
    with run_context("run-1", "att-1", "writing", "practice"):
        result = asyncio.run(client.call_ai_grade("t", "essay", 2, None))
    assert result["usage"] == [{"model": "m", "input_tokens": 150, "output_tokens": 20}]
    assert result["trace_id"] == "t1"
    assert http.sent[0]["run_id"] == "run-1" and http.sent[0]["skill"] == "writing" and http.sent[0]["mode"] == "practice"


def test_grade_error_raises_with_usage_of_every_attempt(monkeypatch):
    body = {"detail": "x", "trace_id": "t1", "usage": [{"model": "m", "input_tokens": 10, "output_tokens": 1}]}
    http = FakeHttp([_resp(500, body), httpx.ConnectError("down"), _resp(502, body)])
    monkeypatch.setattr(client.httpx, "AsyncClient", http)
    monkeypatch.setattr(client.asyncio, "sleep", _no_wait)
    with pytest.raises(RuntimeError, match="failed after 3 attempts") as caught:
        asyncio.run(client.call_ai_grade("t", "essay", None, None))
    assert isinstance(caught.value, AIEngineError)
    assert caught.value.usage == [{"model": "m", "input_tokens": 20, "output_tokens": 2}]
    assert caught.value.trace_id == "t1"


def test_grade_without_run_context_sends_the_old_body(monkeypatch):
    http = FakeHttp([_resp(200, {"scores": {}})])
    monkeypatch.setattr(client.httpx, "AsyncClient", http)
    result = asyncio.run(client.call_ai_grade("t", "essay", 1, "img"))
    assert "run_id" not in http.sent[0] and "usage" not in result


def test_speaking_error_keeps_usage_and_does_not_retry_500(monkeypatch):
    body = {"detail": "x", "usage": [{"model": "m", "input_tokens": 7, "output_tokens": 3}]}
    http = FakeHttp([_resp(500, body)])
    monkeypatch.setattr(client.httpx, "AsyncClient", http)
    with pytest.raises(AIEngineError) as caught:
        asyncio.run(client.call_ai_grade_speaking("t", [], []))
    assert caught.value.usage == [{"model": "m", "input_tokens": 7, "output_tokens": 3}] and len(http.sent) == 1


# ---------- ghi vào grading_runs qua service chấm ----------
def _speaking_db(monkeypatch):
    db = RichFakeSupabase(
        attempts=[{"id": "a1", "mode": "mock", "tests": {"title": "T"}}],
        evaluations=[{"id": "e1", "attempt_id": "a1", "skill": "speaking", "evaluator_type": "ai", "status": "pending"}],
        grading_runs=[{"id": "r1", "evaluation_id": "e1", "status": "running"}])
    for module in (speaking,):
        monkeypatch.setattr(module, "db", lambda: db)
    monkeypatch.setattr(speaking, "load_answers", lambda attempt_id: [])
    monkeypatch.setattr(speaking, "load_unanswered", lambda attempt_id, ids: [])
    monkeypatch.setattr(speaking, "finalize_speaking_evaluation", lambda evaluation_id: None)
    monkeypatch.setattr(model_pricing, "get_prices", lambda: PRICES)
    return db


def test_speaking_failure_records_tokens_trace_and_cost(monkeypatch):
    db = _speaking_db(monkeypatch)
    seen = {}

    async def failing(title, answers, unanswered=None):
        from app.clients.ai_engine.run_usage import current_run_context
        seen.update(current_run_context())
        raise AIEngineError("AI engine speaking grading failed: HTTP 500", [
            {"model": "qwen-flash", "input_tokens": 1_000_000, "output_tokens": 0}], "trace-7")

    monkeypatch.setattr(speaking, "call_ai_grade_speaking", failing)
    asyncio.run(speaking.grade_speaking_attempt("a1", "e1", "r1"))
    run = db.tables["grading_runs"][0]
    assert run["status"] == "failed" and run["trace_id"] == "trace-7" and run["model"] == "qwen-flash"
    assert run["input_tokens"] == 1_000_000 and run["cost_usd"] == pytest.approx(0.05)
    assert seen == {"run_id": "r1", "attempt_id": "a1", "skill": "speaking", "mode": "mock"}


def test_speaking_success_records_usage_columns(monkeypatch):
    db = _speaking_db(monkeypatch)

    async def ok(title, answers, unanswered=None):
        return {"no_speech": True, "model": "qwen3.7-plus", "trace_id": "trace-1", "responses": [],
                "usage": [{"model": "qwen3.7-plus", "input_tokens": 2_000_000, "output_tokens": 1_000_000}]}

    monkeypatch.setattr(speaking, "call_ai_grade_speaking", ok)
    monkeypatch.setattr(speaking, "fail_ai_evaluation", lambda *args: None)
    asyncio.run(speaking.grade_speaking_attempt("a1", "e1", "r1"))
    run = db.tables["grading_runs"][0]
    assert run["status"] == "done" and run["trace_id"] == "trace-1" and run["model"] == "qwen3.7-plus"
    assert run["cost_usd"] == pytest.approx(6.0)


def test_writing_failure_after_engine_answer_keeps_its_tokens(monkeypatch):
    db = RichFakeSupabase(
        essays=[{"id": "es1", "attempt_id": "a1", "content": "text", "section_id": "s1"}],
        writing_tasks=[{"section_id": "s1", "task_type": "task2", "task_prompt": "p", "chart_image_key": None}],
        attempts=[{"id": "a1", "mode": "practice"}],
        grading_runs=[{"id": "r1", "evaluation_id": "e1", "status": "running"}])
    monkeypatch.setattr(writing, "db", lambda: db)
    monkeypatch.setattr(writing, "finalize_writing_evaluation", lambda evaluation_id: None)
    monkeypatch.setattr(model_pricing, "get_prices", lambda: PRICES)

    async def grade_without_scores(evaluation_id, run_id, essay, task_no):
        return {"scores": {}, "trace_id": "t5", "input_hash": None,
                "usage": [{"model": "qwen-flash", "input_tokens": 400, "output_tokens": 40}]}

    monkeypatch.setattr(writing, "_grade_or_reuse", grade_without_scores)
    asyncio.run(writing.grade_writing_task(None, "e1", "r1", "es1", 2))
    run = db.tables["grading_runs"][0]
    assert run["status"] == "failed" and "missing score" in run["error"]
    assert run["input_tokens"] == 400 and run["trace_id"] == "t5" and run["cost_usd"] is not None


# ---------- báo cáo chi phí ----------
def _runs():
    def run(day, model, skill, i, o, cost, status="done"):
        return {"id": f"{day}-{model}-{skill}-{i}", "started_at": f"2026-11-{day}T05:00:00+00:00", "model": model,
                "status": status, "input_tokens": i, "output_tokens": o, "cost_usd": cost,
                "evaluations": {"skill": skill}}
    return [run("03", "qwen-flash", "writing", 100, 10, 0.5), run("03", "qwen-flash", "speaking", 200, 20, 0.25),
            run("04", "qwen3.7-plus", "writing", 300, 30, None), run("04", "qwen-flash", "writing", 50, 5, 0.125, "failed"),
            # 20:00 UTC ngày 30/11 = 03:00 ngày 1/12 giờ VN: thuộc tháng 12
            {"id": "edge", "started_at": "2026-11-30T20:00:00+00:00", "model": "qwen-flash", "status": "done",
             "input_tokens": 1, "output_tokens": 1, "cost_usd": 1.0, "evaluations": {"skill": "writing"}},
            {"id": "running", "started_at": "2026-11-05T05:00:00+00:00", "model": "qwen-flash", "status": "running",
             "input_tokens": None, "output_tokens": None, "cost_usd": None, "evaluations": {"skill": "writing"}}]


@pytest.fixture
def report_db(monkeypatch):
    db = RichFakeSupabase(grading_runs=_runs(), system_settings=[
        {"key": "ai_model_prices", "value": {"qwen-flash": PRICES["qwen-flash"], "qwen3.7-plus": PRICES["free-model"]}},
        {"key": "ai_monthly_budget_usd", "value": 1.0}])
    monkeypatch.setattr(ai_usage_report, "db", lambda: db)
    monkeypatch.setattr(model_pricing, "db", lambda: db)
    return db


@pytest.mark.parametrize("group_by", ["day", "model", "skill"])
def test_group_totals_equal_month_total(report_db, group_by):
    report = ai_usage_report.usage_report("2026-11", group_by)
    total = report["total"]
    assert total["runs"] == 4 and total["input_tokens"] == 650 and total["output_tokens"] == 65
    assert total["cost_usd"] == pytest.approx(0.875) and total["unknown_cost_runs"] == 1
    for field in ("input_tokens", "output_tokens", "runs", "unknown_cost_runs"):
        assert sum(r[field] for r in report["rows"]) == total[field]
    assert sum(r["cost_usd"] for r in report["rows"]) == pytest.approx(total["cost_usd"])


def test_report_groups_days_in_vietnam_time_and_flags_unpriced_models(report_db):
    report = ai_usage_report.usage_report("2026-11", "day")
    assert [r["key"] for r in report["rows"]] == ["2026-11-03", "2026-11-04"]
    assert report["models_without_price"] == ["qwen3.7-plus"]
    december = ai_usage_report.usage_report("2026-12", "day")
    assert [r["key"] for r in december["rows"]] == ["2026-12-01"]


def test_report_budget_state(report_db):
    budget = ai_usage_report.usage_report("2026-11", "model")["budget"]
    assert budget["state"] == "warning" and budget["percent"] == 87.5      # 0.875 / 1.0


def test_unpriced_models_come_from_usage_and_skip_legacy_runs_without_tokens(monkeypatch):
    """Lượt dùng nhiều model: model phụ chưa có giá phải được chỉ ra; nhãn cũ của lượt trước spec 008 (không token) bỏ qua."""
    runs = [
        {"id": "a", "started_at": "2026-11-05T03:00:00+00:00", "model": "qwen3.7-plus", "status": "done",
         "input_tokens": 100, "output_tokens": 10, "cost_usd": None, "evaluations": {"skill": "writing"},
         "output": {"usage": [{"model": "qwen3.7-plus", "input_tokens": 60, "output_tokens": 5},
                              {"model": "qwen-flash", "input_tokens": 40, "output_tokens": 5}]}},
        {"id": "b", "started_at": "2026-11-05T04:00:00+00:00", "model": "ta=qwen-flash; cc,lr,gra=qwen3.7-plus",
         "status": "done", "input_tokens": None, "output_tokens": None, "cost_usd": None,
         "evaluations": {"skill": "writing"}, "output": {}},
    ]
    db = RichFakeSupabase(grading_runs=runs, system_settings=[
        {"key": "ai_model_prices", "value": {"qwen3.7-plus": PRICES["qwen-flash"], "qwen-flash": {"input_per_1m": None, "output_per_1m": None}}}])
    monkeypatch.setattr(ai_usage_report, "db", lambda: db)
    monkeypatch.setattr(model_pricing, "db", lambda: db)
    assert ai_usage_report.usage_report("2026-11", "model")["models_without_price"] == ["qwen-flash"]


def test_runs_graded_before_token_tracking_are_counted_apart_from_unpriced_ones(report_db):
    """Lượt cũ không có token: chưa rõ chi phí vì thiếu số token, không phải vì thiếu giá model."""
    report_db.tables["grading_runs"].append(
        {"id": "legacy", "started_at": "2026-11-02T05:00:00+00:00", "model": "ta=a; cc,lr,gra=b", "status": "done",
         "input_tokens": None, "output_tokens": None, "cost_usd": None, "evaluations": {"skill": "writing"}})
    total = ai_usage_report.usage_report("2026-11", "day")["total"]
    assert total["unknown_cost_runs"] == 2 and total["no_usage_runs"] == 1
