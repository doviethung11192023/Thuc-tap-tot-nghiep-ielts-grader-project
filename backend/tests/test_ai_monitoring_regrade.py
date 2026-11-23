"""Chạy lại chấm AI (US3): xem trước, bỏ trùng, giới hạn 50, đẩy hàng đợi, không chặn khi vượt ngân sách."""
import asyncio
from datetime import datetime, timedelta, timezone

import pytest

from app.core.domain_errors import DomainError
from app.services.ai_monitoring import ai_usage_report, model_pricing, regrade_service as regrade
from ai_monitoring_test_support import ADMIN_ID, RichFakeSupabase

A = [f"00000000-0000-0000-0000-{i:012d}" for i in range(60)]


@pytest.fixture
def db(monkeypatch):
    fake = RichFakeSupabase(
        attempts=[{"id": A[0], "skill": "writing", "status": "scored"},
                  {"id": A[1], "skill": "writing", "status": "grading_failed"},
                  {"id": A[2], "skill": "speaking", "status": "scored"},
                  {"id": A[3], "skill": "speaking", "status": "grading"},
                  {"id": A[4], "skill": "speaking", "status": "no_speech"},
                  {"id": A[5], "skill": "reading", "status": "scored"},
                  {"id": A[6], "skill": "writing", "status": "in_progress"}],
        essays=[{"attempt_id": A[0], "content": "task one"}, {"attempt_id": A[0], "content": "task two"},
                {"attempt_id": A[1], "content": "only one"}, {"attempt_id": A[1], "content": "   "}],
        grading_runs=[{"id": "r1", "status": "done", "started_at": "2026-11-20T00:00:00+00:00", "cost_usd": 0.02,
                       "evaluations": {"skill": "writing"}},
                      {"id": "r2", "status": "done", "started_at": "2026-11-20T00:00:00+00:00", "cost_usd": 0.04,
                       "evaluations": {"skill": "writing"}},
                      {"id": "r3", "status": "done", "started_at": "2026-11-20T00:00:00+00:00", "cost_usd": 0.10,
                       "evaluations": {"skill": "speaking"}}],
        system_settings=[{"key": "ai_monthly_budget_usd", "value": 10}, {"key": "ai_model_prices", "value": {}}])
    for module in (regrade, model_pricing, ai_usage_report):
        monkeypatch.setattr(module, "db", lambda: fake)
    monkeypatch.setattr(regrade, "now_vn", lambda: datetime(2026, 11, 22, tzinfo=timezone(timedelta(hours=7))))
    monkeypatch.setattr(regrade, "month_cost_usd", lambda: 0.0)
    return fake


def _reasons(result):
    return {s["attempt_id"]: s["reason"] for s in result["skipped"]}


def test_preview_lists_runnable_and_skipped_with_reasons(db):
    result = regrade.preview([A[0], A[1], A[2], A[3], A[4], A[5], A[6], A[1], "00000000-0000-0000-0000-999999999999"])
    assert [a["attempt_id"] for a in result["to_regrade"]] == [A[0], A[1], A[2]]
    assert _reasons(result) == {A[3]: "grading", A[4]: "no_speech", A[5]: "not_ai_graded", A[6]: "not_submitted",
                                A[1]: "duplicate", "00000000-0000-0000-0000-999999999999": "not_found"}


def test_preview_estimates_cost_per_skill_average_times_task_count(db):
    result = regrade.preview([A[0], A[1], A[2]])
    # Writing: trung bình 0.03/lượt; A0 có 2 task, A1 chỉ 1 task có chữ; Speaking: 0.10
    assert result["estimated_cost_usd"] == pytest.approx(0.03 * 2 + 0.03 * 1 + 0.10)


def test_preview_cost_is_unknown_without_history_for_a_skill(db):
    db.tables["grading_runs"][:] = [r for r in db.tables["grading_runs"] if r["evaluations"]["skill"] == "writing"]
    assert regrade.preview([A[2]])["estimated_cost_usd"] is None
    assert regrade.preview([])["estimated_cost_usd"] == 0.0


def test_preview_reports_budget_state_and_never_writes(db, monkeypatch):
    monkeypatch.setattr(regrade, "month_cost_usd", lambda: 12.0)
    before = {name: [dict(r) for r in rows] for name, rows in db.tables.items()}
    result = regrade.preview([A[0]])
    assert result["budget"] == {"state": "exceeded", "percent": 120.0}
    # DB giả tạo bảng rỗng khi đọc; so phần có dữ liệu
    assert {k: v for k, v in db.tables.items() if v} == {k: v for k, v in before.items() if v}
    assert not db.tables.get("audit_logs")


