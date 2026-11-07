"""Nộp bài và chấm Speaking: chỉ câu đã confirm, không band giả, mọi nhánh kết thúc có trạng thái đúng."""
import asyncio

import pytest

from app.services.practice import ai_evaluation_outcome, practice_attempt_lifecycle
from app.services.speaking import (
    speaking_evaluation_finalizer as finalizer,
    speaking_grading_service as grading,
    speaking_result_views as views,
    speaking_submission_service as submission,
)
from app.services.writing import writing_evaluation_finalizer as writing_finalizer
from fake_supabase import FakeSupabase

CRITERIA = [{"id": f"c{code}", "code": code, "name": code, "skill": "speaking"} for code in ("FC", "LR", "GRA", "P")]
RESULT = {
    "no_speech": False, "model": "qwen-flash", "prompt_versions": {"pr": 2},
    "responses": [{"response_id": "r1", "transcript": "um I like music", "metrics": {"word_count": 4, "note": "x"}}],
    "criteria": {"fc": {"band": 6, "summary": "fc"}, "lr": {"band": 6.5, "summary": "lr"},
                 "gra": {"band": 5.5, "summary": "gra"}, "pr": {"band": 7, "summary": "pr"}},
    "overall": {"overall_summary": "Good effort"}, "pronunciation": {"band": 7},
}


class FakeR2:
    private_bucket_configured = True

    def presign_private_get(self, key, expires_in=600):
        return f"https://signed/{key}"


@pytest.fixture
def fake(monkeypatch):
    client = FakeSupabase(
        attempts=[{"id": "a1", "learner_id": "u1", "test_id": "t1", "status": "in_progress", "mode": "practice",
                   "started_at": "2026-11-06T00:00:00+00:00", "deadline_at": None, "tests": {"title": "Test"}}],
        speaking_responses=[{"id": "r1", "attempt_id": "a1", "speaking_question_id": "q1", "section_id": "s2",
                             "audio_key": "speaking/a1/q1.webm", "duration_ms": 4000,
                             "confirmed_at": "2026-11-06T00:01:00+00:00"},
                            {"id": "r2", "attempt_id": "a1", "speaking_question_id": "q2", "section_id": "s2",
                             "audio_key": "speaking/a1/q2.webm", "duration_ms": None, "confirmed_at": None}],
        speaking_questions=[{"id": "q1", "order_no": 1, "prompt": "Describe a trip."},
                            {"id": "q2", "order_no": 2, "prompt": "Unconfirmed question"}],
        sections=[{"id": "s2", "order_no": 1, "title": "Part 2", "test_id": "t1"}],
        attempt_sections=[{"attempt_id": "a1", "section_id": "s2"}],
        criteria=CRITERIA,
    )
    for module in (submission, grading, finalizer, views, ai_evaluation_outcome, practice_attempt_lifecycle, writing_finalizer):
        monkeypatch.setattr(module, "db", lambda: client)
    monkeypatch.setattr(grading, "r2_storage", FakeR2())
    monkeypatch.setattr(views, "r2_storage", FakeR2())
    return client


def _attempt(client):
    return dict(client.tables["attempts"][0])


def _grade(client, monkeypatch, result=None, error=None):
    sent = {}

    async def fake_call(title, answers):
        sent.update(title=title, answers=answers)
        if error:
            raise error
        return result

    monkeypatch.setattr(grading, "call_ai_grade_speaking", fake_call)
    sub = submission.submit_speaking(_attempt(client))
    job = sub["job"]
    asyncio.run(grading.grade_speaking_attempt("a1", job["evaluation_id"], job["runs"][0]["run_id"]))
    return sent


def test_no_confirmed_answer_is_no_speech_without_grading_job(fake):
    fake.tables["speaking_responses"].clear()
    result = submission.submit_speaking(_attempt(fake))
    assert result["status"] == "no_speech" and result["job"] is None and result["band"] is None
    assert fake.tables["attempts"][0]["status"] == "no_speech"
    assert not fake.tables.get("evaluations")


def test_submit_creates_pending_evaluation_and_speaking_run(fake):
    result = submission.submit_speaking(_attempt(fake))
    assert result["status"] == "grading"
    assert fake.tables["evaluations"][0]["status"] == "pending"
    assert fake.tables["grading_runs"][0]["task_no"] is None


def test_only_confirmed_answers_reach_the_ai_engine_with_signed_urls(fake, monkeypatch):
    sent = _grade(fake, monkeypatch, RESULT)
    assert [a["response_id"] for a in sent["answers"]] == ["r1"]
    assert sent["answers"][0]["audio_url"].startswith("https://signed/")
    assert sent["answers"][0]["part"] == 2     # lấy từ tiêu đề, không phải order_no


def test_success_stores_everything_and_band_is_mean_of_four(fake, monkeypatch):
    _grade(fake, monkeypatch, RESULT)
    assert fake.tables["attempts"][0]["status"] == "scored"
    evaluation = fake.tables["evaluations"][0]
    assert evaluation["overall_band"] == 6.5 and evaluation["is_official"] is True   # 6.25 làm tròn theo BR-02
    assert evaluation["feedback"] == "Good effort"
    assert {s["task_no"] for s in fake.tables["criterion_scores"]} == {0}
    assert len(fake.tables["criterion_scores"]) == 4
    assert fake.tables["speaking_responses"][0]["transcript"] == "um I like music"
    assert fake.tables["speech_metrics"] == [{"id": fake.tables["speech_metrics"][0]["id"], "response_id": "r1",
                                              "name": "word_count", "value": 4}]
    assert fake.tables["grading_runs"][0]["prompt_versions"] == {"pr": 2}


