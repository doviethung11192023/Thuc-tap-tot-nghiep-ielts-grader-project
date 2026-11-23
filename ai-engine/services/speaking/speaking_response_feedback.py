"""
Per-response feedback stored with the grading output (spec 007): word timings, anchored errors and
strengths, and possible mispronunciations.

Responses are referred to as R1, R2, ... in the transcript sent to GRA and LR, in the order of the
spoken answers, so a quoted error can be matched to the right transcript.
"""
from __future__ import annotations

import re

from services.speaking.answer_analysis import AnswerAnalysis
from services.speaking.speaking_feedback_anchoring import anchor_edits, anchor_strengths, word_spans
from services.speaking.speech_transcriber import clean_word

_HINT_MAX_ACCURACY = 0.6          # same rule as phoneme_comparison.likely_mispronounced
_HINT_MIN_PHONES = 3
_REF = re.compile(r"\bR\d+\b", re.IGNORECASE)


def response_ref(index: int) -> str:
    return f"R{index + 1}"


def labelled_transcript(spoken: list[AnswerAnalysis]) -> str:
    """One line per response; the label is how the model says which response an error is in."""
    return "\n".join(f"[{response_ref(i)} · Part {a.part}] {a.transcript.text}"
                     for i, a in enumerate(spoken) if a.transcript.text)


def pronunciation_hints(answer: AnswerAnalysis) -> list[dict]:
    """Words the phoneme channel heard poorly, with where they are in the text and in the recording.

    Phoneme results follow the transcript words whose cleaned form is not empty (canonical_words).
    """
    words = list(answer.transcript.words)
    spans = word_spans([w.text for w in words])
    spoken_indices = [i for i, w in enumerate(words) if clean_word(w.text)]
    hints = []
    for result, index in zip(answer.word_results, spoken_indices):
        if result.is_content_word and result.phones >= _HINT_MIN_PHONES and result.accuracy < _HINT_MAX_ACCURACY:
            word = words[index]
            hints.append({"word": word.text, "start": spans[index][0], "end": spans[index][1],
                          "start_sec": round(word.start, 2), "end_sec": round(word.end, 2),
                          "accuracy": round(result.accuracy, 2)})
    return hints


def _by_ref(items: list[dict]) -> dict[str, list[dict]]:
    """Group by response label; models sometimes copy the whole label ("R1 · Part 2"), so read the R number."""
    grouped: dict[str, list[dict]] = {}
    for item in items:
        match = _REF.search(str(item.get("response") or ""))
        grouped.setdefault(match.group().upper() if match else "", []).append(item)
    return grouped


def build_response_feedback(spoken: list[AnswerAnalysis], gra_edits: list[dict], lr_edits: list[dict],
                            strength_spans: list[dict], phoneme_usable: bool) -> tuple[dict[str, dict], dict]:
    """Feedback keyed by response id, plus counts of what the model sent and what was kept."""
    gra, lr, strengths = _by_ref(gra_edits), _by_ref(lr_edits), _by_ref(strength_spans)
    feedback: dict[str, dict] = {}
    counts = {"edits_received": 0, "edits_kept": 0, "edits_dropped": 0, "strengths_dropped": 0}
    for index, answer in enumerate(spoken):
        ref, text = response_ref(index), answer.transcript.text
        edits, received, dropped = anchor_edits(text, {"GRA": gra.pop(ref, []), "LR": lr.pop(ref, [])})
        kept_strengths, strengths_dropped = anchor_strengths(text, strengths.pop(ref, []), edits)
        feedback[answer.response_id] = {
            "words": [{"text": w.text, "start": round(w.start, 2), "end": round(w.end, 2)}
                      for w in answer.transcript.words],
            "edits": edits, "strengths": kept_strengths,
            "pronunciation_hints": pronunciation_hints(answer) if phoneme_usable else [],
        }
        counts["edits_received"] += received
        counts["edits_kept"] += len(edits)
        counts["edits_dropped"] += dropped
        counts["strengths_dropped"] += strengths_dropped
    unknown = sum(len(items) for group in (gra, lr) for items in group.values())   # wrong or missing R label
    counts["edits_received"] += unknown
    counts["edits_dropped"] += unknown
    counts["strengths_dropped"] += sum(len(items) for items in strengths.values())
    return feedback, counts
