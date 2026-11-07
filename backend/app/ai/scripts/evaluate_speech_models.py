"""
Bake-off for the speech channels, run on clips with known ground truth.

For each sentence group in speech_eval_manifest.json, a speaker records `<group>-clean` and
`<group>-error`. This script measures what model choice cannot be judged without:
  - grammar retention: does the ASR keep "he go", or correct it?
  - filler recall: are um / uh kept?
  - mispronunciation detection: does the phoneme channel separate wrong words from right ones,
    and does it beat the baseline of Whisper word confidence?

Usage:
    uv run python scripts/evaluate_speech_models.py --clips ../../../private/speech-eval/clips \
        --speakers sinh,long --out ../../../private/speech-eval/results.json
Clips are named <speaker>-<group>-<clean|error>.<wav|webm|m4a|mp3>.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from dataclasses import dataclass
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import numpy as np  # noqa: E402
from faster_whisper import WhisperModel  # noqa: E402

from services.speaking.audio_signal import SAMPLE_RATE, decode_to_mono_16k  # noqa: E402
from services.speaking.phoneme_comparison import compare_words  # noqa: E402
from services.speaking.phoneme_recognizer import canonical_words, recognize_phonemes  # noqa: E402
from services.speaking.speech_transcriber import _VERBATIM_HINT, clean_word  # noqa: E402

MANIFEST = Path(__file__).with_name("speech_eval_manifest.json")
FILLERS = {"um", "umm", "uh", "uhh", "er", "erm", "hmm", "ah"}
BASELINE_MODEL = "medium.en"   # the gate: the phoneme channel must beat this model's word confidence
ASR_CANDIDATES = {
    "whisper-medium.en": {"model": "medium.en", "beam_size": 5},
    "whisper-medium.en-greedy": {"model": "medium.en", "beam_size": 1},
    "whisper-large-v3": {"model": "large-v3", "beam_size": 5},
    "crisper-whisper": {"model": "nyralabs/faster_CrisperWhisper", "beam_size": 5},
}


@dataclass
class Clip:
    path: Path
    speaker: str
    group: dict
    kind: str                # clean | error


def word_list(text: str) -> list[str]:
    return [w for w in (clean_word(token) for token in text.split()) if w]


def word_error_rate(reference: list[str], hypothesis: list[str]) -> float:
    """Levenshtein distance over words, divided by the reference length."""
    previous = list(range(len(hypothesis) + 1))
    for i, ref in enumerate(reference, 1):
        current = [i]
        for j, hyp in enumerate(hypothesis, 1):
            current.append(min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (ref != hyp)))
        previous = current
    return previous[-1] / len(reference) if reference else 0.0


def rank_auc(positives: list[float], negatives: list[float]) -> float | None:
    """Chance that a mispronounced word scores lower than a correct one. 0.5 is a coin flip."""
    if not positives or not negatives:
        return None
    wins = sum((p < n) + 0.5 * (p == n) for p in positives for n in negatives)
    return wins / (len(positives) * len(negatives))


def word_confidences(intended: list[str], heard: list[tuple[str, float]]) -> list[float]:
    """Whisper's confidence for each intended word, matched in order. A word it never heard scores 0."""
    scores, cursor = [], 0
    for word in intended:
        match = next((i for i in range(cursor, len(heard)) if heard[i][0] == word), None)
        scores.append(0.0 if match is None else heard[match][1])
        cursor = cursor if match is None else match + 1
    return scores


def find_clips(folder: Path, groups: dict[str, dict], speakers: list[str]) -> list[Clip]:
    clips = []
    for path in sorted(folder.iterdir()):
        parts = path.stem.split("-")
        if len(parts) == 3 and parts[1] in groups and parts[2] in ("clean", "error"):
            if not speakers or parts[0] in speakers:
                clips.append(Clip(path, parts[0], groups[parts[1]], parts[2]))
    return clips


