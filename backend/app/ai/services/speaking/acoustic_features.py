"""
Layer 1, acoustics: fluency and prosody measured directly from the waveform.

This module never sees a transcript, by design: an ASR cannot autocorrect these numbers.

Syllables are counted with the De Jong & Wempe (2009) method: an intensity peak that rises above
a threshold, stands out from the dip before it, and is voiced counts as one syllable nucleus.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass

import numpy as np
import parselmouth

from services.speaking.audio_signal import SAMPLE_RATE, SpeechSegment

_INTENSITY_MIN_PITCH = 50.0
_INTENSITY_STEP = 0.016
_SILENCE_DROP_DB = 25.0       # peaks further than this below the 99th percentile are silence
_MIN_DIP_DB = 2.0             # a peak must rise this far above the previous dip
_PITCH_FLOOR = 60.0
_PITCH_CEILING = 500.0
PAUSE_SECONDS = 0.25          # a silent gap this long counts as a pause
LONG_PAUSE_SECONDS = 1.0


@dataclass(frozen=True)
class AcousticFeatures:
    syllable_count: int
    speech_rate: float            # syllables per second of the whole answer, pauses included
    articulation_rate: float      # syllables per second of actual speaking time
    avg_syllable_duration: float
    pause_count: int
    long_pause_count: int
    pause_ratio: float
    mean_pause_seconds: float
    mean_run_syllables: float     # syllables between pauses
    pitch_range_semitones: float  # 5th to 95th percentile
    pitch_variation_semitones: float
    rhythm_npvi: float            # variability of consecutive syllable intervals
    stress_contrast_db: float     # spread of syllable peak loudness

    def as_metrics(self) -> dict[str, float]:
        return {name: round(float(value), 3) for name, value in asdict(self).items()}


def find_syllable_nuclei(times: np.ndarray, intensity: np.ndarray, is_voiced) -> np.ndarray:
    """Times of syllable nuclei: above threshold, separated by a dip, voiced."""
    if intensity.size < 3:
        return np.array([])
    threshold = max(float(np.percentile(intensity, 99)) - _SILENCE_DROP_DB, float(np.median(intensity)))
    is_peak = (intensity[1:-1] > intensity[:-2]) & (intensity[1:-1] >= intensity[2:]) & (intensity[1:-1] >= threshold)
    peak_indices = np.flatnonzero(is_peak) + 1

    kept: list[int] = []
    for index in peak_indices:
        if not kept:
            kept.append(int(index))
            continue
        previous = kept[-1]
        dip = float(np.min(intensity[previous:index + 1]))
        if intensity[index] - dip >= _MIN_DIP_DB:
            kept.append(int(index))
        elif intensity[index] > intensity[previous]:
            kept[-1] = int(index)        # same syllable, keep its true maximum
    return np.array([times[i] for i in kept if is_voiced(times[i])])


def _nuclei_and_pitch(samples: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    sound = parselmouth.Sound(samples.astype(np.float64), sampling_frequency=SAMPLE_RATE)
    intensity = sound.to_intensity(minimum_pitch=_INTENSITY_MIN_PITCH, time_step=_INTENSITY_STEP)
    pitch = sound.to_pitch(time_step=0.01, pitch_floor=_PITCH_FLOOR, pitch_ceiling=_PITCH_CEILING)
    times, values = intensity.xs(), intensity.values[0]

    def voiced(moment: float) -> bool:
        return not np.isnan(pitch.get_value_at_time(moment))

    nuclei = find_syllable_nuclei(times, values, voiced)
    peaks = np.interp(nuclei, times, values) if nuclei.size else np.array([])
    frequencies = pitch.selected_array["frequency"]
    return nuclei, peaks, frequencies[frequencies > 0]


def _pitch_measures(voiced_hz: np.ndarray) -> tuple[float, float]:
    if voiced_hz.size < 2:
        return 0.0, 0.0
    semitones = 12 * np.log2(voiced_hz / np.median(voiced_hz))
    low, high = np.percentile(semitones, [5, 95])
    return float(high - low), float(np.std(semitones))


def _pauses(segments: list[SpeechSegment]) -> list[tuple[float, float]]:
    return [(before.end, after.start) for before, after in zip(segments, segments[1:])
            if after.start - before.end >= PAUSE_SECONDS]


def _rhythm_npvi(nuclei: np.ndarray, pauses: list[tuple[float, float]]) -> float:
    """nPVI of inter-syllable intervals. An interval that spans a pause is not rhythm, so it splits the sequence."""
    pairs: list[tuple[float, float]] = []
    previous: float | None = None
    for start, end in zip(nuclei, nuclei[1:]):
        if any(start <= pause_start and pause_end <= end for pause_start, pause_end in pauses):
            previous = None
            continue
        interval = float(end - start)
        if previous is not None:
            pairs.append((previous, interval))
        previous = interval
    if not pairs:
        return 0.0
    return float(100 * np.mean([abs(a - b) / ((a + b) / 2) for a, b in pairs]))


def _runs(nuclei: np.ndarray, segments: list[SpeechSegment]) -> float:
    """Mean syllables per uninterrupted run, where a run ends at a pause."""
    if not segments or nuclei.size == 0:
        return 0.0
    runs: list[list[SpeechSegment]] = [[segments[0]]]
    for before, after in zip(segments, segments[1:]):
        if after.start - before.end >= PAUSE_SECONDS:
            runs.append([after])
        else:
            runs[-1].append(after)
    counts = [int(np.sum((nuclei >= run[0].start) & (nuclei <= run[-1].end))) for run in runs]
    spoken = [count for count in counts if count > 0]
    return float(np.mean(spoken)) if spoken else 0.0


def extract_acoustic_features(samples: np.ndarray, segments: list[SpeechSegment]) -> AcousticFeatures:
    if not segments:
        return AcousticFeatures(0, 0.0, 0.0, 0.0, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0)
    nuclei, peaks, voiced_hz = _nuclei_and_pitch(samples)
    span = segments[-1].end - segments[0].start
    phonation = sum(s.duration for s in segments)
    count = int(nuclei.size)
    pauses = _pauses(segments)
    durations = [end - start for start, end in pauses]
    pitch_range, pitch_variation = _pitch_measures(voiced_hz)
    return AcousticFeatures(
        syllable_count=count,
        speech_rate=count / span if span > 0 else 0.0,
        articulation_rate=count / phonation if phonation > 0 else 0.0,
        avg_syllable_duration=phonation / count if count else 0.0,
        pause_count=len(durations),
        long_pause_count=sum(1 for d in durations if d >= LONG_PAUSE_SECONDS),
        pause_ratio=sum(durations) / span if span > 0 else 0.0,
        mean_pause_seconds=float(np.mean(durations)) if durations else 0.0,
        mean_run_syllables=_runs(nuclei, segments),
        pitch_range_semitones=pitch_range,
        pitch_variation_semitones=pitch_variation,
        rhythm_npvi=_rhythm_npvi(nuclei, pauses),
        stress_contrast_db=float(np.std(peaks)) if peaks.size > 1 else 0.0,
    )
