"""Layers 0 and 1 run on synthetic signals, so every expected value is known exactly."""
import numpy as np
import pytest

from services.speaking.acoustic_features import extract_acoustic_features, find_syllable_nuclei
from services.speaking.audio_signal import SAMPLE_RATE, SpeechSegment, measure_quality


def _syllables(count: int, rate_hz: float, f0: float = 150.0) -> np.ndarray:
    """A voiced harmonic tone with one loudness burst per syllable."""
    t = np.arange(int(count / rate_hz * SAMPLE_RATE)) / SAMPLE_RATE
    harmonics = sum(np.sin(2 * np.pi * f0 * k * t) / k for k in range(1, 8))
    envelope = np.sin(np.pi * rate_hz * t) ** 2   # one burst per 1/rate_hz seconds
    return (0.25 * harmonics * envelope).astype(np.float32)


def _silence(seconds: float) -> np.ndarray:
    return np.zeros(int(seconds * SAMPLE_RATE), dtype=np.float32)


def _whole(samples: np.ndarray) -> list[SpeechSegment]:
    return [SpeechSegment(0.0, samples.size / SAMPLE_RATE)]


def test_counts_syllables_from_loudness_peaks():
    samples = _syllables(count=12, rate_hz=4.0)
    features = extract_acoustic_features(samples, _whole(samples))
    assert abs(features.syllable_count - 12) <= 1
    assert features.articulation_rate == pytest.approx(4.0, abs=0.4)


def test_faster_speech_measures_faster():
    slow = _syllables(12, 3.0)
    fast = _syllables(12, 6.0)
    assert extract_acoustic_features(fast, _whole(fast)).articulation_rate > \
        extract_acoustic_features(slow, _whole(slow)).articulation_rate * 1.5


def test_unvoiced_peaks_are_not_syllables():
    times = np.array([0.0, 0.1, 0.2, 0.3, 0.4])
    intensity = np.array([40.0, 70.0, 40.0, 70.0, 40.0])
    assert find_syllable_nuclei(times, intensity, lambda t: t < 0.2).tolist() == [0.1]


def test_shallow_ripple_is_one_syllable():
    times = np.array([0.0, 0.1, 0.2, 0.3, 0.4])
    intensity = np.array([40.0, 70.0, 69.0, 70.5, 40.0])
    assert find_syllable_nuclei(times, intensity, lambda t: True).tolist() == [0.3]


def test_pauses_counted_from_speech_segments():
    first, gap, second, long_gap, third = _syllables(8, 4.0), _silence(0.5), _syllables(8, 4.0), _silence(1.5), _syllables(8, 4.0)
    samples = np.concatenate([first, gap, second, long_gap, third])
    segments = [SpeechSegment(0.0, 2.0), SpeechSegment(2.5, 4.5), SpeechSegment(6.0, 8.0)]
    features = extract_acoustic_features(samples, segments)
    assert features.pause_count == 2
    assert features.long_pause_count == 1
    assert features.pause_ratio == pytest.approx(2.0 / 8.0, abs=0.01)
    assert features.mean_pause_seconds == pytest.approx(1.0, abs=0.01)
    assert abs(features.mean_run_syllables - 8) <= 1


def test_gap_shorter_than_pause_threshold_does_not_split_a_run():
    samples = _syllables(16, 4.0)
    segments = [SpeechSegment(0.0, 1.9), SpeechSegment(2.0, 4.0)]
    features = extract_acoustic_features(samples, segments)
    assert features.pause_count == 0
    assert features.mean_run_syllables > 12


def test_monotone_has_no_pitch_range_but_gliding_pitch_does():
    flat = _syllables(12, 4.0, f0=150.0)
    t = np.arange(flat.size) / SAMPLE_RATE
    phase = 2 * np.pi * (120 * t + 40 * t ** 2)
    glide = (0.25 * np.sin(phase)).astype(np.float32)
    assert extract_acoustic_features(flat, _whole(flat)).pitch_range_semitones < 1.0
    assert extract_acoustic_features(glide, _whole(glide)).pitch_range_semitones > 4.0


def test_no_speech_gives_zero_features():
    assert extract_acoustic_features(_silence(1.0), []).syllable_count == 0


def test_quality_separates_clean_from_noisy_recording():
    clean = np.concatenate([_silence(1.0), _syllables(12, 4.0)])
    noise = np.random.default_rng(0).normal(0, 0.05, clean.size).astype(np.float32)
    assert measure_quality(clean, _whole(clean)).snr_db > measure_quality(clean + noise, _whole(clean)).snr_db + 10


def test_quality_reports_clipping():
    loud = np.clip(_syllables(12, 4.0) * 10, -1, 1)
    assert measure_quality(loud, _whole(loud)).clipping_ratio > 0.05
