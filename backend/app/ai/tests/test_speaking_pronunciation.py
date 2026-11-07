"""Phoneme comparison and the pronunciation rubric. The key property: bad audio cannot hide behind a good transcript."""
from services.speaking.audio_signal import AudioQuality
from services.speaking.phoneme_comparison import (
    ComparisonSummary, WordPhones, align, compare_words, likely_mispronounced, summarize,
)
from services.speaking.pronunciation_rubric import UNRELIABLE_CAP, assess_pronunciation

CLEAN = AudioQuality(60.0, 50.0, -20.0, 0.0, 30.0)


def _word(word, phones, content=True):
    return WordPhones(word, tuple(phones), content)


def _comparison(accuracy=0.9, clear=0.95, words=100):
    return ComparisonSummary(accuracy, clear, 0.0, 0, 0, words)


def test_identical_sequences_align_one_to_one():
    assert align(["a", "b", "c"], ["a", "b", "c"]) == [(0, 0), (1, 1), (2, 2)]


def test_alignment_marks_deletion_and_insertion():
    assert align(["a", "b", "c"], ["a", "c"]) == [(0, 0), (1, None), (2, 1)]
    assert align(["a", "c"], ["a", "b", "c"]) == [(0, 0), (None, 1), (1, 2)]


def test_audio_error_is_caught_when_transcript_looks_correct():
    # The transcript says "think"; the audio contains /t/ instead of /θ/.
    results, _ = compare_words([_word("think", ["θ", "ɪ", "ŋ", "k"])], ["t", "ɪ", "ŋ", "k"])
    assert results[0].substitutions == [("θ", "t")]
    assert results[0].correct == 3
    assert summarize(results, 0).th_substitutions == 1


def test_final_consonant_deletion_is_detected():
    results, _ = compare_words([_word("worked", ["w", "ɜː", "k", "t"]), _word("hard", ["h", "ɑː", "d"])],
                               ["w", "ɜː", "k", "h", "ɑː", "d"])
    assert results[0].deletions == ["t"]
    assert results[0].final_consonant_deleted
    assert not results[1].final_consonant_deleted


def test_deleted_vowel_is_not_a_final_consonant_deletion():
    results, _ = compare_words([_word("go", ["g", "oʊ"])], ["g"])
    assert not results[0].final_consonant_deleted


def test_accent_only_differences_are_not_errors():
    results, _ = compare_words([_word("car", ["k", "ɑː", "r"])], ["k", "ɑ", "ɹ"])
    assert results[0].accuracy == 1.0


def test_function_words_count_less_than_content_words():
    results, _ = compare_words([_word("the", ["ð", "ə"], content=False), _word("cat", ["k", "æ", "t"])],
                               ["k", "æ", "t"])
    assert summarize(results, 0).phoneme_accuracy > 0.8


def test_likely_mispronounced_lists_only_weak_content_words():
    results, _ = compare_words([_word("the", ["ð", "ə"], content=False), _word("three", ["θ", "ɹ", "i"]),
                                _word("good", ["g", "ʊ", "d"])], ["z", "s", "g", "ʊ", "d"])
    assert [item["word"] for item in likely_mispronounced(results)] == ["three"]


def test_clearer_recognition_gives_higher_band():
    low = assess_pronunciation(_comparison(), CLEAN, 0.7, 5.0, 50.0).band
    high = assess_pronunciation(_comparison(), CLEAN, 0.93, 5.0, 50.0).band
    assert high > low


def test_phoneme_accuracy_does_not_set_the_band():
    weak = assess_pronunciation(_comparison(accuracy=0.65), CLEAN, 0.93, 5.0, 50.0).band
    strong = assess_pronunciation(_comparison(accuracy=0.95), CLEAN, 0.93, 5.0, 50.0).band
    assert weak == strong


def test_channels_disagreeing_is_labelled_and_not_blamed_on_the_learner():
    result = assess_pronunciation(_comparison(accuracy=0.45), CLEAN, 0.93, 5.0, 50.0)
    assert result.reliability_notes == ("channels_disagree",)
    assert not result.phoneme_usable
    assert result.band == UNRELIABLE_CAP


def test_low_scores_on_both_channels_are_a_real_clarity_problem():
    result = assess_pronunciation(_comparison(accuracy=0.45), CLEAN, 0.5, 5.0, 50.0)
    assert result.reliable
    assert result.phoneme_usable
    assert result.band == 3.0


def test_monotone_speech_loses_half_a_band():
    normal = assess_pronunciation(_comparison(), CLEAN, 0.93, 5.0, 50.0).band
    flat = assess_pronunciation(_comparison(), CLEAN, 0.93, 1.0, 50.0).band
    assert flat == normal - 0.5


def test_noisy_recording_is_capped_and_labelled_not_punished_further():
    noisy = AudioQuality(60.0, 50.0, -20.0, 0.0, 5.0)
    result = assess_pronunciation(_comparison(), noisy, 0.97, 5.0, 50.0)
    assert result.band == UNRELIABLE_CAP
    assert not result.reliable
    assert result.reliability_notes == ("noisy_recording",)


def test_too_few_words_is_unreliable():
    assert not assess_pronunciation(_comparison(words=5), CLEAN, 0.93, 5.0, 50.0).reliable


def test_band_is_always_a_half_band_in_range():
    for confidence in (0.0, 0.3, 0.55, 0.7, 0.81, 0.86, 0.99):
        band = assess_pronunciation(_comparison(), CLEAN, confidence, 9.0, 50.0).band
        assert 0 <= band <= 9 and band * 2 == int(band * 2)
