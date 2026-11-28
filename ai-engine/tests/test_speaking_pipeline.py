"""Pipeline control flow with speech layers and the LLM stubbed: silence, band ownership, data sent to the LLM."""
import asyncio
from types import SimpleNamespace

import pytest

from schemas.llm_output import AgentCriterionOutput
from services.speaking import speaking_band_ceilings as ceilings
from services.speaking import speaking_grading_pipeline as pipeline
from services.speaking.answer_analysis import AnswerAnalysis
from services.speaking.audio_signal import AudioQuality
from services.speaking.phoneme_comparison import WordResult
from services.speaking.speaking_coverage_cap import UnansweredQuestion, measure_coverage
from services.speaking.speaking_criterion_evidence import CriterionWithEvidence
from services.speaking.speaking_length_cap import LengthLimits, measure_length
from services.speaking.speech_transcriber import TimedWord, Transcript
from services.speaking.acoustic_features import AcousticFeatures

QUALITY = AudioQuality(30.0, 25.0, -20.0, 0.0, 30.0, speech_span_seconds=30.0)
ACOUSTIC = AcousticFeatures(100, 3.0, 4.0, 0.25, 3, 1, 0.2, 0.6, 12.0, 5.0, 2.0, 45.0, 3.0)
INPUTS = [pipeline.SpeakingAnswerInput("r1", 1, "Do you like music?", "https://r2.test/a"),
          pipeline.SpeakingAnswerInput("r2", 2, "Describe a trip.", "https://r2.test/b")]


def _spoken(response_id, part):
    transcript = Transcript("um I like music", (TimedWord("um", 0, 0.2, 0.9), TimedWord("I", 0.3, 0.4, 0.9),
                                                TimedWord("like", 0.4, 0.6, 0.9), TimedWord("music", 0.6, 1.0, 0.9)))
    words = [WordResult("music", 5, 4, [], [], False, True) for _ in range(40)]
    return AnswerAnalysis(response_id, part, "q", False, QUALITY, transcript, ACOUSTIC, words, 0,
                          {"word_count": 40, "filler_count": 1, "repetition_count": 0, "self_correction_count": 0})


def _silent(response_id, part):
    return AnswerAnalysis(response_id, part, "q", True, AudioQuality(5.0, 0.0, -80.0, 0.0, 0.0))


@pytest.fixture
def stubs(monkeypatch):
    calls = {"criteria": {}, "overall": 0, "off_topic": []}

    async def fake_download(url):
        return b"audio"

    async def fake_evaluate(name, compiled):
        return AgentCriterionOutput(band=9.0 if name == "pr" else 6.0, summary=name)

    async def fake_evaluate_with_evidence(name, compiled):
        edits = [{"response": "R1", "original": "like", "corrected": "love", "category": "word_choice",
                  "explanation": "x"}] if name == "lr" else []
        spans = [{"response": "R2", "group": "topic_word", "text": "music"}] if name == "lr" else []
        off_topic = calls["off_topic"] if name == "fc" else []
        return CriterionWithEvidence(await fake_evaluate(name, compiled), edits, spans, off_topic)

    class Manager:
        def get_speaking_criterion_prompt(self, name, **variables):
            calls["criteria"][name] = variables
            return SimpleNamespace(langfuse_prompt=SimpleNamespace(version=2))

    async def fake_parts(title, answers):
        return {"part1": {"part_summary": "ok"}}

    async def fake_overall(title, criteria, overall_band=None):
        calls["overall"] += 1
        calls["overall_criteria"] = criteria
        calls["overall_band"] = overall_band
        return {"overall_summary": "ok"}

    monkeypatch.setattr(pipeline, "download_audio", fake_download)
    monkeypatch.setattr(pipeline, "evaluate_criterion", fake_evaluate)
    monkeypatch.setattr(pipeline, "evaluate_criterion_with_evidence", fake_evaluate_with_evidence)
    monkeypatch.setattr(pipeline, "get_prompt_manager", lambda: Manager())
    monkeypatch.setattr(pipeline, "generate_part_feedback", fake_parts)
    monkeypatch.setattr(pipeline, "generate_overall", fake_overall)
    monkeypatch.setattr(pipeline, "compute_lexical", lambda processed: {"ttr": 0.5})
    monkeypatch.setattr(pipeline, "preprocess", lambda essay: essay)
    # the stub answers are short; length ceilings have their own tests
    monkeypatch.setattr(ceilings, "measure_length", lambda spoken, words: LengthLimits(90.0, words, None, None))
    return calls


def _run(monkeypatch, analyses, unanswered=None):
    results = iter(analyses)
    monkeypatch.setattr(pipeline, "analyze_answer", lambda *args: next(results))
    return asyncio.run(pipeline.run_speaking_pipeline("Test", INPUTS, unanswered))


