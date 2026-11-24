"""Spec 006: answer key validation, key-point accuracy decided in code, sub-indicator clamp."""
import pytest

from schemas.answer_key import parse_answer_key, parse_key_or_none
from services.key_point_checker import is_close, judge
from services.sub_indicator_levels import band_level, clamp_levels, task_sub_levels

# "Consumption of Spreads" (Prep "Graphs with a trend 1"), figures read from the chart
SPREADS = {
    "visual_type": "line graph",
    "unit": "grams per person",
    "series": [
        {"name": "Butter", "points": [{"label": "1981", "value": 145}, {"label": "1986", "value": 160},
                                      {"label": "2007", "value": 50}]},
        {"name": "Margarine", "points": [{"label": "1981", "value": 90}, {"label": "2007", "value": 40}]},
        {"name": "Low fat", "points": [{"label": "2001", "value": 85}, {"label": "2007", "value": 70}]},
    ],
    "overview": ["Butter fell overall", "Low-fat spreads ended highest"],
    "key_features": [
        {"id": "f1", "statement": "Butter started highest in 1981", "figures": [{"series": "Butter", "label": "1981"}]},
        {"id": "f2", "statement": "Butter peaked in 1986", "figures": [{"series": "Butter", "label": "1986"}]},
        {"id": "f3", "statement": "Low fat peaked in 2001", "figures": [{"series": "Low fat", "label": "2001"}]},
        {"id": "f4", "statement": "Margarine ended lowest", "figures": [{"series": "Margarine", "label": "2007"}]},
    ],
}


def test_key_parses_and_prompt_text_says_verified():
    key = parse_answer_key(SPREADS)
    assert key.series["Butter"]["1986"] == 160
    assert key.key_features[1].figures[0].value == 160
    assert key.to_prompt_text().startswith("VERIFIED ANSWER KEY")
    assert key.value_range() == 120


@pytest.mark.parametrize("broken, message", [
    ({**SPREADS, "key_features": []}, "key_features"),
    ({**SPREADS, "key_features": [{"id": "x", "statement": "s", "figures": [{"series": "Tea", "label": "1"}]}]},
     "unknown point"),
    ({**SPREADS, "series": [{"name": "Butter", "points": [{"label": "1981", "value": "lots"}]}]}, "number"),
])
def test_invalid_keys_are_rejected(broken, message):
    with pytest.raises(ValueError, match=message):
        parse_answer_key(broken)


def test_invalid_stored_key_falls_back_to_image():
    assert parse_key_or_none({"series": "x"}) is None
    assert parse_key_or_none(None) is None


def test_tolerance_accepts_reading_error_but_not_wrong_figures():
    assert is_close(143, 145, 120)        # "about 143" for 145
    assert is_close(85, 90, 120)          # 5 g off on a 20 g grid: reading error (5 % of range = 6)
    assert not is_close(80, 90, 120)
    assert not is_close(60, 145, 120)
    assert not is_close(220, 160, 120)


def test_wrong_figure_essay_is_flagged_where_prep_was_not():
    """Prep marked this essay 18/21 'achieved'. Here wrong figures are covered but inaccurate."""
    key = parse_answer_key(SPREADS)
    extraction = {"items": [
        {"id": "f1", "covered": True, "stated": [{"series": "Butter", "label": "1981", "value": 60}]},
        {"id": "f2", "covered": True, "stated": [{"series": "Butter", "label": "1986", "value": 220}]},
        {"id": "f3", "covered": True, "stated": [{"series": "Low fat", "label": "2001", "value": 150}]},
        {"id": "f4", "covered": False, "stated": []},
    ]}
    check = judge(key, extraction).to_dict()
    assert (check["total"], check["covered"], check["accurate"]) == (4, 3, 0)
    assert check["items"][1]["expected"] == [{"series": "Butter", "label": "1986", "value": 160.0}]
    assert check["items"][3]["accurate"] is None
    assert "key says Butter 1986: 160" in judge(key, extraction).to_prompt_text()


def test_correct_essay_is_accurate_and_unchecked_figures_are_not_judged():
    key = parse_answer_key(SPREADS)
    extraction = {"items": [
        {"id": "f1", "covered": True, "stated": [{"series": "Butter", "label": "1981", "value": 140}]},
        {"id": "f2", "covered": True, "stated": [{"series": "Tea", "label": "1986", "value": 999}]},
    ]}
    check = judge(key, extraction).to_dict()
    assert check["items"][0]["accurate"] is True
    assert check["items"][1]["accurate"] is None      # figure outside the key
    assert judge(key, extraction).to_prompt_text() == ""


def test_levels_never_more_than_two_above_band():
    assert band_level(5.0) == 1 and band_level(8.5) == 4 and band_level(3.0) == 0
    levels = clamp_levels({"overview": "Excellent", "comparisons": "good", "x": "superb"}, 5.0)
    assert levels == {"overview": "very_good", "comparisons": "good"}


def test_data_accuracy_follows_key_check():
    levels = task_sub_levels({"data_accuracy_and_support": "excellent"}, 8.0,
                             {"covered": 3, "accurate": 0, "total": 4})
    assert levels["data_accuracy_and_support"] == "needs_work"
    assert task_sub_levels({}, 8.0, {"covered": 4, "accurate": 4})["data_accuracy_and_support"] == "excellent"


@pytest.mark.parametrize("accurate, covered, level", [
    (7, 7, "excellent"), (6, 7, "very_good"), (5, 7, "good"), (4, 7, "fair"), (3, 7, "needs_work"), (0, 0, "needs_work"),
])
def test_accuracy_level_thresholds(accurate, covered, level):
    from services.sub_indicator_levels import accuracy_level
    assert accuracy_level({"accurate": accurate, "covered": covered}) == level
