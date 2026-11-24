"""Unit & integration tests cho Lộ trình Cá nhân hóa (BR-12, BR-17, Multi-Factor Utility) & Monthly Evolution."""
import pytest
from app.services.learning_profile import common, monthly_aggregator, question_type_aggregator, roadmap_aggregator


@pytest.fixture(autouse=True)
def reset_profile_cache():
    common.clear_all_profile_cache()
    yield
    common.clear_all_profile_cache()


def _base_goal():
    return {
        "input_band": 4.5,
        "target_overall": 6.5,
        "target_listening": 7.0,
        "target_reading": 6.5,
        "target_writing": 6.0,
        "target_speaking": 6.0,
        "test_date": "2027-02-15",
    }


def _sample_tests():
    return [
        {"id": "t-match-easy", "title": "Reading Drill Matching", "skill": "reading", "duration_min": 15, "difficulty": "easy", "source_name": "micro_exercise", "allowed_mode": "practice", "question_types": ["matching"], "task_types": []},
        {"id": "t-tfng-med", "title": "Reading Practice TFNG", "skill": "reading", "duration_min": 45, "difficulty": "medium", "source_name": "cambridge", "allowed_mode": "both", "question_types": ["true_false_not_given"], "task_types": []},
        {"id": "t-mock-hard", "title": "Reading Full Mock Hard", "skill": "reading", "duration_min": 60, "difficulty": "hard", "source_name": "cambridge", "allowed_mode": "both", "question_types": ["completion"], "task_types": []},
    ]


def test_cold_start_learner_diagnostic(monkeypatch):
    monkeypatch.setattr(common, "get_roadmap_config_cached", lambda: {"mock_window": 3, "practice_window": 5, "min_attempts_confidence": 2, "recent_exclude_days": 14, "recommended_count": 3, "tests_per_half_band": 6})
    monkeypatch.setattr(roadmap_aggregator, "get_roadmap_config_cached", lambda: {"mock_window": 3, "practice_window": 5, "min_attempts_confidence": 2, "recent_exclude_days": 14, "recommended_count": 3, "tests_per_half_band": 6})
    monkeypatch.setattr(roadmap_aggregator, "get_all_published_tests", _sample_tests)
    monkeypatch.setattr(roadmap_aggregator, "get_user_answers_cached", lambda uid, ids: [])
    monkeypatch.setattr(roadmap_aggregator, "get_user_criteria_cached", lambda uid, ids: [])

    res = roadmap_aggregator.compute_personalized_roadmap("u-cold", [], _base_goal())
    assert res["predicted_overall"] == 4.5
    assert res["roadmap"]["is_diagnostic"] is True
    assert all(d["confidence"] == "insufficient" for d in res["skill_diagnostics"].values())
    assert len(res["study_milestones"]) >= 2


def test_anti_hallucination_single_micro_drill(monkeypatch):
    """Red-Team Lỗ hổng #1: 1 bài ngắn Reading 9.0 không được kéo Overall lên 9.0."""
    cfg = {"mock_window": 3, "practice_window": 5, "min_attempts_confidence": 2, "recent_exclude_days": 14, "recommended_count": 3, "tests_per_half_band": 6}
    monkeypatch.setattr(roadmap_aggregator, "get_roadmap_config_cached", lambda: cfg)
    monkeypatch.setattr(roadmap_aggregator, "get_all_published_tests", _sample_tests)
    monkeypatch.setattr(roadmap_aggregator, "get_user_answers_cached", lambda uid, ids: [])
    monkeypatch.setattr(roadmap_aggregator, "get_user_criteria_cached", lambda uid, ids: [])

    attempts = [
        {"id": "a1", "test_id": "t-match-easy", "skill": "reading", "mode": "practice", "status": "scored", "band": 9.0, "question_count": 5, "started_at": "2026-11-10T10:00:00+00:00", "submitted_at": "2026-11-10T10:15:00+00:00", "tests": {"difficulty": "easy"}},
    ]
    res = roadmap_aggregator.compute_personalized_roadmap("u-1drill", attempts, _base_goal())
    assert res["predicted_overall"] == 4.5  # chưa đủ min_attempts_confidence (2) -> vẫn neo theo input_band!


