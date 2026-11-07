"""Pipeline control flow with speech layers and the LLM stubbed: silence, band ownership, data sent to the LLM."""
import asyncio
from types import SimpleNamespace

import pytest

from schemas.llm_output import AgentCriterionOutput
from services.speaking import speaking_grading_pipeline as pipeline
from services.speaking.answer_analysis import AnswerAnalysis
from services.speaking.audio_signal import AudioQuality
from services.speaking.phoneme_comparison import WordResult
from services.speaking.speech_transcriber import TimedWord, Transcript
from services.speaking.acoustic_features import AcousticFeatures

QUALITY = AudioQuality(30.0, 25.0, -20.0, 0.0, 30.0)
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
    calls = {"criteria": {}, "overall": 0}

    async def fake_download(url):
        return b"audio"

    async def fake_evaluate(name, compiled):
        return AgentCriterionOutput(band=9.0 if name == "pr" else 6.0, summary=name)

    class Manager:
        def get_speaking_criterion_prompt(self, name, **variables):
            calls["criteria"][name] = variables
            return SimpleNamespace(langfuse_prompt=SimpleNamespace(version=2))

    async def fake_parts(title, answers):
        return {"part1": {"part_summary": "ok"}}

    async def fake_overall(title, criteria):
        calls["overall"] += 1
        calls["overall_criteria"] = criteria
        return {"overall_summary": "ok"}

    monkeypatch.setattr(pipeline, "download_audio", fake_download)
    monkeypatch.setattr(pipeline, "evaluate_criterion", fake_evaluate)
    monkeypatch.setattr(pipeline, "get_prompt_manager", lambda: Manager())
    monkeypatch.setattr(pipeline, "generate_part_feedback", fake_parts)
    monkeypatch.setattr(pipeline, "generate_overall", fake_overall)
    monkeypatch.setattr(pipeline, "check_grammar", lambda processed: [])
    monkeypatch.setattr(pipeline, "compute_lexical", lambda processed: {"ttr": 0.5})
    monkeypatch.setattr(pipeline, "preprocess", lambda essay: essay)
    return calls


def _run(monkeypatch, analyses):
    results = iter(analyses)
    monkeypatch.setattr(pipeline, "analyze_answer", lambda *args: next(results))
    return asyncio.run(pipeline.run_speaking_pipeline("Test", INPUTS))


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


def test_one_silent_answer_is_kept_in_rows_but_not_graded(stubs, monkeypatch):
    result = _run(monkeypatch, [_spoken("r1", 1), _silent("r2", 2)])
    assert [r["silent"] for r in result["responses"]] == [False, True]
    assert "P2:" not in stubs["criteria"]["fc"]["transcript"]


def test_fluency_prompt_gets_acoustic_measures(stubs, monkeypatch):
    _run(monkeypatch, [_spoken("r1", 1), _spoken("r2", 2)])
    assert "articulation_rate" in stubs["criteria"]["fc"]["speech_metrics"]


def test_only_fluency_sees_the_questions(stubs, monkeypatch):
    _run(monkeypatch, [_spoken("r1", 1), _spoken("r2", 2)])
    assert "P1 question: q\nP1 answer: um I like music" in stubs["criteria"]["fc"]["transcript"]
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
