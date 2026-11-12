"""BR-25: a short Part 2 caps FC; a small sample caps LR and GRA; a skipped Part 2 is left to BR-23."""
import pytest

from services.speaking.answer_analysis import AnswerAnalysis
from services.speaking.audio_signal import AudioQuality
from services.speaking.speaking_length_cap import measure_length


def _answer(part, seconds):
    return AnswerAnalysis(f"r{part}", part, "q", False, AudioQuality(seconds, seconds * 0.8, -20.0, 0.0, 30.0))


@pytest.mark.parametrize("seconds, fc_max", [(20.0, 4.0), (45.0, 5.0), (75.0, None)])
def test_part2_length_caps_fluency(seconds, fc_max):
    assert measure_length([_answer(1, 10.0), _answer(2, seconds)], 400).fc_max == fc_max


def test_skipped_part2_is_not_counted_twice():
    limits = measure_length([_answer(1, 10.0), _answer(3, 40.0)], 400)
    assert limits.part2_seconds is None and limits.fc_max is None and limits.note() is None


@pytest.mark.parametrize("words, language_max", [(120, 5.0), (249, 5.0), (250, None)])
def test_small_sample_caps_vocabulary_and_grammar(words, language_max):
    assert measure_length([_answer(2, 90.0)], words).language_max == language_max
