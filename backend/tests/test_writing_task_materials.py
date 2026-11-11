"""Spec 006: tài liệu theo đề (nháp → duyệt), dàn ý chỉ ở Practice, cache bài trùng, đáp án đi kèm lúc chấm."""
import asyncio

import pytest

from app.core.domain_errors import DomainError
from app.services.writing import writing_grading_cache as cache
from app.services.writing import writing_grading_service as grading
from app.services.writing import writing_task_materials as materials
from fake_supabase import FakeSupabase

KEY = {"visual_type": "line_graph", "series": [{"name": "Butter", "points": [{"label": "1986", "value": 160}]}],
       "key_features": [{"id": "f1", "statement": "Butter peaked in 1986"}]}


@pytest.fixture
def fake(monkeypatch):
    client = FakeSupabase(
        writing_tasks=[{"section_id": "s1", "task_type": "task1", "task_prompt": "The graph shows spreads.",
                        "chart_image_key": "https://r2/x.png"}],
        writing_task_materials=[],
        evaluations=[{"id": "e1", "attempt_id": "a1", "evaluator_type": "ai"}],
        grading_runs=[],
    )
    for module in (materials, cache, grading):
        monkeypatch.setattr(module, "db", lambda: client)
    return client


def test_drafts_are_not_served_until_approved(fake):
    materials.update_material("s1", {"answer_key": KEY, "outline": "Intro; Body 1; Body 2"})
    assert materials.approved_answer_key("s1") == (None, None)
    assert materials.approved_outline("s1") is None

    materials.approve_material("s1", "answer_key", "admin-1")
    key, reviewed_at = materials.approved_answer_key("s1")
    assert key == KEY and reviewed_at
    assert materials.get_material("s1")["answer_key_reviewer_id"] == "admin-1"


def test_any_edit_returns_material_to_draft(fake):
    materials.update_material("s1", {"answer_key": KEY})
    materials.approve_material("s1", "answer_key", "admin-1")
    materials.update_material("s1", {"answer_key": {**KEY, "unit": "grams"}})
    assert materials.approved_answer_key("s1") == (None, None)


def test_image_change_clears_key_approval(fake):
    materials.update_material("s1", {"answer_key": KEY})
    materials.approve_material("s1", "answer_key", "admin-1")
    materials.clear_key_approval("s1")
    assert materials.approved_answer_key("s1") == (None, None)


def test_cannot_approve_empty_or_malformed(fake):
    with pytest.raises(DomainError):
        materials.approve_material("s1", "sample", "admin-1")
    with pytest.raises(DomainError):
        materials.update_material("s1", {"answer_key": {"series": []}})


def test_outline_attached_only_when_approved(fake):
    content = {"sections": [{"id": "s1", "question_groups": [{"content": {}}]}]}
    materials.update_material("s1", {"outline": "Intro; Body 1; Body 2"})
    assert "outline" not in materials.with_practice_outlines(content)["sections"][0]["question_groups"][0]["content"]
    materials.approve_material("s1", "outline", "admin-1")
    out = materials.with_practice_outlines(content)["sections"][0]["question_groups"][0]["content"]
    assert out["outline"] == "Intro; Body 1; Body 2"


def test_cache_key_changes_with_essay_key_and_engine_setup():
    base = cache.input_hash(1, "s1", "  The graph shows. ", "2026-11-11", "fp1")
    assert base == cache.input_hash(1, "s1", "The graph shows.", "2026-11-11", "fp1")   # chỉ bỏ khoảng trắng 2 đầu
    assert base != cache.input_hash(1, "s1", "The graph shows!", "2026-11-11", "fp1")
    assert base != cache.input_hash(1, "s1", "The graph shows.", "2026-11-12", "fp1")
    assert base != cache.input_hash(1, "s1", "The graph shows.", "2026-11-11", "fp2")
    assert cache.input_hash(1, "s1", "x", None, None) is None                         # engine không trả → không cache


def test_regrade_is_never_served_from_cache(fake):
    assert cache.is_first_ai_evaluation("e1")
    fake.tables["evaluations"].append({"id": "e2", "attempt_id": "a1", "evaluator_type": "ai"})
    assert not cache.is_first_ai_evaluation("e2")


def test_identical_essay_reuses_done_result_and_failed_runs_are_ignored(fake, monkeypatch):
    calls = []

    async def fake_grade(*args):
        calls.append(args)
        return {"scores": {}}

    async def fingerprint(task_no):
        return "fp"

    monkeypatch.setattr(grading, "call_ai_grade", fake_grade)
    monkeypatch.setattr(grading, "call_ai_grading_fingerprint", fingerprint)
    essay = {"section_id": "s1", "content": "Same essay.", "task_prompt": "p", "chart_image_key": None}
    hash_value = cache.input_hash(1, "s1", "Same essay.", None, "fp")
    fake.tables["grading_runs"] += [
        {"id": "old-failed", "input_hash": hash_value, "status": "failed", "output": None},
        {"id": "old-done", "input_hash": hash_value, "status": "done", "output": {"scores": {"x": 1}}},
    ]
    result = asyncio.run(grading._grade_or_reuse("e1", "new-run", essay, 1))
    assert result["cached_from_run_id"] == "old-done" and not calls


def test_approved_key_is_sent_to_the_engine(fake, monkeypatch):
    sent = {}

    async def fake_grade(title, essay, task_no, image_url, answer_key=None):
        sent["key"] = answer_key
        return {"scores": {}}

    async def no_fingerprint(task_no):
        return None

    monkeypatch.setattr(grading, "call_ai_grade", fake_grade)
    monkeypatch.setattr(grading, "call_ai_grading_fingerprint", no_fingerprint)
    monkeypatch.setattr(grading, "chart_image_url", lambda key: key)
    materials.update_material("s1", {"answer_key": KEY})
    materials.approve_material("s1", "answer_key", "admin-1")
    essay = {"section_id": "s1", "content": "An essay.", "task_prompt": "p", "chart_image_key": "k"}
    result = asyncio.run(grading._grade_or_reuse("e1", "run", essay, 1))
    assert sent["key"] == KEY and result["answer_key_reviewed_at"]