def test_all_silent_stops_before_any_llm_call(stubs, monkeypatch):
    result = _run(monkeypatch, [_silent("r1", 1), _silent("r2", 2)])
    assert result["no_speech"] is True
    assert stubs["criteria"] == {} and stubs["overall"] == 0


def test_llm_cannot_change_the_pronunciation_band(stubs, monkeypatch):
    result = _run(monkeypatch, [_spoken("r1", 1), _spoken("r2", 2)])
    assert result["criteria"]["pr"]["band"] == result["pronunciation"]["band"]
    assert result["criteria"]["pr"]["band"] != 9.0


def test_overall_report_receives_the_code_band(stubs, monkeypatch):
    result = _run(monkeypatch, [_spoken("r1", 1), _spoken("r2", 2)])
    assert stubs["overall_criteria"]["pr"]["band"] == result["pronunciation"]["band"]
    assert stubs["overall_band"] is not None


def test_one_silent_answer_is_kept_in_rows_but_not_graded(stubs, monkeypatch):
    result = _run(monkeypatch, [_spoken("r1", 1), _silent("r2", 2)])
    assert [r["silent"] for r in result["responses"]] == [False, True]
    assert "[Q2] P2 question: q\n[Q2] P2 answer: (no answer)" in stubs["criteria"]["fc"]["transcript"]
    assert "[R2" not in stubs["criteria"]["gra"]["transcript"]


def test_fluency_prompt_gets_acoustic_measures(stubs, monkeypatch):
    _run(monkeypatch, [_spoken("r1", 1), _spoken("r2", 2)])
    assert "articulation_rate" in stubs["criteria"]["fc"]["speech_metrics"]


def test_only_fluency_sees_the_questions(stubs, monkeypatch):
    _run(monkeypatch, [_spoken("r1", 1), _spoken("r2", 2)])
    assert "[Q1] P1 question: q\n[Q1] P1 answer: um I like music" in stubs["criteria"]["fc"]["transcript"]
    for name in ("lr", "gra", "pr"):
        assert "question:" not in stubs["criteria"][name]["transcript"]


def test_broken_recording_hides_phoneme_evidence_from_the_llm(stubs, monkeypatch):
    bad = _spoken("r1", 1)
    bad.word_results = [WordResult("music", 5, 1, [], ["m"], True, True) for _ in range(40)]
    result = _run(monkeypatch, [bad, _spoken("r2", 2)])
    if result["pronunciation"]["phoneme_usable"]:
        pytest.fail("two channels should disagree on this recording")
    assert result["pronunciation"]["words_possibly_mispronounced"] == []
    sent = stubs["criteria"]["pr"]["pronunciation_assessment"]
    assert "phoneme_accuracy" not in sent and "final_consonant_deletions" not in sent


def test_grammar_tools_do_not_see_fillers(stubs, monkeypatch):
    captured = {}
    monkeypatch.setattr(pipeline, "EssayInput", lambda title, essay: captured.update(essay=essay) or essay)
    _run(monkeypatch, [_spoken("r1", 1), _spoken("r2", 2)])
    assert "um" not in captured["essay"].split()


def test_prompts_receive_no_identifiers(stubs, monkeypatch):
    _run(monkeypatch, [_spoken("r1", 1), _spoken("r2", 2)])
    assert "r1" not in str(stubs["criteria"])


def test_quoted_errors_and_strengths_are_stored_per_response(stubs, monkeypatch):
    result = _run(monkeypatch, [_spoken("r1", 1), _spoken("r2", 2)])
    rows = {row["response_id"]: row for row in result["responses"]}
    edit = rows["r1"]["edits"][0]
    assert rows["r1"]["transcript"][edit["start"]:edit["end"]] == "like" and edit["criterion"] == "LR"
    assert rows["r2"]["edits"] == [] and rows["r2"]["strengths"][0]["text"] == "music"
    assert rows["r1"]["words"][0] == {"text": "um", "start": 0, "end": 0.2}
    assert result["feedback_anchoring"]["edits_kept"] == 1
    assert stubs["criteria"]["gra"]["transcript"].startswith("[R1 · Part 1] um I like music")


def test_answering_every_question_has_no_ceiling(stubs, monkeypatch):
    result = _run(monkeypatch, [_spoken("r1", 1), _spoken("r2", 2)])
    assert result["coverage"] == {"answered": 2, "total": 2, "max_band": None, "off_topic": 0,
                                  "note": None}
    assert result["criteria"]["fc"]["band"] == 6.0


def test_partly_answered_test_is_capped_on_every_criterion(stubs, monkeypatch):
    skipped = [UnansweredQuestion(1, f"Skipped {i}") for i in range(5)]
    result = _run(monkeypatch, [_spoken("r1", 1), _spoken("r2", 2)], skipped)     # 2/7
    assert result["coverage"]["max_band"] == 5.0 and "2/7" in result["coverage"]["note"]
    assert all(c["band"] <= 5.0 for c in result["criteria"].values())
    assert stubs["overall_criteria"]["fc"]["band"] == 5.0          # reports see the final band


