"""
Does the phoneme channel find real learner errors? Measured on L2-ARCTIC, human-annotated phone by phone.

Two questions, because the system uses the channel in two ways:
  - word level: does a low word score mean a human marked that word wrong? (the "có thể sai" hints)
  - utterance level: does phoneme accuracy track the human error rate? (this drives band P)
Each is compared with the baseline of Whisper word confidence. The intended words come from the
annotation, so ASR mistakes cannot leak into the measure.

The grader never knows the intended words, so the `live_*` utterance measures repeat the comparison
under grading conditions: phonemes compared with the Whisper transcript, and confidence averaged
over the words Whisper actually heard. Only these two can justify a choice for the band.

Usage:
    .venv/bin/python scripts/evaluate_l2_arctic.py --data ../../../private/speech-eval/l2-arctic \
        --out ../../../private/speech-eval/l2-arctic-results.json
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import numpy as np  # noqa: E402
from faster_whisper import WhisperModel  # noqa: E402

from evaluate_speech_models import BASELINE_MODEL, rank_auc, word_confidences  # noqa: E402
from l2_arctic_annotations import annotated_words  # noqa: E402
from services.speaking.audio_signal import decode_to_mono_16k  # noqa: E402
from services.speaking.phoneme_comparison import compare_words, summarize  # noqa: E402
from services.speaking.phoneme_recognizer import canonical_words, recognize_phonemes  # noqa: E402
from services.speaking.speech_transcriber import _VERBATIM_HINT, clean_word  # noqa: E402

SPEAKERS = ("HQTV", "PNV", "THV", "TLV")
HINT_MAX_ACCURACY, HINT_MIN_PHONES = 0.6, 3     # same rule as likely_mispronounced


def spearman(xs: list[float], ys: list[float]) -> float | None:
    if len(xs) < 3:
        return None
    def ranks(values: list[float]) -> np.ndarray:
        data = np.asarray(values, dtype=float)
        return np.array([(np.sum(data < v) + (np.sum(data == v) + 1) / 2) for v in data])
    a, b = ranks(xs), ranks(ys)
    if a.std() == 0 or b.std() == 0:
        return None
    return round(float(np.corrcoef(a, b)[0, 1]), 3)


def auc_of(rows: list[dict], key: str, is_wrong, is_right) -> float | None:
    value = rank_auc([r[key] for r in rows if is_wrong(r)], [r[key] for r in rows if is_right(r)])
    return None if value is None else round(value, 3)


def word_report(rows: list[dict]) -> dict:
    right = lambda r: not r["errors"]   # noqa: E731
    report = {"words": len(rows), "wrong_words": sum(bool(r["errors"]) for r in rows)}
    for name, key in (("phoneme", "accuracy"), ("whisper_baseline", "confidence")):
        report[name] = {
            "auc": auc_of(rows, key, lambda r: bool(r["errors"]), right),
            "auc_excluding_accent_marked": auc_of(rows, key, lambda r: r["errors"] and not r["accent_only"], right),
            "auc_content_words": auc_of([r for r in rows if r["content"]], key, lambda r: bool(r["errors"]), right),
            "auc_by_error": {kind: auc_of(rows, key, lambda r: kind in r["errors"], right) for kind in "sda"},
        }
    return report


def hint_quality(rows: list[dict]) -> dict:
    """Precision and recall of the rule that shows a word as possibly mispronounced."""
    eligible = [r for r in rows if r["content"] and r["phones"] >= HINT_MIN_PHONES]
    flagged = [r for r in eligible if r["accuracy"] < HINT_MAX_ACCURACY]
    hits = sum(bool(r["errors"]) for r in flagged)
    wrong = sum(bool(r["errors"]) for r in eligible)
    return {"eligible_words": len(eligible), "flagged": len(flagged),
            "precision": round(hits / len(flagged), 3) if flagged else None,
            "recall": round(hits / wrong, 3) if wrong else None,
            "base_rate": round(wrong / len(eligible), 3) if eligible else None}


def utterance_report(rows: list[dict]) -> dict:
    return {"utterances": len(rows),
            "spearman_phoneme_vs_human_error_rate": spearman([r["phoneme_accuracy"] for r in rows],
                                                             [r["error_rate"] for r in rows]),
            "spearman_whisper_vs_human_error_rate": spearman([r["mean_confidence"] for r in rows],
                                                             [r["error_rate"] for r in rows]),
            "spearman_live_phoneme_vs_human_error_rate": spearman([r["live_phoneme_accuracy"] for r in rows],
                                                                  [r["error_rate"] for r in rows]),
            "spearman_live_whisper_vs_human_error_rate": spearman([r["live_confidence"] for r in rows],
                                                                  [r["error_rate"] for r in rows]),
            "mean_live_phoneme_accuracy": round(float(np.mean([r["live_phoneme_accuracy"] for r in rows])), 3),
            "mean_live_confidence": round(float(np.mean([r["live_confidence"] for r in rows])), 3),
            "mean_phoneme_accuracy": round(float(np.mean([r["phoneme_accuracy"] for r in rows])), 3),
            "mean_human_error_rate": round(float(np.mean([r["error_rate"] for r in rows])), 3)}


def score_utterance(model: WhisperModel, wav: Path, text: str, speaker: str) -> tuple[list[dict], dict] | None:
    labelled = [w for w in annotated_words(text) if clean_word(w.word)]
    words = canonical_words([w.word for w in labelled])
    if not words or len(words) != len(labelled):
        return None
    samples = decode_to_mono_16k(wav.read_bytes())
    phonemes = recognize_phonemes(samples)
    results, insertions = compare_words(words, phonemes)
    segments, _ = model.transcribe(samples, language="en", beam_size=5, word_timestamps=True, temperature=0.0,
                                   condition_on_previous_text=False, initial_prompt=_VERBATIM_HINT)
    heard = [(clean_word(w.word), w.probability) for segment in segments for w in segment.words or []]
    confidences = word_confidences([w.word for w in words], heard)
    rows = [{"speaker": speaker, "utterance": wav.stem, "word": r.word, "accuracy": r.accuracy, "phones": r.phones,
             "content": r.is_content_word, "confidence": c, "errors": a.errors, "accent_only": a.accent_only}
            for r, c, a in zip(results, confidences, labelled) if r.phones]
    live_words = canonical_words([word for word, _ in heard])
    if not rows or not live_words:
        return None
    live_results, live_insertions = compare_words(live_words, phonemes)
    phones = sum(a.phones for a in labelled) or 1
    return rows, {"speaker": speaker, "utterance": wav.stem, "phoneme_accuracy": summarize(results, insertions).phoneme_accuracy,
                  "mean_confidence": float(np.mean(confidences)),
                  "live_phoneme_accuracy": summarize(live_results, live_insertions).phoneme_accuracy,
                  "live_confidence": float(np.mean([confidence for word, confidence in heard if word])),
                  "error_rate": sum(len(a.errors) for a in labelled) / phones}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--speakers", default=",".join(SPEAKERS))
    args = parser.parse_args()

    model = WhisperModel(BASELINE_MODEL, device="auto", compute_type="auto")
    words, utterances, skipped, started = [], [], 0, time.perf_counter()
    for speaker in args.speakers.split(","):
        for grid in sorted((args.data / speaker / "annotation").glob("*.TextGrid")):
            wav = args.data / speaker / "wav" / f"{grid.stem}.wav"
            scored = score_utterance(model, wav, grid.read_text(encoding="utf-8", errors="replace"), speaker)
            if scored is None:
                skipped += 1
                continue
            words.extend(scored[0])
            utterances.append(scored[1])
        print(speaker, "done", len(utterances), round(time.perf_counter() - started), "s", flush=True)

    report = {"skipped_utterances": skipped, "seconds": round(time.perf_counter() - started),
              "word_level": word_report(words), "hint_rule": hint_quality(words),
              "utterance_level": utterance_report(utterances),
              "by_speaker": {s: {"word": word_report([r for r in words if r["speaker"] == s]),
                                 "utterance": utterance_report([r for r in utterances if r["speaker"] == s])}
                             for s in args.speakers.split(",")}}
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    args.out.with_name(args.out.stem + "-rows.json").write_text(
        json.dumps({"words": words, "utterances": utterances}, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "by_speaker"}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