def test_more_than_50_after_dedupe_is_rejected_but_duplicates_do_not_count(db):
    with pytest.raises(DomainError) as caught:
        regrade.preview(A[:51])
    assert caught.value.status_code == 422 and "50" in caught.value.detail
    assert len(regrade.preview(A[:50] + A[:10])["skipped"]) >= 10        # 10 bản sao vẫn chấp nhận được


class Queue:
    def __init__(self):
        self.jobs = []

    async def enqueue_job(self, function, run_id, _job_id=None, _queue_name=None):
        self.jobs.append((run_id, _queue_name))


@pytest.fixture
def rpc(db):
    """Giả start_ai_regrade: queued cho scored/grading_failed, còn lại bỏ qua; ghi lại tham số."""
    calls = []

    def start(p_attempt_id, p_admin_id, p_batch_id=None):
        calls.append({"attempt": p_attempt_id, "admin": p_admin_id, "batch": p_batch_id})
        attempt = next((a for a in db.tables["attempts"] if a["id"] == p_attempt_id), None)
        if attempt is None:
            return {"status": "skipped", "reason": "not_found"}
        if attempt["status"] not in ("scored", "grading_failed"):
            return {"status": "skipped", "reason": "grading"}
        tasks = [1, 2] if attempt["skill"] == "writing" else [None]
        return {"status": "queued", "skill": attempt["skill"], "mode": "practice", "evaluation_id": f"ev-{p_attempt_id[-2:]}",
                "runs": [{"run_id": f"run-{p_attempt_id[-2:]}-{t}", "task_no": t} for t in tasks]}

    db._rpc_start_ai_regrade = start
    db.calls = calls
    return db


def test_run_queues_every_run_on_its_skill_queue_with_a_shared_batch_id(rpc, monkeypatch):
    queue = Queue()
    monkeypatch.setattr("app.services.grading.grading_queue.queue_for_skill", lambda s: f"q-{s}")
    result = asyncio.run(regrade.run_regrade(ADMIN_ID, [A[0], A[2], A[3], A[0]], queue))
    assert [q["attempt_id"] for q in result["queued"]] == [A[0], A[2]]
    assert result["queued"][0]["run_ids"] == ["run-00-1", "run-00-2"]
    assert [j[0] for j in queue.jobs] == ["run-00-1", "run-00-2", "run-02-None"]
    assert _reasons(result) == {A[0]: "duplicate", A[3]: "grading"}
    batch_ids = {c["batch"] for c in rpc.calls}
    assert result["batch_id"] and batch_ids == {result["batch_id"]}
    assert {c["admin"] for c in rpc.calls} == {ADMIN_ID}


def test_single_attempt_has_no_batch_id_and_still_runs_over_budget(rpc, monkeypatch):
    monkeypatch.setattr(regrade, "month_cost_usd", lambda: 1000.0)
    result = asyncio.run(regrade.run_regrade(ADMIN_ID, [A[1]], Queue()))
    assert result["batch_id"] is None and len(result["queued"]) == 1
    assert rpc.calls[0]["batch"] is None


def test_nothing_queued_returns_no_batch(rpc):
    result = asyncio.run(regrade.run_regrade(ADMIN_ID, [A[3], A[4]], Queue()))
    assert result["queued"] == [] and result["batch_id"] is None


def test_preview_skips_scored_attempt_with_running_regrade_and_speaking_without_audio(db):
    """US3 kịch bản 5: bài đang chạy lại (attempt vẫn scored) và Speaking đã xoá audio phải hiện ở bỏ qua."""
    db.tables.setdefault("evaluations", []).append({"id": "ev-run", "attempt_id": A[0], "evaluator_type": "ai"})
    db.tables["grading_runs"].append({"id": "r-run", "evaluation_id": "ev-run", "status": "running",
                                      "started_at": "2026-11-22T00:00:00+00:00"})
    db.tables.setdefault("speaking_responses", []).append(
        {"attempt_id": A[2], "audio_deleted_at": "2026-11-01T00:00:00+00:00"})
    result = regrade.preview([A[0], A[1], A[2]])
    assert [a["attempt_id"] for a in result["to_regrade"]] == [A[1]]
    assert _reasons(result) == {A[0]: "grading", A[2]: "audio_deleted"}
