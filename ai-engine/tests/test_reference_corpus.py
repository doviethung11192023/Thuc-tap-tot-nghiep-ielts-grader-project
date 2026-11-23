"""Band-ladder selection and corpus loading."""
import json

import pytest

from services import reference_corpus as corpus
from services.reference_corpus import Reference, ReferenceCorpusError, select_ladder
from utils.reference_corpus_cleaning import reference_id


def ref(index, band, essay_type="Opinion", prompt=None):
    return Reference(f"r{index}", prompt or f"prompt {index}", f"essay {index}", band, essay_type)


FULL = tuple(ref(i * 10 + b, float(b)) for i in range(4) for b in (5, 6, 7, 8))


def test_one_reference_per_band_level():
    ladder = select_ladder("Opinion", "my essay", FULL)
    assert sorted(r.band for r in ladder.references) == [5.0, 6.0, 7.0, 8.0]
    assert ladder.gaps == ()


def test_same_submission_gets_the_same_ladder_and_spacing_does_not_matter():
    assert select_ladder("Opinion", "my  essay\n", FULL) == select_ladder("Opinion", "my essay", FULL)


def test_different_submissions_vary_the_essays_and_the_order():
    ladders = [select_ladder("Opinion", f"essay {i}", FULL) for i in range(40)]
    assert len({tuple(r.id for r in l.references) for l in ladders}) > 10
    assert len({l.references[-1].band for l in ladders}) == 4


def test_popular_prompt_does_not_dominate():
    popular = tuple(ref(100 + i, 5.0, prompt="popular") for i in range(60))
    rare = (ref(1, 5.0, prompt="rare"),)
    picks = [select_ladder("Opinion", f"e{i}", popular + rare).references[0].prompt for i in range(200)]
    assert 60 < picks.count("rare") < 140


def test_missing_level_borrows_from_the_nearest_type_and_is_recorded():
    pool = (ref(1, 7.0, "Cause_Effect"), *(ref(i, float(i), "Cause_Solution") for i in (5, 6, 8)))
    ladder = select_ladder("Cause_Effect", "my essay", pool)
    assert sorted(r.band for r in ladder.references) == [5.0, 6.0, 7.0, 8.0]
    assert ladder.gaps == (5.0, 6.0, 8.0)


def test_level_with_no_candidate_stays_empty_and_is_recorded():
    ladder = select_ladder("Opinion", "my essay", (ref(1, 7.0),))
    assert [r.band for r in ladder.references] == [7.0]
    assert ladder.gaps == (5.0, 6.0, 8.0)


def test_unknown_type_draws_from_every_type():
    pool = (ref(5, 5.0, "Discussion"), ref(6, 6.0, "Opinion"), ref(7, 7.0, "Cause_Solution"), ref(8, 8.0))
    ladder = select_ladder("Unknown", "my essay", pool)
    assert len(ladder.references) == 4
    assert ladder.gaps == ()


def test_the_submission_never_sees_itself():
    own = Reference(reference_id("my essay"), "p", "my essay", 7.0, "Opinion")
    ladder = select_ladder("Opinion", "my essay", (own,))
    assert ladder.references == ()


def test_missing_corpus_raises_a_clear_error(tmp_path):
    corpus.load_references.cache_clear()
    with pytest.raises(ReferenceCorpusError):
        corpus.load_references(str(tmp_path))


def test_empty_corpus_raises(tmp_path):
    corpus.load_references.cache_clear()
    (tmp_path / "references.jsonl").write_text("")
    with pytest.raises(ReferenceCorpusError):
        corpus.load_references(str(tmp_path))


def test_corpus_loads_records(tmp_path):
    corpus.load_references.cache_clear()
    record = {"id": "a", "prompt": "p", "essay": "e", "band": 6, "essay_type": "Opinion"}
    (tmp_path / "references.jsonl").write_text(json.dumps(record) + "\n")
    assert corpus.load_references(str(tmp_path))[0].band == 6.0
    corpus.load_references.cache_clear()