def test_ewma_weakness_and_utility_ranking(monkeypatch):
    """Xác minh EWMA chọn đúng dạng sai gần nhất & Utility ranking xếp hạng đề khớp yếu điểm lên đầu."""
    cfg = {"mock_window": 3, "practice_window": 5, "min_attempts_confidence": 2, "recent_exclude_days": 14, "recommended_count": 3, "tests_per_half_band": 6}
    monkeypatch.setattr(roadmap_aggregator, "get_roadmap_config_cached", lambda: cfg)
    monkeypatch.setattr(roadmap_aggregator, "get_all_published_tests", _sample_tests)
    monkeypatch.setattr(roadmap_aggregator, "get_user_criteria_cached", lambda uid, ids: [])

    attempts = [
        {"id": "a-new", "test_id": "t-other-1", "skill": "reading", "mode": "mock", "status": "scored", "band": 5.5, "question_count": 40, "started_at": "2026-11-12T10:00:00+00:00", "submitted_at": "2026-11-12T11:00:00+00:00", "tests": {}},
        {"id": "a-old", "test_id": "t-other-2", "skill": "reading", "mode": "mock", "status": "scored", "band": 5.0, "question_count": 40, "started_at": "2026-11-01T10:00:00+00:00", "submitted_at": "2026-11-01T11:00:00+00:00", "tests": {}},
        {"id": "a-l1", "test_id": "l1", "skill": "listening", "mode": "mock", "status": "scored", "band": 7.0, "question_count": 40, "started_at": "2026-11-02T10:00:00+00:00", "submitted_at": "2026-11-02T10:30:00+00:00", "tests": {}},
        {"id": "a-w1", "test_id": "w1", "skill": "writing", "mode": "mock", "status": "scored", "band": 6.0, "question_count": 2, "started_at": "2026-11-03T10:00:00+00:00", "submitted_at": "2026-11-03T11:00:00+00:00", "tests": {}},
        {"id": "a-s1", "test_id": "s1", "skill": "speaking", "mode": "mock", "status": "scored", "band": 6.0, "question_count": 3, "started_at": "2026-11-04T10:00:00+00:00", "submitted_at": "2026-11-04T10:15:00+00:00", "tests": {}},
    ]
    answers = [
        {"attempt_id": "a-new", "question_id": "q1", "is_correct": False, "question_type": "true_false_not_given", "question_subtype": ""},
        {"attempt_id": "a-new", "question_id": "q2", "is_correct": True, "question_type": "matching", "question_subtype": ""},
        {"attempt_id": "a-old", "question_id": "q3", "is_correct": True, "question_type": "true_false_not_given", "question_subtype": ""},
        {"attempt_id": "a-old", "question_id": "q4", "is_correct": False, "question_type": "matching", "question_subtype": ""},
    ]
    monkeypatch.setattr(roadmap_aggregator, "get_user_answers_cached", lambda uid, ids: answers)

    res = roadmap_aggregator.compute_personalized_roadmap("u-ewma", attempts, _base_goal())
    assert res["roadmap"]["priority_skill"] == "reading"
    # a-new sai TFNG -> EWMA (alpha=0.7) nhận ra TFNG yếu hơn Matching
    assert res["roadmap"]["weakest_area"] == "True False Not Given"
    assert res["roadmap"]["recommended_tests"][0]["id"] == "t-tfng-med"


def test_chronological_most_improved_delta(monkeypatch):
    """Red-Team Lỗ hổng #2: 'Cải thiện tốt' phải là dạng bài có delta tăng trưởng dương thật."""
    scored = [
        {"id": "att-new", "skill": "reading", "mode": "practice", "band": 7.0, "started_at": "2026-11-15T10:00:00+00:00", "submitted_at": "2026-11-15T10:30:00+00:00"},
        {"id": "att-old", "skill": "reading", "mode": "practice", "band": 5.0, "started_at": "2026-11-01T10:00:00+00:00", "submitted_at": "2026-11-01T10:30:00+00:00"},
    ]
    # Matching tăng 0% -> 100% (+100%); MCQ giảm 100% -> 50% (-50%)
    answers = [
        {"attempt_id": "att-old", "question_id": "m1", "is_correct": False, "question_type": "matching", "question_subtype": ""},
        {"attempt_id": "att-old", "question_id": "m2", "is_correct": False, "question_type": "matching", "question_subtype": ""},
        {"attempt_id": "att-new", "question_id": "m3", "is_correct": True, "question_type": "matching", "question_subtype": ""},
        {"attempt_id": "att-new", "question_id": "m4", "is_correct": True, "question_type": "matching", "question_subtype": ""},
        {"attempt_id": "att-old", "question_id": "c1", "is_correct": True, "question_type": "multiple_choice", "question_subtype": ""},
        {"attempt_id": "att-old", "question_id": "c2", "is_correct": True, "question_type": "multiple_choice", "question_subtype": ""},
        {"attempt_id": "att-new", "question_id": "c3", "is_correct": False, "question_type": "multiple_choice", "question_subtype": ""},
        {"attempt_id": "att-new", "question_id": "c4", "is_correct": True, "question_type": "multiple_choice", "question_subtype": ""},
    ]
    monkeypatch.setattr(question_type_aggregator, "get_user_answers_cached", lambda uid, ids: answers)

    out = question_type_aggregator.compute_question_type_accuracy("u-delta", scored)
    assert "Matching" in out["highlights"]["most_improved"]["type_name"]
    assert out["highlights"]["most_improved"]["delta_badge"] == "+100%"


