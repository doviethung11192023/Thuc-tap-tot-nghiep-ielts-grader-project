"""Unit tests cho backend/app/services/writing/writing_result_views.py."""
from tests.fake_supabase import FakeSupabase

from app.services.writing import writing_result_views


def _seed_base():
    return {
        "tests": [{"id": "t1", "title": "Cambridge IELTS 19 Writing Test 1"}],
        "attempts": [{
            "id": "a1", "learner_id": "u1", "test_id": "t1", "skill": "writing",
            "mode": "mock", "status": "scored", "submitted_at": "2026-11-10T10:00:00+00:00",
            "tests": {"title": "Cambridge IELTS 19 Writing Test 1"},
        }],
        "essays": [
            {
                "id": "e1", "attempt_id": "a1", "content": "The bar chart compares water usage across three regions.",
                "word_count": 165, "updated_at": "2026-11-10T09:50:00+00:00",
                "writing_tasks": {
                    "task_type": "task1",
                    "prompt_category": "bar_chart",
                    "task_prompt": "Summarise the information by selecting and reporting the main features.",
                    "chart_image_key": "https://cdn.example.com/task1-bar.png",
                    "min_words": 150,
                },
            },
            {
                "id": "e2", "attempt_id": "a1", "content": "Many argue governments should fund public transport.",
                "word_count": 270, "updated_at": "2026-11-10T09:59:00+00:00",
                "writing_tasks": {
                    "task_type": "task2",
                    "prompt_category": "opinion",
                    "task_prompt": "To what extent do you agree or disagree?",
                    "chart_image_key": None,
                    "min_words": 250,
                },
            },
        ],
        "evaluations": [
            {
                "id": "ev_ai", "attempt_id": "a1", "skill": "writing", "evaluator_type": "ai",
                "status": "done", "overall_band": 6.5, "feedback": None, "is_official": True,
                "created_at": "2026-11-10T10:01:00+00:00",
            }
        ],
        "grading_runs": [
            {
                "id": "run1", "evaluation_id": "ev_ai", "task_no": 1, "status": "done",
                "started_at": "2026-11-10T10:01:00+00:00", "finished_at": "2026-11-10T10:02:00+00:00",
                "output": {
                    "task_subtype": "bar_chart",
                    "overall_upgraded_essay": "Upgraded Task 1 essay.",
                    "criteria_analysis": {
                        "task_achievement": {"feedback": {"strengths": ["Clear overview"], "areas_to_improve": ["Add units"]}},
                        "coherence_cohesion": {"feedback": {"strengths": ["Logical flow"], "areas_to_improve": []}},
                        "lexical_resource": {"feedback": {"strengths": [], "areas_to_improve": []}},
                        "grammatical_range_and_accuracy": {"feedback": {"strengths": [], "areas_to_improve": []}},
                    },
                },
            },
            {
                "id": "run2", "evaluation_id": "ev_ai", "task_no": 2, "status": "done",
                "started_at": "2026-11-10T10:02:00+00:00", "finished_at": "2026-11-10T10:03:00+00:00",
                "output": {"criteria_analysis": {}, "overall_upgraded_essay": "Upgraded Task 2 essay."},
            },
        ],
        "criterion_scores": [
            {"evaluation_id": "ev_ai", "task_no": 1, "band": 6.0, "comment": None, "criteria": {"code": "TA"}},
            {"evaluation_id": "ev_ai", "task_no": 1, "band": 6.5, "comment": None, "criteria": {"code": "CC"}},
            {"evaluation_id": "ev_ai", "task_no": 1, "band": 6.5, "comment": None, "criteria": {"code": "LR"}},
            {"evaluation_id": "ev_ai", "task_no": 1, "band": 6.0, "comment": None, "criteria": {"code": "GRA"}},
            {"evaluation_id": "ev_ai", "task_no": 2, "band": 7.0, "comment": None, "criteria": {"code": "TR"}},
            {"evaluation_id": "ev_ai", "task_no": 2, "band": 6.5, "comment": None, "criteria": {"code": "CC"}},
            {"evaluation_id": "ev_ai", "task_no": 2, "band": 6.5, "comment": None, "criteria": {"code": "LR"}},
            {"evaluation_id": "ev_ai", "task_no": 2, "band": 6.5, "comment": None, "criteria": {"code": "GRA"}},
        ],
        "annotations": [
            {
                "id": "ann1", "evaluation_id": "ev_ai", "essay_id": "e1", "type": "upgrade",
                "category": "TA", "title": "Overview detail", "original_text": "water usage",
                "corrected_text": "water consumption", "explanation": "More academic phrasing.",
                "start_pos": 23, "end_pos": 34,
            }
        ],
    }