def test_fluency_sees_skipped_questions_in_part_order(stubs, monkeypatch):
    _run(monkeypatch, [_spoken("r1", 1), _spoken("r2", 2)], [UnansweredQuestion(1, "Do you cook?")])
    transcript = stubs["criteria"]["fc"]["transcript"]
    assert "[Q2] P1 question: Do you cook?\n[Q2] P1 answer: (no answer)" in transcript
    assert transcript.index("Do you cook?") < transcript.index("P2 question")


def test_off_topic_answer_counts_as_unanswered(stubs, monkeypatch):
    stubs["off_topic"] = [2, 3]           # Q3 is the skipped question: already unanswered, not counted twice
    result = _run(monkeypatch, [_spoken("r1", 1), _spoken("r2", 2)], [UnansweredQuestion(3, "Why?")])
    assert result["coverage"]["answered"] == 1 and result["coverage"]["total"] == 3
    assert result["coverage"]["off_topic"] == 1 and result["coverage"]["max_band"] == 5.0
    assert "1 câu lạc đề" in result["coverage"]["note"]
    assert all(c["band"] <= 5.0 for c in result["criteria"].values())


def test_silent_upload_counts_as_unanswered(stubs, monkeypatch):
    result = _run(monkeypatch, [_spoken("r1", 1), _silent("r2", 2)])
    assert result["coverage"]["answered"] == 1 and result["coverage"]["total"] == 2


@pytest.mark.parametrize("answered, total, ceiling", [
    (7, 7, None), (6, 7, None), (5, 7, 6.0), (4, 7, 6.0), (3, 7, 5.0), (2, 7, 5.0), (1, 7, 4.0), (1, 1, None),
])
def test_coverage_ceilings(answered, total, ceiling):
    assert measure_coverage(answered, total).max_band == ceiling


def test_unintelligible_audio_caps_every_criterion_before_the_reports(stubs, monkeypatch):
    from services.speaking.speaking_intelligibility_cap import Intelligibility
    monkeypatch.setattr(ceilings, "measure_intelligibility", lambda comparison, quality: Intelligibility(0.46, 0.57, 4.0))
    result = _run(monkeypatch, [_spoken("r1", 1), _spoken("r2", 2)])
    assert all(c["band"] <= 4.0 for c in result["criteria"].values())
    assert stubs["overall_criteria"]["lr"]["band"] == 4.0
    assert result["intelligibility"]["max_band"] == 4.0 and "46%" in result["intelligibility"]["note"]


def test_short_test_caps_fluency_and_language_separately(stubs, monkeypatch):
    monkeypatch.setattr(ceilings, "measure_length", measure_length)     # real rule: 80 words, Part 2 clip 30 s
    result = _run(monkeypatch, [_spoken("r1", 1), _spoken("r2", 2)])
    bands = {name: c["band"] for name, c in result["criteria"].items()}
    assert bands["fc"] == 5.0 and bands["lr"] == 5.0 and bands["gra"] == 5.0
    assert bands["pr"] == result["pronunciation"]["band"]          # P has its own evidence rules
    assert "30 giây" in result["length"]["note"] and "80 từ" in result["length"]["note"]


def test_part_reports_run_beside_the_criteria(stubs, monkeypatch):
    order = []

    async def slow_parts(title, answers):
        order.append("parts start")
        await asyncio.sleep(0.05)
        order.append("parts end")
        return {}

    async def criterion(name, compiled):
        order.append(f"{name} start")
        await asyncio.sleep(0.01)
        return AgentCriterionOutput(band=6.0, summary=name)

    monkeypatch.setattr(pipeline, "generate_part_feedback", slow_parts)
    monkeypatch.setattr(pipeline, "evaluate_criterion", criterion)
    _run(monkeypatch, [_spoken("r1", 1), _spoken("r2", 2)])
    assert order.index("pr start") < order.index("parts end")


def test_failed_criterion_stops_the_part_reports(stubs, monkeypatch):
    finished = []

    async def slow_parts(title, answers):
        await asyncio.sleep(0.2)
        finished.append(True)

    async def broken(name, compiled):
        raise RuntimeError("LLM down")

    monkeypatch.setattr(pipeline, "generate_part_feedback", slow_parts)
    monkeypatch.setattr(pipeline, "evaluate_criterion", broken)
    results = iter([_spoken("r1", 1), _spoken("r2", 2)])
    monkeypatch.setattr(pipeline, "analyze_answer", lambda *args: next(results))

    async def scenario():
        with pytest.raises(RuntimeError):
            await pipeline.run_speaking_pipeline("Test", INPUTS)
        # keep the loop alive past the Part reports' finish time: asyncio.run would cancel leftovers anyway
        await asyncio.sleep(0.3)

    asyncio.run(scenario())
    assert finished == []
