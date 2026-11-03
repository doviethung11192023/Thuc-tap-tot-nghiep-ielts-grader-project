"""BR-14: so khớp đáp án Listening/Reading."""
from app.services.listening_reading.lr_answer_matching import accepted_forms, is_correct, normalize


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
