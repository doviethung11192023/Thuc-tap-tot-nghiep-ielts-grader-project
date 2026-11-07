"""Cleaning rules for the Task 2 reference corpus."""
import pytest

from utils.essay_type_rules import classify_by_rules
from utils.reference_corpus_cleaning import (
    MIN_ESSAY_WORDS,
    clean_rows,
    essay_opening,
    group_prompts,
    is_held_out,
    is_not_task2,
    is_reference_candidate,
    parse_band,
)

PROMPT = "Some people think cities are better. To what extent do you agree or disagree?"


def essay(seed: str, words: int = 280) -> str:
    return " ".join(f"{seed}{index}" for index in range(words))


def row(text: str, band: object = "7", prompt: str = PROMPT) -> dict:
    return {"prompt": prompt, "essay": text, "band": band}


@pytest.mark.parametrize("raw,expected", [
    ("7.5\n\n\r\r", 7.5),
    ("5.0", 5.0),
    ("9", 9.0),
    ("<4\r\r", None),
    ("7.3", None),
    ("10", None),
    ("", None),
])
def test_parse_band(raw, expected):
    assert parse_band(raw) == expected


def test_clean_rows_counts_each_removal_reason():
    kept, removed = clean_rows([
        row(essay("a")),
        row(essay("b"), band="<4"),
        row("#NAME?"),
        row(essay("c", 700)),
        row("The bar chart shows spending by country. " + essay("d")),
        row(essay("e"), prompt="You have a full-time job. Write a letter to your manager."),
    ])
    assert len(kept) == 1
    assert removed == {
        "band_not_numeric": 1,
        "essay_too_short": 1,
        "essay_too_long": 1,
        "not_task2": 2,
    }


def test_duplicates_keep_one_copy_and_ignore_spacing():
    text = essay("a")
    kept, removed = clean_rows([row(text), row(text.replace(" ", "  ", 5) + "\n")])
    assert len(kept) == 1
    assert removed["duplicate_essay"] == 1


def test_same_essay_with_two_bands_is_dropped_entirely():
    text = essay("a")
    kept, removed = clean_rows([row(text, band="6"), row(text, band="8")])
    assert kept == []
    assert removed["conflicting_band"] == 2


def test_essay_at_minimum_length_is_kept():
    kept, _ = clean_rows([row(essay("a", MIN_ESSAY_WORDS))])
    assert len(kept) == 1


def test_letter_as_a_topic_is_still_task2():
    assert not is_not_task2("Writing letters by hand is dying out. Do you agree?", essay("a"))


def test_reworded_prompts_share_one_group():
    first = "Many children spend too much time playing computer games. Do you agree or disagree?"
    second = "Many children spend too much time playing computer games. To what extent do you agree?"
    third = "Governments should invest more money in public transport than in new roads. Discuss."
    groups = group_prompts([first, second, third])
    assert groups[first] == groups[second]
    assert groups[third] != groups[first]


def test_split_is_stable_and_near_the_target_share():
    ids = [f"prompt {index}" for index in range(5000)]
    assert [is_held_out(i) for i in ids] == [is_held_out(i) for i in ids]
    assert 0.13 < sum(map(is_held_out, ids)) / len(ids) < 0.17


def test_essay_opening_matches_when_only_the_ending_changes():
    text = essay("a")
    assert essay_opening(text) == essay_opening(text + " extra ending")


@pytest.mark.parametrize("band,words,expected", [
    (7.0, 300, True),
    (6.5, 300, False),
    (7.0, 249, False),
    (7.0, 451, False),
])
def test_reference_candidate_needs_a_ladder_band_and_normal_length(band, words, expected):
    assert is_reference_candidate({"band": band, "word_count": words}) is expected


@pytest.mark.parametrize("question,expected", [
    ("Cities are crowded. To what extent do you agree or disagree?", "Opinion"),
    ("Some say A, others say B. Discuss both views and give your opinion.", "Discussion"),
    ("More people work from home. Do the advantages outweigh the disadvantages?",
     "Advantages_Disadvantages"),
    ("Streaming is growing. Is this a positive or negative development?",
     "Advantages_Disadvantages"),
    ("Traffic is getting worse. What are the causes and what solutions can be suggested?",
     "Cause_Solution"),
    ("Young people move to cities. What are the reasons and what are the effects?", "Cause_Effect"),
    ("What qualities make a leader? Can they be learned?", "Two_Part_Question"),
    ("Many people trace their family history. What are the reasons for this? How can people research it?",
     "Two_Part_Question"),
    ("Opinions are changing. Why is this happening? Is it a positive or negative development?",
     "Two_Part_Question"),
    ("Traffic is a problem. What are the causes and how can this be reduced?", "Cause_Solution"),
])
def test_rules_read_the_final_question(question, expected):
    assert classify_by_rules(question) == expected