def evaluate_asr(name: str, config: dict, clips: list[Clip]) -> dict:
    try:
        model = WhisperModel(config["model"], device="auto", compute_type="auto")
    except Exception as err:
        return {"candidate": name, "skipped": str(err)[:200]}
    wers, retained, expected, filler_hits, filler_total, audio_seconds, spent = [], 0, 0, 0, 0, 0.0, 0.0
    outputs = []
    for clip in clips:
        samples = decode_to_mono_16k(clip.path.read_bytes())
        started = time.perf_counter()
        segments, _ = model.transcribe(samples, language="en", beam_size=config["beam_size"], word_timestamps=True,
                                       condition_on_previous_text=False, initial_prompt=_VERBATIM_HINT, temperature=0.0)
        text = " ".join(word.word.strip() for segment in segments for word in segment.words or [])
        spent += time.perf_counter() - started
        audio_seconds += samples.size / SAMPLE_RATE
        heard = word_list(text)
        outputs.append({"clip": clip.path.name, "text": text})
        wers.append(word_error_rate(word_list(clip.group["intended"]), heard))
        joined = " ".join(heard)
        for phrase in clip.group.get("grammar_errors", []):
            expected += 1
            retained += " ".join(word_list(phrase)) in joined
        if clip.group.get("fillers"):
            filler_total += clip.group["fillers"]
            filler_hits += sum(1 for word in heard if word in FILLERS)
    return {
        "candidate": name,
        "mean_wer": round(float(np.mean(wers)), 3) if wers else None,
        "grammar_retention": round(retained / expected, 3) if expected else None,
        "filler_recall": round(min(1.0, filler_hits / filler_total), 3) if filler_total else None,
        "seconds_per_audio_second": round(spent / audio_seconds, 3) if audio_seconds else None,
        "outputs": outputs,
    }


def evaluate_phonemes(clips: list[Clip]) -> dict:
    """Scores words against the intended text, so ASR mistakes cannot leak into this measure."""
    wrong: list[float] = []
    right: list[float] = []
    baseline_wrong: list[float] = []
    baseline_right: list[float] = []
    per_group: dict[str, dict[str, list[float]]] = {}
    baseline_model = WhisperModel(BASELINE_MODEL, device="auto", compute_type="auto")
    for clip in clips:
        if not clip.group.get("mispronounced"):
            continue
        samples = decode_to_mono_16k(clip.path.read_bytes())
        words = canonical_words(clip.group["intended"].split())
        results, _ = compare_words(words, recognize_phonemes(samples))
        targets = set(clip.group["mispronounced"])
        bucket = per_group.setdefault(clip.group["focus"], {"wrong": [], "right": []})
        for result in results:
            if not result.phones or result.word not in targets:
                continue
            (wrong if clip.kind == "error" else right).append(result.accuracy)
            bucket["wrong" if clip.kind == "error" else "right"].append(result.accuracy)
        segments, _ = baseline_model.transcribe(samples, language="en", beam_size=5, word_timestamps=True,
                                                condition_on_previous_text=False, initial_prompt=_VERBATIM_HINT,
                                                temperature=0.0)
        heard = [(clean_word(word.word), word.probability) for segment in segments for word in segment.words or []]
        intended = word_list(clip.group["intended"])
        for word, confidence in zip(intended, word_confidences(intended, heard)):
            if word in targets:
                (baseline_wrong if clip.kind == "error" else baseline_right).append(confidence)
    return {
        "auc": rank_auc(wrong, right),
        "baseline_whisper_auc": rank_auc(baseline_wrong, baseline_right),
        "mean_accuracy_clean": round(float(np.mean(right)), 3) if right else None,
        "mean_accuracy_error": round(float(np.mean(wrong)), 3) if wrong else None,
        "by_focus": {focus: {"auc": rank_auc(b["wrong"], b["right"])} for focus, b in per_group.items()},
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--clips", type=Path, required=True)
    parser.add_argument("--speakers", default="")
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--asr", default=",".join(ASR_CANDIDATES))
    args = parser.parse_args()

    groups = {group["group"]: group for group in json.loads(MANIFEST.read_text(encoding="utf-8"))}
    clips = find_clips(args.clips, groups, [s for s in args.speakers.split(",") if s])
    if not clips:
        raise SystemExit(f"No clips named <speaker>-<group>-<clean|error> in {args.clips}")
    report = {
        "clip_count": len(clips),
        "asr": [evaluate_asr(name, ASR_CANDIDATES[name], clips) for name in args.asr.split(",")],
        "phonemes": evaluate_phonemes(clips),
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "asr"}, ensure_ascii=False, indent=2))
    for row in report["asr"]:
        print({k: v for k, v in row.items() if k != "outputs"})


if __name__ == "__main__":
    main()