def test_pr_maps_to_criterion_code_p(fake, monkeypatch):
    _grade(fake, monkeypatch, RESULT)
    band_by_id = {s["criterion_id"]: s["band"] for s in fake.tables["criterion_scores"]}
    assert band_by_id["cP"] == 7.0


def test_all_silent_result_becomes_no_speech_with_no_scores(fake, monkeypatch):
    _grade(fake, monkeypatch, {"no_speech": True, "responses": [{"response_id": "r1", "transcript": ""}]})
    assert fake.tables["attempts"][0]["status"] == "no_speech"
    assert fake.tables["evaluations"][0]["status"] == "failed"
    assert not fake.tables.get("criterion_scores")


def test_ai_failure_records_error_and_grading_failed(fake, monkeypatch):
    _grade(fake, monkeypatch, error=RuntimeError("engine down"))
    assert fake.tables["attempts"][0]["status"] == "grading_failed"
    run = fake.tables["grading_runs"][0]
    assert run["status"] == "failed" and "engine down" in run["error"]


def test_missing_criterion_never_produces_a_band(fake, monkeypatch):
    partial = {**RESULT, "criteria": {k: v for k, v in RESULT["criteria"].items() if k != "pr"}}
    _grade(fake, monkeypatch, partial)
    assert fake.tables["attempts"][0]["status"] == "grading_failed"
    assert fake.tables["evaluations"][0].get("overall_band") is None


def test_expert_score_stays_official_after_ai_regrade(fake, monkeypatch):
    fake.tables["evaluations"] = [{"id": "e0", "attempt_id": "a1", "evaluator_type": "expert", "is_official": True}]
    _grade(fake, monkeypatch, RESULT)
    ai = [e for e in fake.tables["evaluations"] if e["evaluator_type"] == "ai"][0]
    assert ai["is_official"] is False


def test_summary_during_grading_has_no_band(fake):
    submission.submit_speaking(_attempt(fake))
    data = views.build_speaking_summary(_attempt(fake))
    assert data["overall_band"] is None and data["speaking"]["grading_done"] is False


def test_writing_finalizer_keeps_its_behaviour(fake):
    fake.tables["attempts"][0]["status"] = "grading"
    fake.tables["evaluations"] = [{"id": "e1", "attempt_id": "a1", "status": "pending", "evaluator_type": "ai"}]
    fake.tables["grading_runs"] = [{"evaluation_id": "e1", "task_no": 2, "status": "done"}]
    fake.tables["criterion_scores"] = [{"evaluation_id": "e1", "task_no": 2, "band": b} for b in (6, 6, 7, 7)]
    writing_finalizer.finalize_writing_evaluation("e1")
    assert fake.tables["evaluations"][0]["overall_band"] == 6.5
    assert fake.tables["attempts"][0]["status"] == "scored"


def _retention_world(monkeypatch, r2):
    from app.services.speaking import speaking_audio_retention as retention
    client = FakeSupabase(
        system_settings=[{"key": "audio_retention_days", "value": 180}],
        speaking_responses=[
            {"id": "old", "attempt_id": "a1", "audio_key": "old.webm", "confirmed_at": "2026-01-01T00:00:00+00:00", "audio_deleted_at": None},
            {"id": "new", "attempt_id": "a1", "audio_key": "new.webm", "confirmed_at": "2099-01-01T00:00:00+00:00", "audio_deleted_at": None},
        ],
    )
    monkeypatch.setattr(retention, "db", lambda: client)
    monkeypatch.setattr(retention, "r2_storage", r2)
    return retention, client


class RetentionR2:
    private_bucket_configured = True

    def __init__(self, fail=False):
        self.fail, self.deleted = fail, []

    def delete_private_object(self, key):
        if self.fail:
            raise RuntimeError("r2 down")
        self.deleted.append(key)


def test_retention_deletes_only_expired_audio_and_keeps_transcript_row(monkeypatch):
    r2 = RetentionR2()
    retention, client = _retention_world(monkeypatch, r2)
    assert retention.purge_expired_speaking_audio() == 1
    assert r2.deleted == ["old.webm"]
    rows = {r["id"]: r for r in client.tables["speaking_responses"]}
    assert rows["old"]["audio_deleted_at"] and rows["new"]["audio_deleted_at"] is None


def test_retention_failure_is_retried_next_run(monkeypatch):
    retention, client = _retention_world(monkeypatch, RetentionR2(fail=True))
    assert retention.purge_expired_speaking_audio() == 0
    assert client.tables["speaking_responses"][0]["audio_deleted_at"] is None


def test_discarding_practice_attempt_removes_its_audio(monkeypatch):
    r2 = RetentionR2()
    retention, _ = _retention_world(monkeypatch, r2)
    retention.delete_attempt_audio("a1")
    assert sorted(r2.deleted) == ["new.webm", "old.webm"]
