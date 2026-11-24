"""Pentest & unit tests for allowed_mode catalog exposure, start_attempt mode lock, and MoonBot AI mock guard."""
from unittest.mock import MagicMock, patch
import pytest

from app.core.domain_errors import ConflictError, ForbiddenError, InvalidRequestError
from app.services.practice import practice_attempt_lifecycle, practice_catalog
from app.services.tutor.tutor_context_builder import verify_practice_attempt


def _fake_db_with_learner():
    mock_db = MagicMock()
    learner_q = MagicMock()
    learner_q.select.return_value.eq.return_value.execute.return_value.data = [{"user_id": "u1"}]
    mock_db.table.side_effect = lambda name: learner_q if name == "learner_profiles" else MagicMock()
    return mock_db


def test_start_attempt_blocks_practice_on_mock_only_test():
    """PM-PT01: Mock-only test MUST reject mode='practice' with InvalidRequestError (HTTP 400)."""
    test_row = {"id": "t-mock-1", "skill": "reading", "status": "published", "allowed_mode": "mock", "duration_minutes": 60}
    with patch.object(practice_attempt_lifecycle, "db", return_value=_fake_db_with_learner()):
        with pytest.raises(InvalidRequestError) as exc:
            practice_attempt_lifecycle.start_attempt("u1", test_row, "practice")
        assert "practice" in str(exc.value).lower()


def test_start_attempt_blocks_mock_on_practice_only_test():
    """PM-PT02: Practice-only test MUST reject mode='mock' with InvalidRequestError (HTTP 400)."""
    test_row = {"id": "t-prac-7", "skill": "reading", "status": "published", "allowed_mode": "practice", "duration_minutes": 60}
    with patch.object(practice_attempt_lifecycle, "db", return_value=_fake_db_with_learner()):
        with pytest.raises(InvalidRequestError) as exc:
            practice_attempt_lifecycle.start_attempt("u1", test_row, "mock")
        assert "mock" in str(exc.value).lower()


def test_verify_practice_attempt_blocks_mock_attempt_from_moonbot():
    """PM-PT03: MoonBot AI MUST hard-block mock attempts with ForbiddenError (HTTP 403)."""
    cfg = {"enabled": True, "enabled_skills": ["reading", "listening"]}
    mock_attempt = {"id": "att-1", "learner_id": "u1", "test_id": "t1", "skill": "reading", "mode": "mock", "status": "in_progress"}
    with patch("app.services.tutor.tutor_context_builder.get_owned_attempt", return_value=mock_attempt):
        with pytest.raises(ForbiddenError) as exc:
            verify_practice_attempt("att-1", "u1", cfg)
        assert "mock" in str(exc.value).lower() or "phòng thi" in str(exc.value).lower()


def test_verify_practice_attempt_allows_reading_practice_attempt():
    """PM-PT04: Valid reading practice attempt MUST pass MoonBot AI guard."""
    cfg = {"enabled": True, "enabled_skills": ["reading", "listening"]}
    prac_attempt = {"id": "att-2", "learner_id": "u1", "test_id": "t7", "skill": "reading", "mode": "practice", "status": "in_progress"}
    with patch("app.services.tutor.tutor_context_builder.get_owned_attempt", return_value=prac_attempt):
        out = verify_practice_attempt("att-2", "u1", cfg)
        assert out["id"] == "att-2"
        assert out["mode"] == "practice"


def test_collection_detail_source_selects_allowed_mode():
    """PM-PT05: collection_detail_source MUST select and preserve allowed_mode for TestPrepModal."""
    mock_db = MagicMock()
    selected_cols = []

    def table_side_effect(name):
        t = MagicMock()
        if name == "test_sets":
            t.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = [{"id": "s1", "name": "Cam 19"}]
        elif name == "tests":
            def capture_select(cols, **kwargs):
                selected_cols.append(cols)
                q = MagicMock()
                q.eq.return_value.eq.return_value.order.return_value.execute.return_value.data = [
                    {"id": "t1", "title": "Test 1", "skill": "reading", "duration_minutes": 60, "allowed_mode": "mock", "status": "published", "created_at": "2026-01-01"}
                ]
                return q
            t.select.side_effect = capture_select
        return t

    mock_db.table.side_effect = table_side_effect
    with patch.object(practice_catalog, "db", return_value=mock_db):
        res = practice_catalog.collection_detail_source("s1", None)
    assert res is not None
    _, tests, _ = res
    assert any("allowed_mode" in c for c in selected_cols)
    assert tests[0]["allowed_mode"] == "mock"


def test_start_attempt_maps_mock_already_taken_to_409_conflict():
    """PM-PT06: UC-08 blocks direct unstarted Mock creation with ConflictError (409) and returns closed=True when finished."""
    from tests.fake_supabase import FakeSupabase

    test_row = {"id": "t-mock-1", "skill": "reading", "status": "published", "allowed_mode": "mock", "duration_minutes": 60}
    fake_unstarted = FakeSupabase(learner_profiles=[{"user_id": "u1"}], attempts=[])
    with patch.object(practice_attempt_lifecycle, "db", return_value=fake_unstarted):
        with pytest.raises(ConflictError) as exc:
            practice_attempt_lifecycle.start_attempt("u1", test_row, "mock")
        assert "ngẫu nhiên" in str(exc.value).lower()

    done_attempt = {
        "id": "a-done",
        "learner_id": "u1",
        "test_id": "t-mock-1",
        "skill": "reading",
        "mode": "mock",
        "status": "scored",
        "auto_submitted": False,
        "submitted_at": "2026-11-10T01:00:00+00:00",
        "started_at": "2026-11-10T00:00:00+00:00",
    }
    fake_finished = FakeSupabase(learner_profiles=[{"user_id": "u1"}], attempts=[done_attempt])
    with patch.object(practice_attempt_lifecycle, "db", return_value=fake_finished):
        closed_res = practice_attempt_lifecycle.start_attempt("u1", test_row, "mock")
        assert closed_res["closed"] is True
        assert closed_res["attempt_id"] == "a-done"

