"""Hàng đợi chấm: job trùng vô hại, lỗi hàng đợi không làm hỏng bài nộp, cron cứu lượt chấm bị bỏ rơi."""
import asyncio
from datetime import datetime, timedelta, timezone

import pytest

from app.core.null_redis_cache import NullRedisCache
from app.services.grading import grading_run_executor as executor
from app.services.grading import stale_grading_run_recovery as recovery
from app.services.grading.grading_queue import (
    GRADING_LEASE_SECONDS, SPEAKING_QUEUE, WRITING_QUEUE, enqueue_grading_run,
)
from app.services.practice import ai_evaluation_outcome
from app.services.speaking import speaking_evaluation_finalizer
from app.services.writing import writing_evaluation_finalizer
from app.worker import tasks
from fake_supabase import FakeSupabase

NOW = datetime(2026, 11, 7, 12, 0, tzinfo=timezone.utc)


def _ago(**delta) -> str:
    return (NOW - timedelta(**delta)).isoformat()


class RecordingRedis:
    def __init__(self):
        self.jobs = []

    async def enqueue_job(self, function, *args, _job_id=None, _queue_name=None):
        self.jobs.append({"function": function, "args": args, "job_id": _job_id, "queue": _queue_name})
        return object()


class BrokenRedis:
    async def enqueue_job(self, *args, **kwargs):
        raise ConnectionError("redis down")


@pytest.fixture
def fake(monkeypatch):
    client = FakeSupabase(
        attempts=[{"id": "a1", "status": "grading", "test_id": "t1"}],
        evaluations=[{"id": "e1", "attempt_id": "a1", "skill": "speaking", "evaluator_type": "ai", "status": "pending"}],
        grading_runs=[{"id": "r1", "evaluation_id": "e1", "task_no": None, "status": "running",
                       "started_at": _ago(minutes=1), "claimed_at": None, "recovery_count": 0}],
    )
    for module in (executor, recovery, ai_evaluation_outcome, speaking_evaluation_finalizer, writing_evaluation_finalizer):
        monkeypatch.setattr(module, "db", lambda: client)

    class FixedDatetime(datetime):
        @classmethod
        def now(cls, tz=None):
            return NOW

    monkeypatch.setattr(recovery, "datetime", FixedDatetime)
    return client


def test_job_goes_to_the_queue_of_its_skill_with_a_stable_id():
    redis = RecordingRedis()
    asyncio.run(enqueue_grading_run(redis, "r1", "speaking"))
    asyncio.run(enqueue_grading_run(redis, "r2", "writing"))
    assert [j["queue"] for j in redis.jobs] == [SPEAKING_QUEUE, WRITING_QUEUE]
    assert redis.jobs[0]["job_id"] == "grading-run:r1" and redis.jobs[0]["args"] == ("r1",)


@pytest.mark.parametrize("redis", [BrokenRedis(), NullRedisCache()])
def test_queue_outage_never_fails_the_submission(redis):
    asyncio.run(enqueue_grading_run(redis, "r1", "writing"))


def test_duplicate_job_is_skipped_while_another_worker_holds_the_lease(fake, monkeypatch):
    calls = []

    async def fake_grade(attempt_id, evaluation_id, run_id):
        calls.append(run_id)

    monkeypatch.setattr(executor, "grade_speaking_attempt", fake_grade)
    assert asyncio.run(executor.execute_grading_run("r1")) == "done"
    assert asyncio.run(executor.execute_grading_run("r1")) == "skipped"
    assert calls == ["r1"]


def test_finished_run_is_never_graded_again(fake, monkeypatch):
    fake.tables["grading_runs"][0]["status"] = "done"
    assert asyncio.run(executor.execute_grading_run("r1")) == "skipped"


def test_graceful_shutdown_releases_the_lease(fake, monkeypatch):
    async def cancelled(*_args):
        raise asyncio.CancelledError()

    monkeypatch.setattr(executor, "grade_speaking_attempt", cancelled)
    with pytest.raises(asyncio.CancelledError):
        asyncio.run(executor.execute_grading_run("r1"))
    assert fake.tables["grading_runs"][0]["claimed_at"] is None


@pytest.mark.parametrize("run, expected", [
    ({"started_at": _ago(seconds=30), "claimed_at": None}, None),
    ({"started_at": _ago(minutes=5), "claimed_at": None}, "requeue"),
    ({"started_at": _ago(hours=1), "claimed_at": _ago(seconds=GRADING_LEASE_SECONDS - 60)}, None),
    ({"started_at": _ago(hours=1), "claimed_at": _ago(seconds=GRADING_LEASE_SECONDS + 60), "recovery_count": 0}, "recover"),
    ({"started_at": _ago(hours=1), "claimed_at": _ago(seconds=GRADING_LEASE_SECONDS + 60), "recovery_count": 2}, "fail"),
])
def test_stale_action(run, expected):
    assert recovery.stale_action(run, NOW) == expected


def test_lost_job_is_requeued(fake):
    fake.tables["grading_runs"][0]["started_at"] = _ago(minutes=5)
    redis = RecordingRedis()
    assert asyncio.run(recovery.recover_stale_grading_runs(redis))["requeued"] == 1
    assert redis.jobs[0]["queue"] == SPEAKING_QUEUE


def test_dead_worker_run_is_released_and_counted(fake):
    fake.tables["grading_runs"][0].update(claimed_at=_ago(hours=1))
    redis = RecordingRedis()
    assert asyncio.run(recovery.recover_stale_grading_runs(redis))["recovered"] == 1
    run = fake.tables["grading_runs"][0]
    assert run["claimed_at"] is None and run["recovery_count"] == 1 and len(redis.jobs) == 1


def test_run_that_keeps_killing_workers_ends_in_grading_failed(fake):
    fake.tables["grading_runs"][0].update(claimed_at=_ago(hours=1), recovery_count=recovery.MAX_RECOVERIES)
    redis = RecordingRedis()
    assert asyncio.run(recovery.recover_stale_grading_runs(redis))["failed"] == 1
    assert fake.tables["grading_runs"][0]["status"] == "failed" and not redis.jobs
    assert fake.tables["attempts"][0]["status"] == "grading_failed"
    assert fake.tables["evaluations"][0]["status"] == "failed"


def test_fresh_run_is_left_alone(fake):
    redis = RecordingRedis()
    assert asyncio.run(recovery.recover_stale_grading_runs(redis)) == {"requeued": 0, "recovered": 0, "failed": 0}
    assert not redis.jobs


def test_speaking_worker_runs_one_job_at_a_time_and_only_writing_worker_has_cron():
    assert tasks.SpeakingWorkerSettings.max_jobs == 1
    assert tasks.SpeakingWorkerSettings.queue_name == SPEAKING_QUEUE
    assert tasks.WorkerSettings.queue_name == WRITING_QUEUE and tasks.WorkerSettings.cron_jobs
    assert not getattr(tasks.SpeakingWorkerSettings, "cron_jobs", None)


def test_lease_outlives_the_job_timeout():
    assert GRADING_LEASE_SECONDS > tasks.WorkerSettings.job_timeout
