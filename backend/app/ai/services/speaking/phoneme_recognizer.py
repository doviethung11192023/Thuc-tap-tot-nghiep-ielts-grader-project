"""
Layer 3, audio channel: which phonemes are in the audio.

A CTC acoustic model decoded greedily has no language model and no dictionary, so it has no way
to "know" the likely word. That is the property this channel exists for: unlike the transcript,
its output is not pulled towards correct English.

Canonical phonemes for the intended words come from espeak, the same alphabet the model was
trained on, so the two sides of the comparison share one symbol set.
"""
from __future__ import annotations

import re
import threading

import numpy as np

from services.speaking.audio_signal import SAMPLE_RATE
from services.speaking.phoneme_comparison import WordPhones
from services.speaking.speech_transcriber import clean_word
from settings.config import get_settings

_STRESS_MARKS = re.compile("[ˈˌ͡‿ ]")
_FUNCTION_WORDS = frozenset(
    "a an the of to in on at for with by from and or but so if as is are was were be been am do does did "
    "have has had will would can could should may might must i you he she it we they me him her us them "
    "my your his its our their this that these those there not".split()
)
_model = None
_processor = None
_lock = threading.Lock()


def _configure_espeak() -> None:
    """phonemizer finds espeak-ng through the library bundled by espeakng-loader, so no system install is needed."""
    import espeakng_loader
    from phonemizer.backend.espeak.wrapper import EspeakWrapper

    EspeakWrapper.set_library(espeakng_loader.get_library_path())
    EspeakWrapper.set_data_path(espeakng_loader.get_data_path())


def _load():
    global _model, _processor
    with _lock:
        if _model is None:
            import torch
            from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

            _configure_espeak()
            settings = get_settings()
            device = "cuda" if settings.speech_device != "cpu" and torch.cuda.is_available() else "cpu"
            _processor = Wav2Vec2Processor.from_pretrained(settings.speech_phoneme_model)
            _model = Wav2Vec2ForCTC.from_pretrained(settings.speech_phoneme_model).to(device).eval()
        return _model, _processor


def recognize_phonemes(samples: np.ndarray) -> list[str]:
    """Greedy CTC decoding: the best symbol per frame, repeats collapsed, blanks dropped."""
    import torch

    model, processor = _load()
    inputs = processor(samples, sampling_rate=SAMPLE_RATE, return_tensors="pt", padding=True)
    with torch.inference_mode():
        logits = model(inputs.input_values.to(model.device)).logits[0]
    token_ids = torch.argmax(logits, dim=-1).tolist()
    tokenizer = processor.tokenizer
    phones: list[str] = []
    previous = None
    for token_id in token_ids:
        if token_id != previous and token_id != tokenizer.pad_token_id:
            phones.append(tokenizer.convert_ids_to_tokens(token_id))
        previous = token_id
    return [phone for phone in (_STRESS_MARKS.sub("", p) for p in phones) if phone and phone != "|"]


def _vocabulary() -> list[str]:
    _, processor = _load()
    symbols = [s for s in processor.tokenizer.get_vocab() if not s.startswith("<")]
    return sorted(symbols, key=len, reverse=True)


def split_ipa(ipa: str, symbols: list[str]) -> tuple[str, ...]:
    """Longest-match split into the model's own symbols, so 'aɪ' stays one phoneme."""
    text = _STRESS_MARKS.sub("", ipa)
    phones: list[str] = []
    position = 0
    while position < len(text):
        symbol = next((s for s in symbols if text.startswith(s, position)), None)
        if symbol is None:
            position += 1       # a symbol the model has no token for cannot be compared
            continue
        phones.append(symbol)
        position += len(symbol)
    return tuple(phones)


def canonical_words(words: list[str]) -> list[WordPhones]:
    """Dictionary pronunciation of each intended word. Word boundaries stay, so errors map back to words."""
    from phonemizer import phonemize

    _load()
    cleaned = [w for w in (clean_word(word) for word in words) if w]
    if not cleaned:
        return []
    ipa_list = phonemize(cleaned, language="en-us", backend="espeak", strip=True, with_stress=False,
                         preserve_punctuation=False)
    symbols = _vocabulary()
    return [WordPhones(word, split_ipa(ipa, symbols), word not in _FUNCTION_WORDS)
            for word, ipa in zip(cleaned, ipa_list)]
