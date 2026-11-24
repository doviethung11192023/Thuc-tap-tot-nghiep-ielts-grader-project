"""Unit tests cho chuẩn hóa Reading content, khớp đáp án, chấm multi-select và band chỉ khi đủ 40 câu (BR-03)."""
from app.services.listening_reading.lr_answer_matching import (
    accepted_forms,
    is_correct,
    multiselect_match_count,
)
from app.services.listening_reading.lr_grading_service import (
    band_if_full_test,
    grade_lr_sections,
)
from app.services.listening_reading.lr_test_content import (
    _TEST6_WORDLIST_GROUP_ID,
    _format_correct_answer,
    _group,
    _normalize_seed_group,
    _options,
)


def test_roman_numeral_and_spaced_prefixes():
    assert is_correct("iv", ["iv. Environmentally friendly production"])
    assert is_correct("Environmentally friendly production", ["iv. Environmentally friendly production"])
    assert is_correct("C", ["C Phil Trathan"])
    assert is_correct("Phil Trathan", ["C Phil Trathan"])
    assert is_correct("A", ["A . Ancient method"])
    assert is_correct("xi", ["xi. TV appeal influences sports\u2019 success"])
    assert is_correct("TV appeal influences sports' success", ["xi. TV appeal influences sports\u2019 success"])


def test_tfng_ynng_shorthand_without_false_positive_on_letter_f():
    assert is_correct("T", ["A", "A. True"])
    assert is_correct("NG", ["C", "C. Not Given"])
    assert is_correct("Y", ["YES"])
    assert is_correct("N", ["NO"])
    assert not is_correct("false", ["F", "Paragraph F"])
    assert is_correct("F", ["F", "Paragraph F"])


def test_bidirectional_option_pool_lookup():
    wolf_opts = [
        {"label": "A", "text": "the alpha wolf"},
        {"label": "B", "text": "the beta wolf"},
    ]
    assert is_correct("B", ["the beta wolf"], options=wolf_opts)
    assert is_correct("the beta wolf", ["the beta wolf"], options=wolf_opts)

    pearl_opts = [
        {"label": "B", "text": "Ancient Rome"},
        {"label": "D", "text": "Bahrain"},
    ]
    assert is_correct("Ancient Rome", ["B"], options=pearl_opts)
    assert is_correct("B", ["B"], options=pearl_opts)

    phil_opts = [{"label": "A", "text": "Phil Trathan"}]
    assert is_correct("A", ["A Phil Trathan"], options=phil_opts)


def test_multiselect_single_and_multi_row_grading():
    opts = [
        {"label": "A", "text": "The Olympics should be cancelled"},
        {"label": "C", "text": "The Olympics should be held in the same city"},
        {"label": "E", "text": "Yogurt"},
    ]
    matched, req = multiselect_match_count(["C", "E"], ["C", "C. Sour cream", "E", "E. Yogurt"], 2)
    assert (matched, req) == (2, 2)
    assert multiselect_match_count(["A", "B", "C"], ["A", "C"], 2) == (0, 2)
    assert is_correct(["C", "E"], ["C", "C. Sour cream", "E", "E. Yogurt"], select_count=2)

    sections = [{
        "id": "sec-1",
        "lr_sections": [{
            "question_groups": [{
                "id": "grp-mc",
                "subtype": "multiple_choice",
                "select_count": 2,
                "group_options": [],
                "questions": [
                    {"id": "q26", "number": 26, "question_options": opts},
                    {"id": "q27", "number": 27, "question_options": opts},
                ],
            }]
        }],
    }]
    keys = {
        "q26": ["C", "C. The Olympics should be held in the same city", "A", "A. The Olympics should be cancelled"],
        "q27": ["C", "C. The Olympics should be held in the same city", "A", "A. The Olympics should be cancelled"],
    }

    rows_both, raw_both, count = grade_lr_sections(sections, {"q26": ["A", "C"], "q27": ["A", "C"]}, keys)
    assert (raw_both, count) == (2, 2)
    assert all(r["is_correct"] for r in rows_both)

    rows_one, raw_one, _ = grade_lr_sections(sections, {"q26": ["A", "D"], "q27": ["A", "D"]}, keys)
    assert raw_one == 1
    assert [r["is_correct"] for r in rows_one] == [True, False]

    # Anti-gaming: chon cung 1 chu cai 'A' o ca 2 dong chi tinh 1 diem
    _, raw_dup, _ = grade_lr_sections(sections, {"q26": "A", "q27": "A"}, keys)
    assert raw_dup == 1

    assert "c" in accepted_forms(["C", "E"])


def test_seed_normalization_and_roman_sorting():
    t6 = {"id": _TEST6_WORDLIST_GROUP_ID, "question_type": "completion", "instructions": "Questions 31-36...", "group_options": []}
    _normalize_seed_group(t6)
    assert len(t6["group_options"]) == 11
    assert t6["instructions"].startswith("Questions 31-36.")
    assert t6.get("max_words") is None  # Wordlist group khong bi ep max_words

    t8_headings = {
        "id": "2da75d1f-90e8-4219-b288-2ea7a9b3502c",
        "question_type": "matching",
        "group_options": [
            {"label": "ix", "text": "Growing popularity"},
            {"label": "K", "text": "xi. A safety risk"},
            {"label": "iv", "text": "Env"},
        ],
    }
    _normalize_seed_group(t8_headings)
    sorted_keys = [o["key"] for o in (_options(t8_headings["group_options"]) or [])]
    assert sorted_keys == ["iv", "ix", "xi"]
    assert t8_headings["group_options"][1]["text"] == "A safety risk"

    assert _format_correct_answer({"subtype": "true_false_not_given"}, ["A", "A. True"]) == "TRUE"
    assert _format_correct_answer({"select_count": 2}, ["C", "C. Foo", "E", "E. Bar"]) == "C, E"

    mapped = _group(
        {
            "id": "g1",
            "order_no": 1,
            "question_type": "matching",
            "subtype": "matching_features",
            "group_options": [{"label": "B", "text": "the beta wolf"}],
            "questions": [{"id": "q1", "number": 1, "prompt": "Wolf role"}],
        },
        keys={"q1": {"accepted_answers": ["the beta wolf"]}},
        answers={"q1": {"answer": "B", "is_correct": False}},
    )
    assert mapped["questions"][0]["is_correct"] is True


def test_band_only_for_full_40_questions(monkeypatch):
    captured: list[tuple[str, int]] = []

    def fake_lookup(skill: str, raw: int) -> float:
        captured.append((skill, raw))
        return 7.0

    monkeypatch.setattr("app.services.listening_reading.lr_grading_service.lookup_band", fake_lookup)
    assert band_if_full_test("reading", 30, 39) is None     # đề 39 câu: không quy đổi (BR-03, ADR-19)
    assert band_if_full_test("reading", 13, 13) is None     # luyện 1 passage: chỉ "x / y câu đúng"
    assert band_if_full_test("reading", 30, 40) == 7.0
    assert captured == [("reading", 30)]