def test_monthly_progression_vn_timezone_and_provisional(monkeypatch):
    """Red-Team Lỗ hổng #5: Chuẩn UTC+7 & cờ is_provisional khi tháng mới < 2 bài."""
    monkeypatch.setattr(monthly_aggregator, "get_roadmap_config_cached", lambda: {"min_attempts_confidence": 2})
    monkeypatch.setattr(monthly_aggregator, "get_user_answers_cached", lambda uid, ids: [])

    # 2026-09-30T18:00:00Z == 2026-10-01 01:00:00 (UTC+7 -> Tháng 10, không phải Tháng 9!)
    attempts = [
        {"id": "m11", "skill": "reading", "mode": "practice", "status": "scored", "band": 6.5, "submitted_at": "2026-11-10T10:00:00+00:00", "started_at": "2026-11-10T09:30:00+00:00"},
        {"id": "m10a", "skill": "reading", "mode": "mock", "status": "scored", "band": 6.0, "submitted_at": "2026-10-15T10:00:00+00:00", "started_at": "2026-10-15T09:00:00+00:00"},
        {"id": "m10b", "skill": "reading", "mode": "mock", "status": "scored", "band": 5.5, "submitted_at": "2026-09-30T18:00:00+00:00", "started_at": "2026-09-30T17:30:00+00:00"},
    ]
    out = monthly_aggregator.compute_monthly_progression("u-month", attempts, {"2026-11-10": 60, "2026-10-15": 90}, _base_goal())
    by_m = {p["month"]: p for p in out["monthly_progression"]}
    assert "2026-10" in by_m and by_m["2026-10"]["scored_tests"] == 2
    assert by_m["2026-10"]["is_provisional"] is False
    assert "2026-11" in by_m and by_m["2026-11"]["is_provisional"] is True
    assert by_m["2026-11"]["month_over_month_delta"] == 0.5


def test_whitebox_audit_matches_learner_numbers(monkeypatch):
    """Kiểm chứng Admin White-Box Audit khớp 1:1 với số liệu Learner và giải trình 4 thành phần MatchScore."""
    from types import SimpleNamespace
    from app.services.admin import learner_audit_trace

    fake_db = SimpleNamespace(
        table=lambda name: SimpleNamespace(
            select=lambda *a, **kw: SimpleNamespace(
                eq=lambda col, val: SimpleNamespace(
                    execute=lambda: SimpleNamespace(data=[{"id": "u-wb", "email": "wb@test.com", "full_name": "WB Student", "role": "learner", "created_at": "2026-11-01"}])
                )
            )
        )
    )
    monkeypatch.setattr(learner_audit_trace, "db", lambda: fake_db)
    cfg = {"mock_window": 3, "practice_window": 5, "min_attempts_confidence": 2, "recent_exclude_days": 14, "recommended_count": 3, "tests_per_half_band": 6}
    attempts = [
        {"id": "att1", "test_id": "t-other", "skill": "reading", "mode": "mock", "status": "scored", "band": 6.0, "raw_score": 25, "question_count": 40, "started_at": "2026-11-10T10:00:00+00:00", "submitted_at": "2026-11-10T11:00:00+00:00", "tests": {"title": "Mock R1", "difficulty": "medium"}},
    ]
    monkeypatch.setattr(learner_audit_trace, "get_user_attempts", lambda uid: attempts)
    monkeypatch.setattr(learner_audit_trace, "get_learner_goal", lambda uid: _base_goal())
    monkeypatch.setattr(learner_audit_trace, "get_roadmap_config_cached", lambda: cfg)
    monkeypatch.setattr(learner_audit_trace, "get_all_published_tests", _sample_tests)
    monkeypatch.setattr(learner_audit_trace, "get_user_answers_cached", lambda uid, ids: [])
    monkeypatch.setattr(learner_audit_trace, "compute_learning_profile_overview", lambda uid: {
        "goals": {"input_band": 4.5, "predicted_band": 5.0, "target_band": 6.5},
        "skill_diagnostics": {
            "listening": {"current_band": 4.5, "target_band": 7.0, "gap": 2.5},
            "reading": {"current_band": 6.0, "target_band": 6.5, "gap": 0.5},
            "writing": {"current_band": 4.5, "target_band": 6.0, "gap": 1.5},
            "speaking": {"current_band": 4.5, "target_band": 6.0, "gap": 1.5},
        },
        "roadmap": {"priority_skill": "reading", "is_diagnostic": False, "weekly_pacing": {"days_remaining": 30}, "recommended_tests": [{"id": "t-tfng-med", "slot_label": "Bước 1 • Chữa điểm nghẽn"}]},
        "monthly_progression": [], "monthly_scorecard": {},
    })
    monkeypatch.setattr(learner_audit_trace, "compute_learning_profile_test_practice", lambda uid: {"criterion_mastery": {}, "question_type_report": []})

    out = learner_audit_trace.get_learner_whitebox_audit("u-wb")
    assert "4.5 + 6.0 + 4.5 + 4.5" in out["audit_sections"]["br12_band_proof"]["overall_formula"]
    assert len(out["audit_sections"]["utility_match_score_proof"]) == 3
    assert out["audit_sections"]["raw_attempts_ledger"][0]["band"] == 6.0
