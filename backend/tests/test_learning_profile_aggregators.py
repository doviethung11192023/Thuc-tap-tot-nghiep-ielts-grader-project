from datetime import datetime, timedelta, timezone
from app.services.learning_profile import overview_aggregator, practice_aggregator
from app.services.learning_profile.common import _cache


def _mock_attempts():
    now = datetime.now(timezone.utc)
    recent = now.isoformat()
    return [
        # Writing: 4.5, 6.5 -> avg 5.5
        {"id": "a1", "test_id": "t1", "skill": "writing", "mode": "practice", "status": "scored",
         "band": 4.5, "raw_score": None, "started_at": recent, "submitted_at": recent, "tests": {"title": "W1"}},
        {"id": "a2", "test_id": "t2", "skill": "writing", "mode": "practice", "status": "scored",
         "band": 6.5, "raw_score": None, "started_at": recent, "submitted_at": recent, "tests": {"title": "W2"}},
        # Reading: blank 0.0 and real 2.0 -> avg 2.0 (blank 0.0 skipped when positive attempts exist)
        {"id": "a3", "test_id": "t3", "skill": "reading", "mode": "practice", "status": "scored",
         "band": 0.0, "raw_score": 0, "started_at": recent, "submitted_at": recent, "tests": {"title": "R1"}},
        {"id": "a4", "test_id": "t4", "skill": "reading", "mode": "practice", "status": "scored",
         "band": 2.0, "raw_score": 2, "started_at": recent, "submitted_at": recent, "tests": {"title": "R2"}},
        # Listening: only 0.0 -> skill average 0.0, excluded from overall average
        {"id": "a5", "test_id": "t5", "skill": "listening", "mode": "mock", "status": "scored",
         "band": 0.0, "raw_score": 0, "started_at": recent, "submitted_at": recent, "tests": {"title": "L1"}},
    ]


def test_overview_and_practice_consistent_averages(monkeypatch):
    _cache.clear()
    attempts = _mock_attempts()
    goal = {"input_band": 5.0, "target_overall": 7.5, "test_date": "2026-12-31"}

    monkeypatch.setattr(overview_aggregator, "get_user_attempts", lambda uid: attempts)
    monkeypatch.setattr(overview_aggregator, "get_learner_goal", lambda uid: goal)
    monkeypatch.setattr(practice_aggregator, "get_user_attempts", lambda uid: attempts)
    monkeypatch.setattr(practice_aggregator, "compute_question_type_accuracy",
                        lambda uid, s: {"report": [], "highlights": {}})

    ov = overview_aggregator.compute_learning_profile_overview("u1")
    pr = practice_aggregator.compute_learning_profile_test_practice("u1")

    radar = {r["skill"]: r["score"] for r in ov["radar_data"]}
    assert radar["Writing"] == pr["skill_averages"]["Writing"]["average"] == 5.5
    assert radar["Reading"] == pr["skill_averages"]["Reading"]["average"] == 2.0
    assert radar["Listening"] == pr["skill_averages"]["Listening"]["average"] == 0.0
    assert radar["Speaking"] == 0.0
    assert pr["skill_averages"]["Speaking"]["average"] is None
    # Overall only averages skills with real scores (> 0): (5.5 + 2.0) / 2 = 3.75 -> 4.0
    assert radar["Overview"] == 4.0
    # No prev_week attempts -> delta must be None (never hardcoded 0.5)
    assert pr["skill_averages"]["Writing"]["delta"] is None


def test_writing_zero_attempts_does_not_fallback_to_input_band(monkeypatch):
    _cache.clear()
    monkeypatch.setattr(overview_aggregator, "get_user_attempts", lambda uid: [])
    monkeypatch.setattr(overview_aggregator, "get_learner_goal",
                        lambda uid: {"input_band": 5.0, "target_overall": 7.0, "test_date": "2026-12-31"})

    ov = overview_aggregator.compute_learning_profile_overview("u_empty")
    radar = {r["skill"]: r["score"] for r in ov["radar_data"]}
    assert radar["Writing"] == 0.0
    assert radar["Overview"] == 0.0
    assert ov["dashboard_stats"]["avg_band"] == 0.0


def test_question_type_aggregator_no_fake_zero_percent_improved(monkeypatch):
    from app.services.learning_profile import question_type_aggregator

    scored = [
        {"id": "r1", "skill": "reading", "mode": "practice", "status": "scored", "band": 2.0, "started_at": "2026-11-10"},
        {"id": "w1", "skill": "writing", "mode": "practice", "status": "scored", "band": 5.5, "started_at": "2026-11-11"},
    ]
    fake_answers = [
        {"attempt_id": "r1", "question_id": "q1", "is_correct": False, "question_type": "completion", "question_subtype": ""},
        {"attempt_id": "r1", "question_id": "q2", "is_correct": False, "question_type": "matching", "question_subtype": ""},
    ]
    monkeypatch.setattr(question_type_aggregator.learning_profile_readers, "answers_with_types", lambda ids: fake_answers)
    res = question_type_aggregator.compute_question_type_accuracy("u1", scored)

    skills_in_report = {row["skill"] for row in res["report"]}
    assert "Reading" in skills_in_report
    assert "Writing" in skills_in_report
    assert res["highlights"]["most_improved"]["accuracy_rate"] > 0
    assert "0%" not in res["highlights"]["most_improved"]["delta_badge"]
