"""
Layer 2, intent channel: what the learner meant to say, with word timings.

The transcript feeds LR, GRA and coherence. It is never evidence of pronunciation, because an ASR
decoder resolves unclear sounds into likely words. Settings below push it towards verbatim output.
"""
from __future__ import annotations

import re
import threading
from dataclasses import dataclass

import numpy as np
from faster_whisper import WhisperModel

from settings.config import get_settings

# Showing disfluencies in the prompt biases Whisper towards keeping them instead of cleaning them up.
_VERBATIM_HINT = "Umm, let me think, like, hmm... Okay, so, uh, I mean, you know, well, um, I go, I went to, uh, the the school."
_FILLERS = frozenset({"um", "umm", "uh", "uhh", "er", "erm", "ah", "hmm", "mm"})
_REPAIR_PHRASE = re.compile(r"\b(i mean|sorry|no wait|i meant|let me rephrase)\b", re.IGNORECASE)

_model: WhisperModel | None = None
_model_lock = threading.Lock()


@dataclass(frozen=True)
class TimedWord:
    text: str
    start: float
    end: float
    confidence: float


@dataclass(frozen=True)
class Transcript:
    text: str
    words: tuple[TimedWord, ...]


def clean_word(text: str) -> str:
    return re.sub(r"[^a-z']", "", text.lower())


def _resolve_device_and_compute(settings) -> tuple[str, str]:
    device = settings.speech_device
    compute_type = settings.speech_stt_compute_type
    if device == "auto":
        try:
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"
        except Exception:
            device = "cpu"
    if device == "cpu" and compute_type == "auto":
        compute_type = "int8"
    return device, compute_type


def _get_model(force_cpu: bool = False) -> WhisperModel:
    global _model
    with _model_lock:
        if _model is None or force_cpu:
            settings = get_settings()
            if force_cpu:
                device, compute_type = "cpu", "int8"
            else:
                device, compute_type = _resolve_device_and_compute(settings)
            try:
                _model = WhisperModel(settings.speech_stt_model, device=device, compute_type=compute_type)
            except Exception as exc:
                if device != "cpu" and any(k in str(exc).lower() for k in ("cublas", "cuda", "cudnn")):
                    _model = WhisperModel(settings.speech_stt_model, device="cpu", compute_type="int8")
                else:
                    raise
        return _model


def _run_transcribe(model: WhisperModel, samples: np.ndarray, settings) -> Transcript:
    segments, _ = model.transcribe(
        samples,
        language="en",
        beam_size=settings.speech_stt_beam_size,
        word_timestamps=True,
        condition_on_previous_text=False,   # stops earlier text from steering what is "heard" next
        initial_prompt=_VERBATIM_HINT,
        vad_filter=False,                   # Layer 0 already found the speech; fillers live near its edges
        temperature=0.0,
    )
    words: list[TimedWord] = []
    for segment in segments:
        words.extend(TimedWord(w.word.strip(), w.start, w.end, w.probability) for w in segment.words or [])
    return Transcript(" ".join(w.text for w in words), tuple(words))


def transcribe(samples: np.ndarray) -> Transcript:
    settings = get_settings()
    try:
        return _run_transcribe(_get_model(), samples, settings)
    except Exception as exc:
        if any(k in str(exc).lower() for k in ("cublas", "cuda", "cudnn")):
            return _run_transcribe(_get_model(force_cpu=True), samples, settings)
        raise


def repair_metrics(transcript: Transcript, speaking_seconds: float) -> dict[str, float]:
    """Fluency repairs. These rest on the transcript, so they are only as verbatim as the ASR."""
    tokens = [clean_word(w.text) for w in transcript.words]
    tokens = [t for t in tokens if t]
    fillers = sum(1 for t in tokens if t in _FILLERS)
    repeats = sum(1 for a, b in zip(tokens, tokens[1:]) if a == b and a not in _FILLERS)
    repairs = len(_REPAIR_PHRASE.findall(transcript.text))
    minutes = speaking_seconds / 60 if speaking_seconds > 0 else 0
    return {
        "word_count": len(tokens) - fillers,
        "filler_count": fillers,
        "repetition_count": repeats,
        "self_correction_count": repairs,
        "fillers_per_minute": round(fillers / minutes, 2) if minutes else 0.0,
        "words_per_minute": round((len(tokens) - fillers) / minutes, 1) if minutes else 0.0,
    }
