"""Tự nộp bài Mock quá hạn và nộp muộn bằng bài đã lưu (FR-11, FR-12, BR-21; spec 004)."""
import asyncio
from datetime import datetime, timedelta, timezone

import pytest

from app.core.domain_errors import ConflictError, InvalidRequestError
from app.services.practice import attempt_saved_work, mock_auto_submit
from app.services.writing import writing_attempt_service
from tests.fake_supabase import FakeSupabase


def _iso(**delta) -> str:
    return (datetime.now(timezone.utc) + timedelta(**delta)).isoformat()


class RecordingRedis:
    def __init__(self):
        self.jobs = []

    async def enqueue_job(self, function, run_id, _job_id=None, _queue_name=None):
        self.jobs.append((run_id, _queue_name))


@pytest.fixture
def fake(monkeypatch):
    client = FakeSupabase(attempts=[], essays=[])
    monkeypatch.setattr(writing_attempt_service, "db", lambda: client)
    monkeypatch.setattr(writing_attempt_service, "load_writing_task_sections",
                        lambda test_id: {1: "sec-t1", 2: "sec-t2"})
    return client


def _writing_mock(client, deadline, essays=()):
    client.tables["attempts"].append({"id": "w1", "test_id": "t", "skill": "writing", "mode": "mock",
                                      "status": "in_progress", "deadline_at": deadline})
    for task_no, content in essays:
        client.tables["essays"].append({"id": f"e{task_no}", "attempt_id": "w1", "task_no": task_no, "content": content})
    return dict(client.tables["attempts"][0])


# ---------- Writing: nộp muộn chấm bài đã lưu ----------
def test_late_writing_submit_grades_the_saved_essay_not_the_late_text(fake):
    attempt = _writing_mock(fake, _iso(minutes=-5), essays=[(2, "saved before the deadline")])
    sub = writing_attempt_service.submit_writing(attempt, None, "typed after the deadline", None)
    assert sub["status"] == "grading" and len(sub["run_ids"]) == 1
    assert fake.tables["essays"][0]["content"] == "saved before the deadline"
    assert fake.tables["attempts"][0]["auto_submitted"] is True


def test_on_time_submit_uses_the_text_sent_by_the_learner(fake):
    attempt = _writing_mock(fake, _iso(minutes=30), essays=[(2, "old draft")])
    sub = writing_attempt_service.submit_writing(attempt, None, "final text", None)
    assert sub["status"] == "grading"
    assert [e["content"] for e in fake.tables["essays"]] == ["final text"]
    assert fake.tables["attempts"][0]["auto_submitted"] is False


def test_on_time_empty_submit_is_refused(fake):
    attempt = _writing_mock(fake, _iso(minutes=30))
    with pytest.raises(InvalidRequestError):
        writing_attempt_service.submit_writing(attempt, "", "  ", None)


def test_overdue_mock_with_nothing_saved_ends_abandoned_without_grading(fake):
    attempt = _writing_mock(fake, _iso(minutes=-5))
    sub = writing_attempt_service.submit_writing(attempt, None, None, None, auto=True)
    assert sub["status"] == "abandoned" and sub["run_ids"] == [] and sub["essays"] == []
    assert not fake.tables.get("evaluations")


# ---------- Cron tự nộp ----------
def test_cron_submits_each_overdue_mock_by_skill_and_queues_grading(monkeypatch):
    attempts = [{"id": "r1", "skill": "reading"}, {"id": "w1", "skill": "writing"},
                {"id": "s1", "skill": "speaking"}, {"id": "s2", "skill": "speaking"}]
    calls = []
    monkeypatch.setattr(mock_auto_submit, "overdue_mock_attempts", lambda: attempts)
    monkeypatch.setattr(mock_auto_submit, "submit_lr",
                        lambda a, answers, parts, auto: calls.append(("lr", a["id"], auto, answers, parts)))
    monkeypatch.setattr(mock_auto_submit, "submit_writing",
                        lambda a, t1, t2, e, auto: {"status": "grading", "run_ids": ["run-w1a", "run-w1b"]})

    def fake_speaking(a, auto):
        if a["id"] == "s2":
            raise ConflictError("Bài thi đã được nộp trước đó")     # Learner nộp tay cùng lúc
        return {"status": "grading", "job": {"runs": [{"run_id": "run-s1"}]}}
    monkeypatch.setattr(mock_auto_submit, "submit_speaking", fake_speaking)

    redis = RecordingRedis()
    counts = asyncio.run(mock_auto_submit.auto_submit_overdue_mocks(redis))
    assert counts == {"scored": 1, "grading": 2, "skipped": 1}
    assert calls == [("lr", "r1", True, {}, None)]       # L/R: không có đáp án client, chấm phần đã lưu
    assert [run for run, _ in redis.jobs] == ["run-w1a", "run-w1b", "run-s1"]


def test_one_broken_attempt_does_not_block_the_others(monkeypatch):
    monkeypatch.setattr(mock_auto_submit, "overdue_mock_attempts",
                        lambda: [{"id": "w1", "skill": "writing"}, {"id": "w2", "skill": "writing"}])

    def flaky(a, *_, auto):
        if a["id"] == "w1":
            raise RuntimeError("db down")
        return {"status": "abandoned", "run_ids": []}
    monkeypatch.setattr(mock_auto_submit, "submit_writing", flaky)
    counts = asyncio.run(mock_auto_submit.auto_submit_overdue_mocks(RecordingRedis()))
    assert counts == {"failed": 1, "abandoned": 1}


# ---------- Lưu bài ----------
@pytest.mark.parametrize("value", ["library", ["A", "C"], None])
def test_saved_answer_round_trips_with_its_type(value):
    assert attempt_saved_work._decode(attempt_saved_work._encode(value)) == value


def test_cannot_save_after_submission_or_after_the_deadline():
    with pytest.raises(ConflictError):
        attempt_saved_work.save_work({"status": "grading", "skill": "writing"}, None, "x", None)
    with pytest.raises(ConflictError):
        attempt_saved_work.save_work({"status": "in_progress", "skill": "writing", "deadline_at": _iso(minutes=-2)},
                                     None, "x", None)
