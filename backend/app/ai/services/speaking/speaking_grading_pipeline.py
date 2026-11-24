"""
Speaking grading: speech layers first, LLM last.

FC, LR and GRA are judged by the LLM from evidence. P is decided in code from speech measures,
and the LLM only explains it. All-silent tests stop before any LLM call (UC-10).
Only speech content reaches the LLM, never names or account ids.
"""
from __future__ import annotations

import asyncio
import json
import logging
import time
from dataclasses import dataclass

from handlers.grammar_checker import check as check_grammar
from handlers.lexical_stats import compute as compute_lexical
from schemas.llm_output import AgentCriterionOutput
from schemas.input import EssayInput
from services.llm_evaluator import evaluate_criterion
from services.prompt_builder import get_prompt_manager
from services.speaking.answer_analysis import (
    AnswerAnalysis, analyze_answer, combine_comparison, combine_metrics, combine_quality, mean_word_confidence,
)
from services.speaking.audio_signal import download_audio
from services.speaking.phoneme_comparison import likely_mispronounced
from services.speaking.pronunciation_rubric import assess_pronunciation
from services.speaking.speaking_band_ceilings import apply_ceilings
from services.speaking.speaking_coverage_cap import UnansweredQuestion
from services.speaking.speaking_criterion_evidence import evaluate_criterion_with_evidence
from services.speaking.speaking_response_feedback import build_response_feedback, labelled_transcript
from services.speaking.speaking_feedback import PartAnswer, generate_overall, generate_part_feedback
from settings.config import get_settings
from utils.preprocessor import preprocess

logger = logging.getLogger(__name__)

_speech_slot = asyncio.Semaphore(1)     # one test at a time on the GPU
_FILLER_WORDS = ("um", "umm", "uh", "uhh", "er", "erm", "hmm")
_PHONEME_EVIDENCE = ("phoneme_accuracy", "clear_word_ratio", "final_consonant_deletions", "th_substitutions")


@dataclass(frozen=True)
class SpeakingAnswerInput:
    response_id: str
    part: int
    question: str
    audio_url: str
    duration_ms: int | None = None


_NO_ANSWER = "(no answer)"


def _question_and_answer_transcript(answers: list[AnswerAnalysis],
                                    unanswered: list[UnansweredQuestion]) -> tuple[str, set[int]]:
    """Coherence includes answering what was asked, so FC needs each question beside its answer.

    Skipped and silent questions stay in, marked as unanswered, so FC sees how much of the test is
    missing (BR-23). Each pair is numbered [Qn] so FC can name off-topic answers. Returns the text and
    the numbers that carry a spoken answer. LR and GRA keep the plain transcript: a question is not
    the learner's language.
    """
    rows = [(a.part, a.question, a.transcript.text if not a.silent and a.transcript.text else _NO_ANSWER)
            for a in answers]
    rows += [(q.part, q.question, _NO_ANSWER) for q in unanswered]
    rows.sort(key=lambda row: row[0])       # stable: keeps the question order inside each part
    text = "\n".join(f"[Q{n}] P{part} question: {question}\n[Q{n}] P{part} answer: {answer}"
                     for n, (part, question, answer) in enumerate(rows, 1))
    return text, {n for n, row in enumerate(rows, 1) if row[2] != _NO_ANSWER}


def _text_without_fillers(answers: list[AnswerAnalysis]) -> str:
    """Grammar and lexical tools read language; fillers are fluency evidence and already counted."""
    sentences = []
    for answer in answers:
        words = [w.text for w in answer.transcript.words if w.text.strip(" ,.?!").lower() not in _FILLER_WORDS]
        if words:
            sentences.append(" ".join(words).strip(" ,") + ".")
    return " ".join(sentences)


def _evidence_for_llm(evidence: dict) -> dict:
    """On a recording the channels disagree about, phoneme numbers describe the recording, not the learner."""
    if evidence["phoneme_usable"]:
        return evidence
    return {name: value for name, value in evidence.items() if name not in _PHONEME_EVIDENCE}


def _response_rows(answers: list[AnswerAnalysis], feedback: dict[str, dict] | None = None) -> list[dict]:
    """Stored per response; `feedback` adds word timings, errors, strengths and hints (spec 007)."""
    return [{"response_id": a.response_id, "transcript": a.transcript.text, "silent": a.silent,
             "metrics": a.metrics, **(feedback or {}).get(a.response_id, {})} for a in answers]


async def _analyze_all(inputs: list[SpeakingAnswerInput]) -> list[AnswerAnalysis]:
    audio = await asyncio.gather(*(download_audio(item.audio_url) for item in inputs))
    async with _speech_slot:
        return [await asyncio.to_thread(analyze_answer, item.response_id, item.part, item.question, data)
                for item, data in zip(inputs, audio)]


async def _criterion(name: str, title: str, transcript: str, word_count: int, **evidence) -> tuple:
    compiled = await asyncio.to_thread(
        get_prompt_manager().get_speaking_criterion_prompt, name, test_title=title,
        transcript=transcript, word_count=word_count, **evidence)
    output: AgentCriterionOutput = await evaluate_criterion(name, compiled)
    return output, compiled.langfuse_prompt.version


