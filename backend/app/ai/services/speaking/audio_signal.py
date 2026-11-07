"""
Layer 0, signal: decode answers and judge recording quality before anything else runs.

A poor recording must not be mistaken for poor pronunciation, so quality is measured here and
carried through to the pronunciation rubric as a reliability signal.
"""
from __future__ import annotations

import io
from dataclasses import dataclass

import httpx
import numpy as np
from faster_whisper.audio import decode_audio
from faster_whisper.vad import VadOptions, get_speech_timestamps

SAMPLE_RATE = 16_000
MAX_AUDIO_BYTES = 15 * 1024 * 1024
DOWNLOAD_TIMEOUT_SECONDS = 60.0

_FRAME_SECONDS = 0.025
_CLIP_LEVEL = 0.99
_SILENCE_FLOOR = 1e-10
MIN_SPEECH_SECONDS = 0.3      # shorter than this is a cough or a click, not an answer


@dataclass(frozen=True)
class SpeechSegment:
    start: float
    end: float

    @property
    def duration(self) -> float:
        return self.end - self.start


@dataclass(frozen=True)
class AudioQuality:
    duration_seconds: float
    speech_seconds: float
    rms_dbfs: float
    clipping_ratio: float
    snr_db: float


async def download_audio(url: str) -> bytes:
    """Fetch one answer from its short-lived signed URL, refusing oversized files."""
    async with httpx.AsyncClient(timeout=DOWNLOAD_TIMEOUT_SECONDS) as client:
        async with client.stream("GET", url) as response:
            response.raise_for_status()
            chunks: list[bytes] = []
            size = 0
            async for chunk in response.aiter_bytes():
                size += len(chunk)
                if size > MAX_AUDIO_BYTES:
                    raise ValueError("Audio file exceeds the size limit")
                chunks.append(chunk)
    return b"".join(chunks)


def decode_to_mono_16k(data: bytes) -> np.ndarray:
    """Any browser container (WebM, Ogg, MP4) → float32 mono at 16 kHz."""
    return decode_audio(io.BytesIO(data), sampling_rate=SAMPLE_RATE)


def detect_speech(samples: np.ndarray) -> list[SpeechSegment]:
    """Silero VAD. Pauses shorter than 250 ms are articulation, so segments stay joined across them."""
    if samples.size == 0:
        return []
    options = VadOptions(min_silence_duration_ms=250, speech_pad_ms=30, min_speech_duration_ms=100)
    stamps = get_speech_timestamps(samples, options)
    return [SpeechSegment(s["start"] / SAMPLE_RATE, s["end"] / SAMPLE_RATE) for s in stamps]


def _frame_energies(samples: np.ndarray) -> np.ndarray:
    size = int(_FRAME_SECONDS * SAMPLE_RATE)
    usable = samples.size - samples.size % size
    if usable == 0:
        return np.array([_SILENCE_FLOOR])
    return np.mean(samples[:usable].reshape(-1, size) ** 2, axis=1)


def measure_quality(samples: np.ndarray, segments: list[SpeechSegment]) -> AudioQuality:
    """SNR compares loud frames (speech) with quiet frames (noise floor); it needs no reference signal."""
    if samples.size == 0:
        return AudioQuality(0.0, 0.0, -120.0, 0.0, 0.0)
    energies = np.maximum(_frame_energies(samples), _SILENCE_FLOOR)
    noise = float(np.percentile(energies, 10))
    speech = float(np.percentile(energies, 95))
    return AudioQuality(
        duration_seconds=samples.size / SAMPLE_RATE,
        speech_seconds=sum(s.duration for s in segments),
        rms_dbfs=float(10 * np.log10(np.mean(energies))),
        clipping_ratio=float(np.mean(np.abs(samples) >= _CLIP_LEVEL)),
        snr_db=float(10 * np.log10(speech / noise)),
    )
