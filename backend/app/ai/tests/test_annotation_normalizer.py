from utils.annotation_normalizer import (
    apply_corrections, drop_unsupported_numbers, locate_and_dedupe, normalize_annotation,
)

ESSAY = "Many people thinks that cars is useful. However, public transport are better."


def test_normalize_maps_invalid_enums_and_fills_title():
    anno = normalize_annotation({"type": "Grammar", "category": "TA", "original_text": "x", "title": ""})
    assert anno["type"] == "error"
    assert anno["category"] == "TR"
    assert anno["title"] == "Language error"


def test_normalize_unknown_category_falls_back_by_type():
    anno = normalize_annotation({"type": "upgrade", "category": "OVERALL", "original_text": "x"})
    assert anno["category"] == "LR"


def test_normalize_rejects_missing_original_text():
    assert normalize_annotation({"type": "error"}) is None
    assert normalize_annotation("not a dict") is None


def test_locate_and_dedupe_keeps_higher_priority_on_overlap():
    raw = [
        {"type": "upgrade", "category": "LR", "original_text": "Many people thinks that", "corrected_text": "Many argue that"},
        {"type": "error", "category": "GRA", "original_text": "people thinks", "corrected_text": "people think"},
        {"type": "strength", "category": "CC", "original_text": "However,"},
        {"type": "error", "category": "GRA", "original_text": "not in essay at all"},
    ]
    result = locate_and_dedupe(raw, ESSAY)
    texts = [a["original_text"] for a in result]
    assert texts == ["people thinks", "However,"]
    first = result[0]
    assert ESSAY[first["position_start"]:first["position_end"]] == "people thinks"
    assert all(a["id"] for a in result)


def test_apply_corrections_skips_strengths():
    annos = locate_and_dedupe([
        {"type": "error", "category": "GRA", "original_text": "cars is", "corrected_text": "cars are"},
        {"type": "strength", "category": "CC", "original_text": "However,", "corrected_text": "SHOULD NOT APPLY"},
    ], ESSAY)
    revised = apply_corrections(ESSAY, annos)
    assert "cars are useful" in revised
    assert "SHOULD NOT APPLY" not in revised


def test_fuzzy_match_is_snapped_to_whole_words():
    essay = "Moreover, producing millions of fridges and TVs consume a lot of energy and natural resources."
    result = locate_and_dedupe([{
        "type": "upgrade", "category": "LR",
        "original_text": "produce millions of fridges and TVs consume a lot of energy",
    }], essay)
    assert len(result) == 1
    anno = result[0]
    assert essay[anno["position_start"]:anno["position_end"]] == anno["original_text"]
    assert anno["original_text"].endswith("energy")
    assert anno["original_text"].startswith("producing")


def test_normalize_rejects_whole_report_spans():
    whole = "The chart shows data.\n\nOverall, cars were popular."
    assert normalize_annotation({"type": "error", "original_text": whole}) is None
    long_sentence = " ".join(["word"] * 61)
    assert normalize_annotation({"type": "error", "original_text": long_sentence}) is None


def test_bracketed_note_is_not_spliced_into_essay():
    anno = normalize_annotation({
        "type": "error", "original_text": "Bicycle use show",
        "corrected_text": "[Needs expansion to 150 words]",
    })
    assert anno["corrected_text"] == ""


def _anno(original, corrected):
    return {"type": "error", "original_text": original, "corrected_text": corrected}


def test_invented_number_is_not_spliced():
    annos = [_anno("decreased from 30% to 18%", "decreased from 30% to 18%, despite a recovery to 25% in 2015")]
    drop_unsupported_numbers(annos, "Data points:\n- Bus: 30% (2000), 18% (2020)")
    assert annos[0]["corrected_text"] == ""


def test_numbers_from_chart_or_original_are_allowed():
    annos = [
        _anno("rose to 55%", "peaked at 55% in 2010"),          # 2010 is in the chart data
        _anno("Bicycle use show", "Bicycle use showed"),          # no numbers at all
        _anno("about 1,200 people", "roughly 1200 people"),       # same number, other format
    ]
    drop_unsupported_numbers(annos, "Car: 45% (2000), 55% (2010), 48% (2020)")
    assert [a["corrected_text"] for a in annos] == ["peaked at 55% in 2010", "Bicycle use showed", "roughly 1200 people"]


def test_overlapping_annotation_is_merged_not_lost():
    essay = "In the centre, there is six offices and a canteen."
    raw = [
        {"type": "error", "category": "TR", "title": "Data", "original_text": essay, "corrected_text": "x", "explanation": "Wrong count."},
        {"type": "error", "category": "GRA", "title": "Agreement", "original_text": "there is six offices", "corrected_text": "there are six offices", "explanation": "Use 'are'."},
    ]
    kept = locate_and_dedupe(raw, essay)
    assert len(kept) == 1
    assert "Also (GRA) Agreement: Use 'are'." in kept[0]["explanation"]


def test_number_words_count_as_numbers():
    annos = [_anno("there are six offices", "there are eight offices")]
    drop_unsupported_numbers(annos, "Offices: 6")
    assert annos[0]["corrected_text"] == ""
