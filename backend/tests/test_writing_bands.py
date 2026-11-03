"""Band Writing tính trong code (BR-01, BR-02, BR-04, ADR-03). Chạy: cd backend && .venv/bin/python -m pytest tests"""
import pytest

from app.services.writing.writing_bands import attempt_band, ielts_round, task_band, to_half_band


@pytest.mark.parametrize("raw, expected", [
    (6.0, 6.0), (6.125, 6.0), (6.24, 6.0),      # < .25 → xuống
    (6.25, 6.5), (6.5, 6.5), (6.74, 6.5),       # .25 – < .75 → .5
    (6.75, 7.0), (6.9, 7.0),                    # ≥ .75 → lên
])
def test_ielts_round_br02(raw, expected):
    assert ielts_round(raw) == expected


def test_to_half_band_clamps_and_rounds():
    assert to_half_band(6.74) == 6.5
    assert to_half_band(6.76) == 7.0
    assert to_half_band(9.6) == 9.0
    assert to_half_band(-1) == 0.0
    assert to_half_band(None) is None


def test_task_band_is_mean_of_four_criteria():
    assert task_band([7.0, 6.5, 6.5, 6.0]) == 6.5      # 6.5
    assert task_band([5.0, 4.0, 9.0, 6.0]) == 6.0      # 6.0
    assert task_band([6.0, 6.0, 6.5, 6.5]) == 6.5      # 6.25 → 6.5


def test_attempt_band_task2_weighs_double():
    assert attempt_band({1: 7.0, 2: 6.0}) == 6.5       # 19/3 = 6.33
    assert attempt_band({1: 6.0, 2: 5.5}) == 5.5       # 17/3 = 5.67
    assert attempt_band({1: 5.0, 2: 7.0}) == 6.5       # 19/3 = 6.33


def test_attempt_band_single_task_practice():
    assert attempt_band({2: 7.5}) == 7.5
    assert attempt_band({1: 6.0}) == 6.0