def test_ai_summary_and_essay_result_include_prompt_chart_and_siblings(monkeypatch):
    fake = FakeSupabase(**_seed_base())
    monkeypatch.setattr(writing_result_views, "db", lambda: fake)

    summary = writing_result_views.build_attempt_summary(fake.tables["attempts"][0])
    assert summary["evaluator_type"] == "ai"
    assert summary["overall_band"] == 6.5
    assert summary["writing"]["grading_done"] is True
    assert len(summary["writing"]["tasks"]) == 2
    t1 = summary["writing"]["tasks"][0]
    assert t1["task_prompt"].startswith("Summarise the information")
    assert t1["chart_image_url"] == "https://cdn.example.com/task1-bar.png"
    assert t1["scores"]["overall_band"] == 6.5

    res = writing_result_views.build_essay_result("e1", "u1", is_admin=False)
    assert res is not None
    assert res["essay"]["task_no"] == 1
    assert res["essay"]["test_id"] == "t1"
    assert res["essay"]["chart_image_url"] == "https://cdn.example.com/task1-bar.png"
    assert [s["essay_id"] for s in res["sibling_essays"]] == ["e1", "e2"]
    assert res["result"]["is_score_overridden"] is False
    assert res["result"]["evaluator_type"] == "ai"
    assert res["inline_annotations"][0]["category"] == "TR"  # Normalized to UI ScoreSidebar tab key
    assert "task_response" in res["result"]["criteria_analysis"]


def test_expert_official_evaluation_merges_scores_comments_and_ai_runs(monkeypatch):
    tables = _seed_base()
    tables["evaluations"][0]["is_official"] = False
    tables["evaluations"].append({
        "id": "ev_exp", "attempt_id": "a1", "skill": "writing", "evaluator_type": "expert",
        "status": "done", "overall_band": 7.5, "feedback": "Solid academic control overall.",
        "is_official": True, "created_at": "2026-11-11T10:00:00+00:00",
    })
    tables["criterion_scores"].extend([
        {"evaluation_id": "ev_exp", "task_no": 1, "band": 7.5, "comment": "Accurate overview.", "criteria": {"code": "TA"}},
        {"evaluation_id": "ev_exp", "task_no": 1, "band": 7.5, "comment": "Smooth transitions.", "criteria": {"code": "CC"}},
        {"evaluation_id": "ev_exp", "task_no": 1, "band": 7.0, "comment": None, "criteria": {"code": "LR"}},
        {"evaluation_id": "ev_exp", "task_no": 1, "band": 7.5, "comment": None, "criteria": {"code": "GRA"}},
    ])
    tables["annotations"].append({
        "id": "ann_exp", "evaluation_id": "ev_exp", "essay_id": "e1", "type": "strength",
        "category": "CC", "title": "Strong opening", "original_text": "The bar chart",
        "corrected_text": None, "explanation": "Clear topic introduction.", "start_pos": 0, "end_pos": 13,
    })

    # Expert evaluation is newest when iterating in desc order
    tables["evaluations"] = list(reversed(tables["evaluations"]))
    fake = FakeSupabase(**tables)
    monkeypatch.setattr(writing_result_views, "db", lambda: fake)

    summary = writing_result_views.build_attempt_summary(fake.tables["attempts"][0])
    assert summary["evaluator_type"] == "expert"
    assert summary["overall_band"] == 7.5
    assert summary["expert_feedback"] == "Solid academic control overall."
    assert summary["writing"]["tasks"][0]["status"] == "completed"

    res = writing_result_views.build_essay_result("e1", "u1", is_admin=False)
    assert res is not None
    assert res["essay"]["status"] == "completed"
    assert res["result"]["is_score_overridden"] is True
    assert res["result"]["evaluator_type"] == "expert"
    assert res["result"]["expert_feedback"] == "Solid academic control overall."
    assert res["result"]["overall_upgraded_essay"] == "Upgraded Task 1 essay."
    tr_sub = res["result"]["criteria_analysis"]["task_response"]["sub_criteria"]
    assert tr_sub["Nhận xét chính thức của Chuyên gia"] == "Accurate overview."
    assert [a["id"] for a in res["inline_annotations"]] == ["ann_exp"]


def test_zero_word_orphan_essay_filtered_when_written_essay_exists(monkeypatch):
    tables = _seed_base()
    tables["essays"][1]["content"] = "   "
    tables["essays"][1]["word_count"] = 0
    fake = FakeSupabase(**tables)
    monkeypatch.setattr(writing_result_views, "db", lambda: fake)

    summary = writing_result_views.build_attempt_summary(fake.tables["attempts"][0])
    assert [t["essay_id"] for t in summary["writing"]["tasks"]] == ["e1"]
    res = writing_result_views.build_essay_result("e1", "u1", is_admin=False)
    assert [s["essay_id"] for s in res["sibling_essays"]] == ["e1"]
