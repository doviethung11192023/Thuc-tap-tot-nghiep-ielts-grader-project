"""
Pronunciation band from audio evidence. The LLM never decides this number: it cannot hear the
audio, so it only explains the band it is given.

The band rests on how confidently a speech model recognised the words, adjusted for intonation.
On L2-ARCTIC this tracked human error annotation better than phoneme accuracy did under grading
conditions (Spearman -0.441 against -0.339), so phoneme accuracy no longer sets the band: it only
supports the word hints and detects a recording the channels disagree about.

This estimates intelligibility, not individual sounds, so results must be shown as low confidence.

PROVISIONAL: the thresholds come from the spread of L2-ARCTIC read speech, not from examiners.
See docs/speech-eval-report.md.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass

from services.speaking.audio_signal import AudioQuality
from services.speaking.phoneme_comparison import ComparisonSummary
from utils.band_rounding import normalize_band

RUBRIC_VERSION = "provisional-2"

# Mean word confidence (0–1) → starting band, highest first.
_CONFIDENCE_BANDS = ((0.95, 8.0), (0.91, 7.0), (0.85, 6.0), (0.78, 5.0), (0.68, 4.0), (0.0, 3.0))
UNRELIABLE_CAP = 6.0            # same rule as the speaking/common/pr prompt for missing data
_MIN_WORDS = 30
_MIN_SNR_DB = 10.0
_MAX_CLIPPING = 0.01
_MONOTONE_SEMITONES = 3.0
_LIVELY_SEMITONES = 8.0
# The transcript reads as confident speech while the audio matches it badly. A person who is truly
# hard to understand lowers both, so this points at the recording: replay through speakers, reverb.
_DISAGREE_MAX_ACCURACY = 0.6
_DISAGREE_MIN_CONFIDENCE = 0.7


@dataclass(frozen=True)
class PronunciationAssessment:
    band: float
    reliable: bool
    reliability_notes: tuple[str, ...]
    rubric_version: str
    word_confidence: float
    phoneme_usable: bool
    phoneme_accuracy: float
    clear_word_ratio: float
    final_consonant_deletions: int
    th_substitutions: int
    pitch_range_semitones: float
    rhythm_npvi: float

    def as_dict(self) -> dict:
        return asdict(self)


def _channels_disagree(comparison: ComparisonSummary, word_confidence: float) -> bool:
    return comparison.phoneme_accuracy < _DISAGREE_MAX_ACCURACY and word_confidence >= _DISAGREE_MIN_CONFIDENCE


def _reliability_notes(quality: AudioQuality, comparison: ComparisonSummary, word_confidence: float) -> tuple[str, ...]:
    notes = []
    if comparison.word_count < _MIN_WORDS:
        notes.append("too_few_words")
    if quality.snr_db < _MIN_SNR_DB:
        notes.append("noisy_recording")
    if quality.clipping_ratio > _MAX_CLIPPING:
        notes.append("clipped_recording")
    if _channels_disagree(comparison, word_confidence):
        notes.append("channels_disagree")
    return tuple(notes)


def _prosody_adjustment(pitch_range: float) -> float:
    if pitch_range < _MONOTONE_SEMITONES:
        return -0.5
    if pitch_range >= _LIVELY_SEMITONES:
        return 0.5
    return 0.0


def assess_pronunciation(comparison: ComparisonSummary, quality: AudioQuality, word_confidence: float,
                         pitch_range: float, rhythm_npvi: float) -> PronunciationAssessment:
    band = next(value for floor, value in _CONFIDENCE_BANDS if word_confidence >= floor)
    band += _prosody_adjustment(pitch_range)
    notes = _reliability_notes(quality, comparison, word_confidence)
    if notes:
        band = min(band, UNRELIABLE_CAP)
    return PronunciationAssessment(
        band=normalize_band(band),
        reliable=not notes,
        reliability_notes=notes,
        rubric_version=RUBRIC_VERSION,
        word_confidence=round(word_confidence, 3),
        phoneme_usable="channels_disagree" not in notes,
        phoneme_accuracy=round(comparison.phoneme_accuracy, 3),
        clear_word_ratio=round(comparison.clear_word_ratio, 3),
        final_consonant_deletions=comparison.final_consonant_deletions,
        th_substitutions=comparison.th_substitutions,
        pitch_range_semitones=round(pitch_range, 2),
        rhythm_npvi=round(rhythm_npvi, 1),
    )
