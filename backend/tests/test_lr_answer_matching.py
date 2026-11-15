"""BR-14: so khớp đáp án Listening/Reading & chuẩn hóa/bảo mật đề Listening."""
from app.services.listening_reading.lr_answer_matching import accepted_forms, is_correct, normalize
from app.services.listening_reading.lr_grading_service import grade_lr_sections
from app.services.listening_reading.lr_test_content import (
    _LISTENING_T3_S1_Q2_ID,
    _format_correct_answer,
    _group,
    _infer_word_limit,
    _normalize_seed_group,
    _recover_key_row,
    build_lr_sections,
    to_lr_content,
)


def test_case_and_spaces_ignored():
    assert is_correct("  The   LIBRARY ", ["the library"])
    assert normalize("Hello,  World.") == "hello, world"


def test_any_accepted_answer_and_slash_variants():
    assert is_correct("centre", ["center/centre"])
    assert is_correct("town hall", ["city hall", "town hall"])
    assert not is_correct("hall", ["city hall", "town hall"])


def test_bracketed_words_are_optional():
    assert is_correct("library", ["(the) library"])
    assert is_correct("the library", ["(the) library"])
    assert is_correct("old map", ["(an) old (paper) map"])
    assert not is_correct("the", ["(the) library"])


def test_letter_option_keys():
    keys = ["C", "C. remaining inactive for a period to digest"]
    assert is_correct("c", keys)
    assert is_correct("C. remaining inactive for a period to digest", keys)
    assert not is_correct("B", keys)
    assert {"c"} <= accepted_forms(["C. text"])


def test_word_limit_exceeded_scores_zero():
    assert is_correct("public library", ["public library"], max_words=2)
    assert not is_correct("the public library", ["(the) public library"], max_words=2)


def test_empty_answer_is_wrong():
    assert not is_correct("", ["anything"])
    assert not is_correct(None, ["anything"])


def test_word_limit_and_or_number_inference():
    mw_one_num = _infer_word_limit("Questions 1-10. Write ONE WORD AND/OR A NUMBER for each answer.")
    assert mw_one_num == 2
    assert is_correct("27 February", ["27 February"], max_words=mw_one_num)
    assert is_correct("3 hours", ["three hours", "3 hours"], max_words=mw_one_num)
    assert is_correct("four weeks", ["four weeks"], max_words=mw_one_num)

    mw_two_num = _infer_word_limit("Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.")
    assert mw_two_num == 3
    assert is_correct("435 a month", ["435", "$435", "435 a month"], max_words=mw_two_num)

    mw_only = _infer_word_limit("Write ONE WORD ONLY for each answer.")
    assert mw_only == 1
    assert not is_correct("27 February", ["27 February"], max_words=mw_only)


def test_split_multiselect_keys_and_detail_format():
    opts = [
        {"label": "A", "text": "Location"},
        {"label": "C", "text": "Salary range"},
        {"label": "E", "text": "Training"},
        {"label": "F", "text": "Holidays"},
    ]
    sections = [{
        "id": "sec-2",
        "lr_sections": [{
            "question_groups": [{
                "id": "grp-t2",
                "order_no": 1,
                "question_type": "multiple_choice",
                "subtype": "multiple_choice",
                "select_count": 3,
                "group_options": opts,
                "questions": [
                    {"id": "q18", "number": 18, "question_options": []},
                    {"id": "q19", "number": 19, "question_options": []},
                    {"id": "q20", "number": 20, "question_options": []},
                ],
            }]
        }],
    }]
    split_keys = {
        "q18": ["C", "C. Salary range"],
        "q19": ["E", "E. Training"],
        "q20": ["F", "F. Holidays"],
    }

    rows_all, raw_all, count = grade_lr_sections(sections, {"q18": "C", "q19": "E", "q20": "F"}, split_keys)
    assert (raw_all, count) == (3, 3)
    assert all(r["is_correct"] for r in rows_all)

    rows_partial, raw_partial, _ = grade_lr_sections(sections, {"q18": "A", "q19": "E", "q20": "F"}, split_keys)
    assert raw_partial == 2
    assert [r["is_correct"] for r in rows_partial] == [False, True, True]

    rows_dup, raw_dup, _ = grade_lr_sections(sections, {"q18": "C", "q19": "C", "q20": "A"}, split_keys)
    assert raw_dup == 1
    assert [r["is_correct"] for r in rows_dup] == [True, False, False]

    grouped = _group(sections[0]["lr_sections"][0]["question_groups"][0], {
        "q18": {"accepted_answers": split_keys["q18"]},
        "q19": {"accepted_answers": split_keys["q19"]},
        "q20": {"accepted_answers": split_keys["q20"]},
    }, {})
    assert grouped["questions"][0]["correct_answer"] == "C, E, F"
    assert _format_correct_answer({}, ["Training"], opts) == "E. Training"


