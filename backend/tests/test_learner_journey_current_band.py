"""Band hiện tại, overall, khoảng cách, số ngày (spec 005 US1; TC-B01…B13)."""
from datetime import date

import pytest

from app.services.learner_journey.current_band_calculator import (
    current_bands, exam_countdown, round_band, skill_band,
)


def att(skill, band, day, mode="practice", status="scored"):
    return {"skill": skill, "mode": mode, "status": status, "band": band, "submitted_at": f"2026-11-{day:02d}T10:00:00+00:00"}


def test_b01_three_latest_mocks():
    r = skill_band([att("reading", 5.0, 1, "mock"), att("reading", 6.0, 2, "mock"),
                    att("reading", 6.5, 3, "mock"), att("reading", 7.0, 4, "mock")])
    assert r == {"band": 6.5, "source": "mock", "attempts_used": 3, "low_confidence": False}


def test_b02_five_latest_practice_low_confidence():
    bands = [5.0, 5.5, 6.0, 6.0, 6.5, 7.0]
    r = skill_band([att("writing", b, i + 1) for i, b in enumerate(bands)])
    assert (r["band"], r["source"], r["attempts_used"], r["low_confidence"]) == (6.0, "practice", 5, True)


def test_b03_single_mock_low_confidence():
    r = skill_band([att("speaking", 6.0, 3, "mock")])
    assert r["band"] == 6.0 and r["low_confidence"] is True


def test_b04_typed_band_never_used():
    bands = current_bands([], {"target_overall": 7.0, "input_band": 5.5})
    assert bands["writing"]["band"] is None and bands["writing"]["source"] == "none"


def test_b05_partial_lr_has_no_band():
    assert skill_band([att("listening", None, 2), att("listening", None, 3)])["band"] is None


def test_b06_waiting_expert_mock_excluded():
    r = skill_band([att("writing", 8.0, 5, "mock", "waiting_expert"), att("writing", 5.0, 4)])
    assert (r["band"], r["source"]) == (5.0, "practice")


@pytest.mark.parametrize("status", ["grading", "grading_failed", "no_speech", "abandoned", "in_progress"])
def test_b07_unfinished_statuses_ignored(status):
    assert skill_band([att("speaking", 7.0, 5, status=status)])["band"] is None


def test_b08_mock_beats_practice():
    r = skill_band([att("reading", 8.0, 9), att("reading", 5.0, 1, "mock")])
    assert (r["band"], r["source"]) == (5.0, "mock")


def test_b09_overall_br02_rounding():
    attempts = [att("listening", 6.0, 1, "mock"), att("reading", 6.5, 1, "mock"),
                att("writing", 5.0, 1, "mock"), att("speaking", 7.0, 1, "mock")]
    assert current_bands(attempts, {"target_overall": 7.0})["overall"] == 6.0


def test_b10_overall_null_when_skill_missing():
    attempts = [att("listening", 6.0, 1), att("reading", 6.5, 1), att("writing", 5.0, 1)]
    assert current_bands(attempts, {"target_overall": 7.0})["overall"] is None


def test_b11_gap_uses_skill_target_else_overall():
    bands = current_bands([att("reading", 6.0, 1), att("writing", 5.5, 1)],
                          {"target_overall": 6.5, "target_reading": 7.0})
    assert bands["reading"]["gap"] == 1.0 and bands["reading"]["target"] == 7.0
    assert bands["writing"]["gap"] == 1.0 and bands["writing"]["target"] == 6.5
    assert bands["listening"]["gap"] is None


def test_b12_exam_countdown():
    today = date(2026, 11, 11)
    assert exam_countdown("2026-12-11", today) == {"test_date": "2026-12-11", "days_left": 30, "date_passed": False}
    assert exam_countdown("2026-11-01", today) == {"test_date": "2026-11-01", "days_left": None, "date_passed": True}
    assert exam_countdown(None, today) == {"test_date": None, "days_left": None, "date_passed": False}


@pytest.mark.parametrize("raw,expected", [(6.25, 6.5), (6.75, 7.0), (6.1, 6.0), (6.125, 6.0), (6.5, 6.5)])
def test_b13_ielts_rounding(raw, expected):
    assert round_band(raw) == expected
