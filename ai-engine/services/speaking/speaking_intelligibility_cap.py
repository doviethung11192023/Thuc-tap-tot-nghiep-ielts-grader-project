"""
Band ceiling when the audio does not support the transcript (BR-24).

FC, LR and GRA are judged from Whisper's transcript, and Whisper's language model smooths broken
speech into fluent text. The phoneme channel listens without a language model, so when a clean
recording matches its own transcript badly, the learner was hard to understand and the transcript
overstates them. Then no criterion may rise above what the audio supports.

A noisy or clipped recording is the recording's fault, not the learner's: it keeps the P cap and
the re-record hint of the pronunciation rubric and gets no ceiling here.

PROVISIONAL thresholds, set 2026-11-12 and tightened 2026-11-13 from the tests at hand: fluent
speech scored 0.88–0.91 phoneme accuracy and 0.92–0.97 clear words; a learner who rated their own
test band 2–3 scored 0.57 and 0.46.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass

from services.speaking.audio_signal import AudioQuality
from services.speaking.phoneme_comparison import ComparisonSummary

# (minimum clear-word ratio, minimum phoneme accuracy, highest band allowed), strictest first.
_CEILINGS = ((0.6, 0.5, 4.0), (0.75, 0.6, 5.0), (0.85, 0.7, 6.0))
_MIN_WORDS = 30                 # fewer words: the comparison itself is too thin to judge
_MIN_SNR_DB = 10.0
_MAX_CLIPPING = 0.01


@dataclass(frozen=True)
class Intelligibility:
    clear_word_ratio: float
    phoneme_accuracy: float
    max_band: float | None      # None: the audio supports the transcript, no ceiling

    def as_dict(self) -> dict:
        return {**asdict(self), "note": self.note()}

    def note(self) -> str | None:
        if self.max_band is None:
            return None
        return (f"Chỉ {round(self.clear_word_ratio * 100)}% từ được nghe rõ nên hệ thống không tin được "
                f"transcript; điểm mỗi tiêu chí tối đa {self.max_band:.1f}.")


def measure_intelligibility(comparison: ComparisonSummary, quality: AudioQuality) -> Intelligibility:
    clear, accuracy = comparison.clear_word_ratio, comparison.phoneme_accuracy
    judged = (comparison.word_count >= _MIN_WORDS and quality.snr_db >= _MIN_SNR_DB
              and quality.clipping_ratio <= _MAX_CLIPPING)
    ceiling = next((limit for min_clear, min_accuracy, limit in _CEILINGS
                    if clear < min_clear or accuracy < min_accuracy), None) if judged else None
    return Intelligibility(round(clear, 3), round(accuracy, 3), ceiling)
