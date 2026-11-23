"""BR-24: a clean recording that matches its transcript badly caps every criterion; a bad recording does not."""
import pytest

from services.speaking.audio_signal import AudioQuality
from services.speaking.phoneme_comparison import ComparisonSummary
from services.speaking.speaking_intelligibility_cap import measure_intelligibility

CLEAN = AudioQuality(60.0, 50.0, -20.0, 0.0, 14.0)


def _comparison(accuracy, clear, words=300):
    return ComparisonSummary(accuracy, clear, 0.0, 0, 0, words)


@pytest.mark.parametrize("accuracy, clear, ceiling", [
    (0.91, 0.97, None),     # 2026-11-12 12:09, fluent speech
    (0.88, 0.92, None),     # 2026-11-12 12:17
    (0.57, 0.46, 4.0),      # 2026-11-12 22:17, learner's own estimate band 2–3
    (0.62, 0.70, 5.0),
    (0.65, 0.55, 4.0),      # clear words below 60%
    (0.80, 0.80, 6.0),
    (0.65, 0.92, 6.0),      # low accuracy alone: under 0.7
    (0.58, 0.90, 5.0),      # low accuracy alone is enough
    (0.03, 0.0, 4.0),       # 13:05, "what, what, what"
])
def test_ceiling_follows_how_well_the_audio_supports_the_transcript(accuracy, clear, ceiling):
    assert measure_intelligibility(_comparison(accuracy, clear), CLEAN).max_band == ceiling


def test_note_tells_the_learner_why():
    note = measure_intelligibility(_comparison(0.57, 0.46), CLEAN).note()
    assert "46% từ được nghe rõ" in note and "4.0" in note


@pytest.mark.parametrize("quality, words", [
    (AudioQuality(60.0, 50.0, -20.0, 0.0, 5.0), 300),       # noisy: the recording's fault
    (AudioQuality(60.0, 50.0, -20.0, 0.05, 30.0), 300),     # clipped
    (CLEAN, 10),                                             # too few words to judge
])
def test_bad_or_thin_recording_gets_no_ceiling(quality, words):
    assert measure_intelligibility(_comparison(0.3, 0.2, words), quality).max_band is None
