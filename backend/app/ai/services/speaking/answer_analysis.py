"""
Runs the speech layers on one answer, then combines answers into test-level evidence.

Every per-answer number here is produced without an LLM. Whole-test measures weight each answer
by how long the learner actually spoke, so a one-word answer cannot outweigh the Part 2 talk.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from services.speaking.acoustic_features import AcousticFeatures, extract_acoustic_features
from services.speaking.audio_signal import (
    MIN_SPEECH_SECONDS, AudioQuality, decode_to_mono_16k, detect_speech, measure_quality,
)
from services.speaking.phoneme_comparison import ComparisonSummary, WordResult, compare_words, summarize
from services.speaking.phoneme_recognizer import canonical_words, recognize_phonemes
from services.speaking.speech_transcriber import Transcript, clean_word, repair_metrics, transcribe

_ACOUSTIC_AVERAGED = ("speech_rate", "articulation_rate", "avg_syllable_duration", "pause_ratio",
                      "mean_pause_seconds", "mean_run_syllables", "pitch_range_semitones",
                      "pitch_variation_semitones", "rhythm_npvi", "stress_contrast_db")
_ACOUSTIC_SUMMED = ("syllable_count", "pause_count", "long_pause_count")


@dataclass
class AnswerAnalysis:
    response_id: str
    part: int
    question: str
    silent: bool
    quality: AudioQuality
    transcript: Transcript = field(default_factory=lambda: Transcript("", ()))
    acoustic: AcousticFeatures | None = None
    word_results: list[WordResult] = field(default_factory=list)
    insertions: int = 0
    metrics: dict[str, float] = field(default_factory=dict)


def mean_word_confidence(transcripts: list[Transcript]) -> float:
    """Average over the words the ASR heard, the only words known at grading time."""
    scores = [w.confidence for t in transcripts for w in t.words if clean_word(w.text)]
    return float(np.mean(scores)) if scores else 0.0


def analyze_answer(response_id: str, part: int, question: str, audio: bytes) -> AnswerAnalysis:
    samples = decode_to_mono_16k(audio)
    segments = detect_speech(samples)
    quality = measure_quality(samples, segments)
    if quality.speech_seconds < MIN_SPEECH_SECONDS:
        return AnswerAnalysis(response_id, part, question, True, quality)

    acoustic = extract_acoustic_features(samples, segments)
    transcript = transcribe(samples)
    words = canonical_words([w.text for w in transcript.words])
    word_results, insertions = compare_words(words, recognize_phonemes(samples))
    comparison = summarize(word_results, insertions)
    metrics = {**acoustic.as_metrics(), **repair_metrics(transcript, quality.speech_seconds),
               "snr_db": round(quality.snr_db, 1), "phoneme_accuracy": round(comparison.phoneme_accuracy, 3),
               "clear_word_ratio": round(comparison.clear_word_ratio, 3),
               "word_confidence": round(mean_word_confidence([transcript]), 3)}
    return AnswerAnalysis(response_id, part, question, False, quality, transcript, acoustic,
                          word_results, insertions, metrics)


def combine_quality(answers: list[AnswerAnalysis]) -> AudioQuality:
    spoken = [a for a in answers if not a.silent]
    weights = np.array([a.quality.speech_seconds for a in spoken])
    return AudioQuality(
        duration_seconds=sum(a.quality.duration_seconds for a in spoken),
        speech_seconds=float(weights.sum()),
        rms_dbfs=float(np.average([a.quality.rms_dbfs for a in spoken], weights=weights)),
        clipping_ratio=max(a.quality.clipping_ratio for a in spoken),
        snr_db=float(np.average([a.quality.snr_db for a in spoken], weights=weights)),
    )


def combine_comparison(answers: list[AnswerAnalysis]) -> ComparisonSummary:
    words = [result for a in answers for result in a.word_results]
    return summarize(words, sum(a.insertions for a in answers))


def combine_metrics(answers: list[AnswerAnalysis]) -> dict[str, float]:
    """Whole-test fluency evidence for the speaking/common/fc prompt."""
    spoken = [a for a in answers if not a.silent and a.acoustic]
    if not spoken:
        return {}
    weights = np.array([a.quality.speech_seconds for a in spoken])
    combined: dict[str, float] = {}
    for name in _ACOUSTIC_AVERAGED:
        values = [getattr(a.acoustic, name) for a in spoken]
        combined[name] = round(float(np.average(values, weights=weights)), 3)
    for name in _ACOUSTIC_SUMMED:
        combined[name] = sum(getattr(a.acoustic, name) for a in spoken)
    for name in ("word_count", "filler_count", "repetition_count", "self_correction_count"):
        combined[name] = sum(a.metrics.get(name, 0) for a in spoken)
    minutes = float(weights.sum()) / 60
    combined["speaking_minutes"] = round(minutes, 2)
    combined["words_per_minute"] = round(combined["word_count"] / minutes, 1) if minutes else 0.0
    combined["fillers_per_minute"] = round(combined["filler_count"] / minutes, 2) if minutes else 0.0
    return combined