async def _criterion_with_evidence(name: str, title: str, transcript: str, word_count: int, **evidence) -> tuple:
    """GRA and LR: the band plus the errors and strengths the same call quoted (spec 007)."""
    compiled = await asyncio.to_thread(
        get_prompt_manager().get_speaking_criterion_prompt, name, test_title=title,
        transcript=transcript, word_count=word_count, **evidence)
    result = await evaluate_criterion_with_evidence(name, compiled)
    return result, compiled.langfuse_prompt.version


def _criterion_payload(output: AgentCriterionOutput) -> dict:
    return {"band": output.band, "summary": output.summary, "strengths": output.strengths,
            "issues": output.issues, "improvements": output.improvements}


def _ielts_round(value: float) -> float:
    whole = int(value)
    rem = value - whole
    if rem < 0.25:
        return float(whole)
    if rem < 0.75:
        return float(whole) + 0.5
    return float(whole) + 1.0


async def run_speaking_pipeline(title: str, inputs: list[SpeakingAnswerInput],
                                unanswered: list[UnansweredQuestion] | None = None) -> dict:
    """`unanswered`: questions of the test with no recording, for the coverage ceiling (BR-23)."""
    unanswered = unanswered or []
    started = time.perf_counter()
    answers = await _analyze_all(inputs)
    speech_seconds = time.perf_counter() - started
    if all(a.silent for a in answers):
        return {"no_speech": True, "responses": _response_rows(answers), "speech_seconds": round(speech_seconds, 1)}

    spoken = [a for a in answers if not a.silent]
    transcript = labelled_transcript(spoken)
    metrics = combine_metrics(spoken)
    word_count = int(metrics.get("word_count", 0))
    comparison = combine_comparison(spoken)
    assessment = assess_pronunciation(comparison, combine_quality(spoken),
                                      mean_word_confidence([a.transcript for a in spoken]),
                                      metrics.get("pitch_range_semitones", 0.0), metrics.get("rhythm_npvi", 0.0))
    weak_words = likely_mispronounced([word for a in spoken for word in a.word_results]) \
        if assessment.phoneme_usable else []

    plain_text = _text_without_fillers(spoken)
    processed = await asyncio.to_thread(preprocess, EssayInput(title=title, essay=plain_text))
    grammar, lexical = await asyncio.gather(asyncio.to_thread(check_grammar, processed),
                                            asyncio.to_thread(compute_lexical, processed))
    pronunciation_evidence = {**assessment.as_dict(), "words_possibly_mispronounced": weak_words}
    # Part reports read only the answers, so they run beside the criteria instead of after them
    parts_task = asyncio.create_task(generate_part_feedback(title, [
        PartAnswer(a.part, a.question, a.transcript.text, a.quality.speech_seconds) for a in spoken]))

    try:
        qa_transcript, spoken_numbers = _question_and_answer_transcript(answers, unanswered)
        (fc_full, fc_v), (lr_full, lr_v), (gra_full, gra_v), (pr, pr_v) = await asyncio.gather(
            _criterion_with_evidence("fc", title, qa_transcript, word_count, speech_metrics=json.dumps(metrics)),
            _criterion_with_evidence("lr", title, transcript, word_count, lexical_stats=str(lexical)),
            _criterion_with_evidence("gra", title, transcript, word_count, grammar=str(grammar)),
            _criterion("pr", title, transcript, word_count,
                       pronunciation_assessment=json.dumps(_evidence_for_llm(pronunciation_evidence),
                                                           ensure_ascii=False),
                       pronunciation_band=assessment.band),
        )
        pr.band = assessment.band           # code owns this band, whatever the LLM returned
        fc, lr, gra = fc_full.output, lr_full.output, gra_full.output
        off_topic = len(spoken_numbers & set(fc_full.off_topic_answers))   # an off-topic answer counts as unanswered
        # before the reports, so their text matches the final bands
        ceilings = apply_ceilings({"fc": fc, "lr": lr, "gra": gra, "pr": pr}, spoken, len(answers) + len(unanswered),
                                  off_topic, comparison, word_count)
        feedback, anchoring = build_response_feedback(
            spoken, gra_full.edits, lr_full.edits, lr_full.strength_spans + gra_full.strength_spans,
            assessment.phoneme_usable)

        criteria = {name: _criterion_payload(output)
                    for name, output in (("fc", fc), ("lr", lr), ("gra", gra), ("pr", pr))}
        overall_band = _ielts_round(sum(float(v["band"]) for v in criteria.values()) / 4.0)
        overall = await generate_overall(title, criteria, overall_band=overall_band)
        parts = await parts_task
    finally:
        parts_task.cancel()     # no-op once awaited; on any failure the run is lost, so stop the Part reports too

    return {
        "no_speech": False,
        "responses": _response_rows(answers, feedback),
        "feedback_anchoring": anchoring,
        "criteria": criteria,
        "pronunciation": pronunciation_evidence,
        "coverage": ceilings.coverage.as_dict(),
        "intelligibility": ceilings.intelligibility.as_dict(),
        "length": ceilings.length.as_dict(),
        "speech_metrics": metrics,
        "parts": parts,
        "overall": overall,
        "model": get_settings().default_llm_model,
        "stt_model": get_settings().speech_stt_model,
        "phoneme_model": get_settings().speech_phoneme_model,
        "prompt_versions": {"fc": fc_v, "lr": lr_v, "gra": gra_v, "pr": pr_v},
        "speech_seconds": round(speech_seconds, 1),
        "total_seconds": round(time.perf_counter() - started, 1),
    }

