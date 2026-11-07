"""Ground truth for the pronunciation evaluation: a wrong parse here would silently invalidate every number."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from l2_arctic_annotations import annotated_words, parse_tiers  # noqa: E402


def tier(index, name, intervals):
    rows = "".join(f'''
        intervals [{i}]:
            xmin = {a}
            xmax = {b}
            text = "{label}" ''' for i, (a, b, label) in enumerate(intervals, 1))
    return f'''
    item [{index}]:
        class = "IntervalTier"
        name = "{name}"
        xmin = 0
        xmax = 3
        intervals: size = {len(intervals)}{rows}'''


GRID = 'File type = "ooTextFile"\nitem []:' + tier(1, "words", [
    (0, 0.5, "sil"), (0.5, 1.0, "this"), (1.0, 1.5, "dog"), (1.5, 1.6, "sp"), (1.6, 2.0, "ran"), (2.0, 3, ""),
]) + tier(2, "phones", [
    (0, 0.5, "sil"),
    (0.5, 0.7, "DH,D,s "), (0.7, 1.0, "IH1"),
    (1.0, 1.2, "D"), (1.2, 1.4, "AO1"), (1.4, 1.5, "G,sil,d"),
    (1.5, 1.6, "sil,AH0,a"),
    (1.6, 1.8, "R"), (1.8, 1.9, "AE1,EH1*,s"), (1.9, 2.0, "N"),
    (2.0, 3, "sil"),
]) + tier(3, "IPA", [(0, 3, "")])


def test_tiers_are_read_by_name():
    tiers = parse_tiers(GRID)
    assert set(tiers) == {"words", "phones", "ipa"}
    assert [i.text for i in tiers["words"]][1:3] == ["this", "dog"]


def test_silence_is_not_a_word():
    assert [w.word for w in annotated_words(GRID)] == ["this", "dog", "ran"]


def test_substitution_with_trailing_space_is_counted():
    assert annotated_words(GRID)[0].errors == ["s"]


def test_addition_in_a_pause_goes_to_the_word_before():
    dog = annotated_words(GRID)[1]
    assert dog.errors == ["d", "a"]
    assert dog.wrong


def test_accent_marked_error_is_flagged():
    words = annotated_words(GRID)
    assert words[2].accent_only is True
    assert words[0].accent_only is False


def test_correct_phones_are_counted_too():
    assert [w.phones for w in annotated_words(GRID)] == [2, 4, 3]
