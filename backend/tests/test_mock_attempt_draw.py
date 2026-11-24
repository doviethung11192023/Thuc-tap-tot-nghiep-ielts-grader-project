"""Mock chọn đề ngẫu nhiên (UC-08): Learner không tự chọn đề Mock, hết đề thì từ chối."""
import pytest

from app.core.domain_errors import ConflictError, ForbiddenError, InvalidRequestError
from app.services.practice import mock_attempt_draw, practice_attempt_lifecycle
from tests.fake_supabase import FakeSupabase


class ExhaustedPool(FakeSupabase):
    def _rpc_start_mock_attempt(self, p_learner_id, p_skill):
        raise RuntimeError("{'message': 'mock_pool_exhausted', 'code': '23514'}")


class DrawingPool(FakeSupabase):
    def _rpc_start_mock_attempt(self, p_learner_id, p_skill):
        return {"id": "a1", "test_id": "t-random", "skill": p_skill, "started_at": "2026-11-09T00:00:00+00:00",
                "deadline_at": "2026-11-09T01:00:00+00:00", "resumed": False}


def _use(monkeypatch, client):
    monkeypatch.setattr(mock_attempt_draw, "db", lambda: client)
    monkeypatch.setattr(practice_attempt_lifecycle, "db", lambda: client)
    return client


def test_new_mock_gets_the_test_drawn_by_the_server(monkeypatch):
    _use(monkeypatch, DrawingPool(learner_profiles=[{"user_id": "u1"}]))
    data = mock_attempt_draw.start_random_mock("u1", "reading")
    assert data["test_id"] == "t-random" and data["mode"] == "mock" and data["saved_work"] == {}


def test_used_up_pool_is_refused_with_a_clear_message(monkeypatch):
    _use(monkeypatch, ExhaustedPool(learner_profiles=[{"user_id": "u1"}]))
    with pytest.raises(ConflictError, match="hết đề thi thử"):
        mock_attempt_draw.start_random_mock("u1", "writing")


def test_only_learners_and_known_skills(monkeypatch):
    _use(monkeypatch, DrawingPool(learner_profiles=[]))
    with pytest.raises(ForbiddenError):
        mock_attempt_draw.start_random_mock("admin", "reading")
    with pytest.raises(InvalidRequestError):
        mock_attempt_draw.start_random_mock("u1", "grammar")


def test_learner_cannot_pick_a_mock_test_by_id(monkeypatch):
    _use(monkeypatch, FakeSupabase(learner_profiles=[{"user_id": "u1"}], attempts=[]))
    test = {"id": "t1", "skill": "reading", "status": "published", "allowed_mode": "mock"}
    with pytest.raises(ConflictError, match="ngẫu nhiên"):
        practice_attempt_lifecycle.start_attempt("u1", test, "mock")


def test_unfinished_mock_can_be_resumed_by_id(monkeypatch):
    open_mock = {"id": "a1", "learner_id": "u1", "test_id": "t1", "skill": "reading", "mode": "mock",
                 "status": "in_progress", "started_at": "2026-11-09T00:00:00+00:00",
                 "deadline_at": "2026-11-09T01:00:00+00:00"}
    _use(monkeypatch, FakeSupabase(learner_profiles=[{"user_id": "u1"}], attempts=[open_mock]))
    test = {"id": "t1", "skill": "reading", "status": "published", "allowed_mode": "mock"}
    assert practice_attempt_lifecycle.start_attempt("u1", test, "mock")["attempt_id"] == "a1"


def test_returning_to_a_finished_mock_points_to_its_result(monkeypatch):
    done = {"id": "a9", "learner_id": "u1", "test_id": "t1", "skill": "writing", "mode": "mock",
            "status": "grading", "auto_submitted": True, "submitted_at": "2026-11-09T01:00:00+00:00",
            "started_at": "2026-11-09T00:00:00+00:00"}
    _use(monkeypatch, FakeSupabase(learner_profiles=[{"user_id": "u1"}], attempts=[done]))
    test = {"id": "t1", "skill": "writing", "status": "published", "allowed_mode": "mock"}
    data = practice_attempt_lifecycle.start_attempt("u1", test, "mock")
    assert data["closed"] and data["attempt_id"] == "a9" and data["auto_submitted"]
