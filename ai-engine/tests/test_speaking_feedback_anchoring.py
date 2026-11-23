"""Anchoring of quoted errors/strengths and pronunciation hints (spec 007, FR-002, FR-005, FR-007)."""
from services.speaking.answer_analysis import AnswerAnalysis
from services.speaking.audio_signal import AudioQuality
from services.speaking.phoneme_comparison import WordResult
from services.speaking.speaking_feedback_anchoring import (
    MAX_EDITS_PER_RESPONSE, anchor_edits, anchor_strengths, word_spans,
)
from services.speaking.speaking_response_feedback import build_response_feedback, labelled_transcript
from services.speaking.speech_transcriber import TimedWord, Transcript

TEXT = "So, three years ago, I advised my younger brother. He seriously prepare for it and he was please."


def _edit(original, corrected, before="", category="verb_tense", response="R1"):
    return {"response": response, "original": original, "corrected": corrected, "before": before,
            "category": category, "explanation": "x"}


def test_replace_is_anchored_on_quoted_words():
    edits, received, dropped = anchor_edits(TEXT, {"GRA": [_edit("prepare", "prepared")]})
    assert (received, dropped) == (1, 0)
    e = edits[0]
    assert TEXT[e["start"]:e["end"]] == "prepare" and e["kind"] == "replace" and e["criterion"] == "GRA"


def test_quote_not_in_transcript_is_dropped():
    edits, received, dropped = anchor_edits(TEXT, {"GRA": [_edit("prepared", "prepare")]})
    assert edits == [] and (received, dropped) == (1, 1)


def test_matching_ignores_case_and_punctuation_and_punctuation_only_fixes_are_dropped():
    edits, _, dropped = anchor_edits(TEXT, {"GRA": [_edit("THREE years ago I advised", "three years ago, I had advised"),
                                                    _edit("my younger brother", "my younger brother,")]})
    assert [(e["kind"], e["corrected"]) for e in edits] == [("missing", "had")] and dropped == 1
    assert edits[0]["start"] == TEXT.index("I advised") + 1


def test_quoted_sentence_is_split_into_minimal_edits():
    text = "Since he was working on a great company with high salary"
    edits, received, dropped = anchor_edits(text, {"GRA": [_edit(
        "Since he was working on a great company with high salary",
        "Since he was working at a great company with a high salary", category="preposition")]})
    assert [(e["kind"], e["original"], e["corrected"]) for e in edits] == [
        ("replace", "on", "at"), ("missing", "", "a")]
    assert edits[1]["start"] == text.index(" high") and (received, dropped) == (1, 0)


def test_no_change_quote_is_dropped():
    assert anchor_edits(TEXT, {"GRA": [_edit("my younger brother", "my younger brother")]})[0] == []


def test_missing_word_sits_after_before_words():
    edits, _, _ = anchor_edits(TEXT, {"GRA": [_edit("", "had", before="ago, I", category="verb_tense")]})
    e = edits[0]
    assert e["kind"] == "missing" and e["start"] == e["end"] == TEXT.index("I advised") + 1


def test_unnecessary_word_kind():
    edits, _, _ = anchor_edits(TEXT, {"GRA": [_edit("So", "", category="conjunction")]})
    assert edits[0]["kind"] == "unnecessary"


def test_overlap_keeps_earlier_and_unknown_category_becomes_other():
    edits, received, dropped = anchor_edits(TEXT, {
        "GRA": [_edit("seriously prepare", "seriously prepared")],
        "LR": [_edit("prepare", "get ready", category="nonsense")],
    })
    assert received == 2 and dropped == 1 and len(edits) == 1
    assert anchor_edits(TEXT, {"LR": [_edit("please", "pleased", category="nonsense")]})[0][0]["category"] == "other"


def test_repeated_word_uses_reading_order():
    text = "he go there and he go home"
    edits, _, _ = anchor_edits(text, {"GRA": [_edit("go", "went"), _edit("go", "went")]})
    assert [e["start"] for e in edits] == [3, 19]


def test_cap_per_response():
    text = " ".join(f"w{i}" for i in range(40))
    raws = [_edit(f"w{i}", f"x{i}", category="other") for i in range(40)]
    edits, received, dropped = anchor_edits(text, {"GRA": raws})
    assert len(edits) == MAX_EDITS_PER_RESPONSE and dropped == 40 - MAX_EDITS_PER_RESPONSE


def test_strength_inside_error_is_removed():
    edits, _, _ = anchor_edits(TEXT, {"LR": [_edit("please", "pleased", category="word_form")]})
    strengths, dropped = anchor_strengths(TEXT, [
        {"group": "collocation", "text": "he was please"},
        {"group": "collocation", "text": "younger brother"},
        {"group": "bogus", "text": "three years"},
    ], edits)
    assert [s["text"] for s in strengths] == ["younger brother"] and dropped == 2


def test_word_spans_follow_join():
    words = ["So,", "three", "years"]
    text = " ".join(words)
    assert [text[a:b] for a, b in word_spans(words)] == words


def _answer(rid, words, results):
    timed = tuple(TimedWord(w, i * 0.5, i * 0.5 + 0.4, 0.9) for i, w in enumerate(words))
    quality = AudioQuality(1.0, 1.0, -20.0, 0.0, 30.0)
    return AnswerAnalysis(rid, 2, "q", False, quality, Transcript(" ".join(words), timed), None, results)


def test_hints_map_to_word_timings_and_wrong_labels_are_dropped():
    words = ["I", "studied", "—", "graduation"]   # the dash has no letters, so phoneme results skip it
    results = [WordResult("i", 1, 1, [], [], False, False), WordResult("studied", 6, 6, [], [], False, True),
               WordResult("graduation", 8, 2, [], [], False, True)]
    answer = _answer("r1", words, results)
    feedback, counts = build_response_feedback(
        [answer], [_edit("studied", "study", response="R1"), _edit("I", "We", response="R9")], [], [], True)
    hint = feedback["r1"]["pronunciation_hints"][0]
    assert hint["word"] == "graduation" and hint["start_sec"] == 1.5 and answer.transcript.text[hint["start"]:hint["end"]] == "graduation"
    assert counts["edits_kept"] == 1 and counts["edits_dropped"] == 1
    assert build_response_feedback([answer], [], [], [], False)[0]["r1"]["pronunciation_hints"] == []
    assert labelled_transcript([answer]).startswith("[R1 · Part 2] I studied")


def test_long_rewrite_is_not_an_error_mark():
    text = "and every day after until the exam he prepared"
    edits, _, dropped = anchor_edits(text, {"LR": [_edit(
        "every day after until", "from then onwards he studied very hard until", category="collocation")]})
    assert edits == [] and dropped == 1