def test_recover_na_key_and_missing_seed_options():
    rec = _recover_key_row({
        "question_id": "q-map-11",
        "accepted_answers": ["N/A"],
        "explanation": "Đáp án đúng là ✅ **Answer: E**",
    })
    assert rec["accepted_answers"] == ["E"]

    rec_t3 = _recover_key_row({
        "question_id": _LISTENING_T3_S1_Q2_ID,
        "accepted_answers": ["N/A"],
        "explanation": None,
    })
    assert "435" in rec_t3["accepted_answers"]

    g_q21 = {
        "id": "g-21",
        "question_type": "multiple_choice",
        "subtype": "multiple_choice",
        "instructions": "Choose the correct letter, A, B or C.",
        "questions": [{"id": "q21", "number": 21, "prompt": "What does the man want to have?", "question_options": [{"label": "A", "text": "break"}]}],
    }
    _normalize_seed_group(g_q21)
    assert [o["label"] for o in g_q21["questions"][0]["question_options"]] == ["A", "B", "C"]

    g_shifted = {
        "id": "g-shift",
        "question_type": "completion",
        "instructions": "Questions 27 - 30 Complete the notes below.",
        "template": "27. A valuable quality is {{25}}\n28. Another note {{26}}",
        "questions": [
            {"id": "q25", "number": 25, "prompt": "p1"},
            {"id": "q26", "number": 26, "prompt": "p2"},
        ],
    }
    _normalize_seed_group(g_shifted)
    assert g_shifted["instructions"].startswith("Questions 25-26")
    assert g_shifted["template"].startswith("25. A valuable quality")
    assert "\n26. Another note" in g_shifted["template"]

    g_which_two = {
        "id": "g-w2",
        "subtype": "multiple_choice",
        "instructions": "Questions 23-24 Which TWO of the following are mentioned?",
        "questions": [{"id": "q23", "number": 23}, {"id": "q24", "number": 24}],
    }
    _normalize_seed_group(g_which_two)
    assert g_which_two["select_count"] == 2


def test_build_lr_sections_hides_transcript_during_exam(monkeypatch):
    fake_test = {
        "id": "test-l-1",
        "title": "Listening Test 1",
        "skill": "listening",
        "duration_minutes": None,
        "sections": [{
            "id": "sec-1",
            "order_no": 1,
            "title": "Part 1",
            "lr_sections": [{
                "passage": '{"transcripts": [{"timestamp": "00:01", "speaker": "Host", "text": "Secret answer here"}]}',
                "audio_key": "https://example.com/a.mp3",
                "transcript": None,
                "question_groups": [{
                    "id": "grp-1",
                    "order_no": 1,
                    "question_type": "completion",
                    "subtype": "note_completion",
                    "instructions": "Write ONE WORD",
                    "questions": [{"id": "q1", "number": 1, "prompt": "Name: {{1}}"}],
                }],
            }],
        }],
    }
    monkeypatch.setattr(
        "app.services.listening_reading.lr_test_content.load_lr_question_keys",
        lambda qids: {"q1": {"accepted_answers": ["Alice"], "explanation": "", "evidence": ""}},
    )

    exam_payload = to_lr_content(fake_test)
    assert exam_payload["duration_min"] == 30
    assert exam_payload["sections"][0]["passage_text"] is None
    assert "transcript" not in exam_payload["sections"][0]

    detail_sections = build_lr_sections(fake_test, with_keys=True, answers={"q1": {"answer": "Alice", "is_correct": True}})
    assert detail_sections[0]["transcript"].startswith('{"transcripts":')
