"""Chênh lệch AI–Expert (US6, US12): số liệu khớp tính tay, chia nhóm, danh sách ca lệch, trang so sánh."""
from datetime import datetime, timezone

import pytest

from app.core.domain_errors import InvalidRequestError, NotFoundError
from app.services.ai_monitoring import (
    ai_expert_gap, ai_expert_gap_case_detail as detail, ai_expert_gap_cases as cases, ai_expert_gap_groups as groups,
    ai_expert_gap_pairs as pairs, model_pricing,
)
from ai_monitoring_test_support import RichFakeSupabase

NOW = datetime(2026, 11, 22, 5, 0, tzinfo=timezone.utc)
CRIT = {"ta": "c-ta", "tr": "c-tr", "cc": "c-cc", "lr": "c-lr", "gra": "c-gra", "fc": "c-fc", "p": "c-p"}


def _ev(eid, attempt, kind, band, created, skill="writing", status="done", submitted=None, **extra):
    return {"id": eid, "attempt_id": attempt, "skill": skill, "evaluator_type": kind, "status": status,
            "is_official": kind == "expert", "overall_band": band, "created_at": created, "submitted_at": submitted,
            "feedback": None, **extra}


def _scores(eid, **bands):
    """bands: ta1=6 nghĩa là TA task 1 = 6; fc0=6 nghĩa là FC task 0 = 6."""
    rows = []
    for key, band in bands.items():
        code, task = key.rstrip("0123456789"), int(key[len(key.rstrip("0123456789")):])
        rows.append({"evaluation_id": eid, "criterion_id": CRIT[code], "task_no": task, "band": band,
                     "comment": f"{code} comment"})
    return rows


@pytest.fixture
def db(monkeypatch):
    fake = RichFakeSupabase(
        attempts=[
            {"id": "W1", "skill": "writing", "mode": "practice", "test_id": "t1", "submitted_at": "2026-11-10T00:00:00+00:00"},
            {"id": "W2", "skill": "writing", "mode": "mock", "test_id": "t2", "submitted_at": "2026-11-11T00:00:00+00:00"},
            {"id": "S1", "skill": "speaking", "mode": "practice", "test_id": "t3", "submitted_at": "2026-11-12T00:00:00+00:00"},
            {"id": "W3", "skill": "writing", "mode": "practice", "test_id": "t1", "submitted_at": "2026-09-01T00:00:00+00:00"},
            {"id": "W4", "skill": "writing", "mode": "practice", "test_id": "t1", "submitted_at": "2026-11-12T00:00:00+00:00"},
            {"id": "W5", "skill": "writing", "mode": "practice", "test_id": "t1", "submitted_at": "2026-11-12T00:00:00+00:00"}],
        evaluations=[
            _ev("ai1", "W1", "ai", 6.0, "2026-11-10T01:00:00+00:00"),
            _ev("ex1", "W1", "expert", 7.0, "2026-11-19T00:00:00+00:00", submitted="2026-11-20T00:00:00+00:00"),
            _ev("ai2old", "W2", "ai", 6.0, "2026-11-11T01:00:00+00:00"),
            _ev("ai2", "W2", "ai", 7.0, "2026-11-12T01:00:00+00:00"),
            _ev("ex2", "W2", "expert", 5.5, "2026-11-19T00:00:00+00:00", submitted="2026-11-21T00:00:00+00:00",
                feedback="Off topic"),
            _ev("ais1", "S1", "ai", 6.5, "2026-11-12T01:00:00+00:00", skill="speaking"),
            _ev("exs1", "S1", "expert", 6.5, "2026-11-19T00:00:00+00:00", skill="speaking", submitted="2026-11-20T01:00:00+00:00"),
            _ev("ai3", "W3", "ai", 6.0, "2026-09-02T00:00:00+00:00"),
            _ev("ex3", "W3", "expert", 8.0, "2026-09-03T00:00:00+00:00", submitted="2026-09-03T00:00:00+00:00"),
            _ev("ex4", "W4", "expert", 8.0, "2026-11-19T00:00:00+00:00", submitted="2026-11-20T00:00:00+00:00"),
            _ev("ai5", "W5", "ai", None, "2026-11-12T00:00:00+00:00", status="failed"),
            _ev("ex5", "W5", "expert", 8.0, "2026-11-19T00:00:00+00:00", submitted="2026-11-20T00:00:00+00:00")],
        criteria=[{"id": cid, "code": code.upper()} for code, cid in CRIT.items()],
        criterion_scores=(_scores("ai1", ta1=6, cc1=6, lr1=6, gra1=6) + _scores("ex1", ta1=7, cc1=6.5, lr1=6, gra1=5.5)
                          + _scores("ai2", tr2=7, cc2=7) + _scores("ex2", tr2=5.5, cc2=6)
                          + _scores("ai2old", tr2=6, cc2=6)
                          + _scores("ais1", fc0=6, p0=6) + _scores("exs1", fc1=6.5, p1=6)),     # Expert Speaking task_no 1
        grading_runs=[
            {"id": "run1", "evaluation_id": "ai1", "task_no": 1, "model": "qwen-flash", "status": "done",
             "prompt_versions": {"ta": 3, "cc": 1, "lr": 1, "gra": 1}, "trace_id": "tr1",
             "started_at": "2026-11-10T01:00:00+00:00"},
            {"id": "run2", "evaluation_id": "ai2", "task_no": 2, "model": "qwen3.7-plus", "status": "done",
             "prompt_versions": {"grade": 7}, "trace_id": "tr2", "started_at": "2026-11-12T01:00:00+00:00"},
            {"id": "run2old", "evaluation_id": "ai2old", "task_no": 2, "model": "qwen-flash", "status": "done",
             "prompt_versions": {"grade": 6}, "trace_id": None, "started_at": "2026-11-11T01:00:00+00:00"},
            {"id": "runs1", "evaluation_id": "ais1", "task_no": None, "model": "qwen-flash", "status": "done",
             "prompt_versions": {"fc": 2, "lr": 2, "gra": 2, "pr": 2}, "trace_id": "trs1",
             "started_at": "2026-11-12T01:00:00+00:00"}],
        tests=[{"id": "t1", "title": "Bar chart"}, {"id": "t2", "title": "Opinion essay"}, {"id": "t3", "title": "Speaking 1"}],
        sections=[{"id": "s1", "test_id": "t1"}, {"id": "s2a", "test_id": "t2"}, {"id": "s2b", "test_id": "t2"}],
        writing_tasks=[{"section_id": "s1", "task_type": "task1", "prompt_category": "bar_chart", "task_prompt": "Describe"},
                       {"section_id": "s2a", "task_type": "task1", "prompt_category": "table", "task_prompt": "T1 of t2"},
                       {"section_id": "s2b", "task_type": "task2", "prompt_category": "opinion", "task_prompt": "Do you agree?"}],
        review_assignments=[{"evaluation_id": "ex2", "note": "CHANGE_REASON: Missed the off-topic paragraph"},
                            {"evaluation_id": "ex1", "note": "just a note"}],
        essays=[{"id": "es2", "attempt_id": "W2", "section_id": "s2b", "content": "I agree with this view."}],
        annotations=[
            {"id": "an1", "evaluation_id": "ai2", "attempt_id": "W2", "essay_id": "es2", "type": "error", "category": "GRA",
             "start_pos": 0, "end_pos": 1, "original_text": "I", "corrected_text": "We", "explanation": "ai note"},
            {"id": "an2", "evaluation_id": "ex2", "attempt_id": "W2", "essay_id": "es2", "type": "logic_issue",
             "category": "TR", "start_pos": 2, "end_pos": 7, "original_text": "agree", "corrected_text": None,
             "explanation": "expert note"},
            {"id": "an3", "evaluation_id": "ai2old", "attempt_id": "W2", "essay_id": "es2", "type": "error",
             "category": "LR", "start_pos": 0, "end_pos": 1, "original_text": "I", "corrected_text": None,
             "explanation": "old ai"}],
        speaking_responses=[{"id": "sr1", "attempt_id": "S1", "speaking_question_id": "q1", "section_id": "sp1",
                             "transcript": "I like music", "confirmed_at": "2026-11-12T00:00:00+00:00"}],
        speaking_questions=[{"id": "q1", "order_no": 1, "prompt": "Do you like music?"}],
    )
    fake.tables["sections"].append({"id": "sp1", "test_id": "t3", "order_no": 1, "title": "Part 1"})
    for module in (pairs, groups, cases, detail, model_pricing):
        monkeypatch.setattr(module, "db", lambda: fake)
    monkeypatch.setattr(pairs, "now_vn", lambda: NOW)
    return fake


def _by_code(stats, skill, code):
    return next(c for c in stats["by_criterion"] if c["skill"] == skill and c["code"] == code)


def test_overall_gap_matches_hand_calculation(db):
    result = ai_expert_gap.gap_overview(30)
    # Expert − AI: W1 +1.0, W2 −1.5 (dùng AI mới nhất ai2 = 7.0), S1 0.0. W3 quá 30 ngày, W4 không có AI, W5 AI lỗi
    assert result["overall"] == {"n": 3, "mean_abs": 0.83, "mean_signed": -0.17}


def test_each_criterion_matches_hand_calculation(db):
    stats = ai_expert_gap.gap_overview(30)
    assert [(c["skill"], c["code"]) for c in stats["by_criterion"]] == [
        ("writing", "TA"), ("writing", "TR"), ("writing", "CC"), ("writing", "LR"), ("writing", "GRA"),
        ("speaking", "FC"), ("speaking", "P")]
    assert _by_code(stats, "writing", "TA") == {"skill": "writing", "code": "TA", "n": 1, "mean_abs": 1.0, "mean_signed": 1.0}
    assert _by_code(stats, "writing", "TR")["mean_signed"] == -1.5
    cc = _by_code(stats, "writing", "CC")                 # W1 +0.5, W2 −1.0
    assert (cc["n"], cc["mean_abs"], cc["mean_signed"]) == (2, 0.75, -0.25)
    assert _by_code(stats, "writing", "GRA")["mean_signed"] == -0.5
    assert _by_code(stats, "speaking", "FC")["mean_signed"] == 0.5     # task_no AI 0 và Expert 1 vẫn ghép được
    assert _by_code(stats, "speaking", "P")["mean_abs"] == 0.0


def test_window_decides_which_attempts_count(db):
    assert ai_expert_gap.gap_overview(90)["overall"]["n"] == 4        # thêm W3 (Expert chấm 80 ngày trước)
    assert ai_expert_gap.gap_overview(1)["overall"] is None           # không ai chấm trong 1 ngày → "chưa đủ dữ liệu"


def test_group_by_prompt_version(db):
    result = ai_expert_gap.gap_overview(30, "prompt_version")
    keyed = {g["key"]: g for g in result["groups"]}
    assert set(keyed) == {"ta@v3", "grade@v7", "fc@v2"}
    assert keyed["grade@v7"]["overall"] == {"n": 1, "mean_abs": 1.5, "mean_signed": -1.5}
    assert keyed["ta@v3"]["overall"]["mean_signed"] == 1.0


def test_group_by_model_task_type_and_band_range(db):
    assert {g["key"] for g in ai_expert_gap.gap_overview(30, "model")["groups"]} == {"qwen-flash", "qwen3.7-plus"}
    task_types = {g["key"]: g["overall"]["n"] for g in ai_expert_gap.gap_overview(30, "task_type")["groups"]}
    assert task_types == {"bar_chart": 1, "opinion": 1, "speaking": 1}
    ranges = {g["key"]: g["overall"]["n"] for g in ai_expert_gap.gap_overview(30, "band_range")["groups"]}
    assert ranges == {">=7.0": 1, "5.5-6.5": 2}


def test_group_labels_and_edge_values():
    assert groups.model_label([{"model": "a"}, {"model": "b"}]) == "mixed"
    assert groups.model_label([{"model": None}]) == "unknown"
    assert groups.prompt_label([{"task_no": 1, "prompt_versions": {"ta": 2}},
                                {"task_no": 2, "prompt_versions": {"grade": 9}}], "writing") == "grade@v9"
    assert groups.prompt_label([{"prompt_versions": None}], "writing") == "unknown"
    assert [groups.band_range_label(b) for b in (4.5, 5.0, 5.5, 6.5, 7.0, 8.5)] == [
        "<=5.0", "<=5.0", "5.5-6.5", "5.5-6.5", ">=7.0", ">=7.0"]


def test_unknown_group_by_is_rejected(db):
    with pytest.raises(InvalidRequestError):
        ai_expert_gap.gap_overview(30, "learner")


# ---------- danh sách ca lệch ----------
def test_cases_for_tr_lists_only_the_big_gap_sorted(db):
    result = cases.list_cases(30, criterion="TR")
    assert [i["attempt_id"] for i in result["items"]] == ["W2"] and result["total"] == 1
    item = result["items"][0]
    assert (item["ai_band"], item["expert_band"], item["diff"]) == (7.0, 5.5, -1.5)
    assert item["ai_evaluation_id"] == "ai2" and item["expert_evaluation_id"] == "ex2"
    assert item["test_title"] == "Opinion essay" and item["task_type"] == "opinion" and item["mode"] == "mock"
    assert item["model"] == "qwen3.7-plus" and item["prompt_versions"] == {"grade": 7}
    assert item["has_expert_reason"] is True and item["ai_overall"] == 7.0 and item["expert_overall"] == 5.5


def test_cases_order_by_absolute_gap_then_filters_and_paging(db):
    overall = cases.list_cases(30, criterion="overall")
    assert [i["attempt_id"] for i in overall["items"]] == ["W2", "W1"]       # |−1.5| trước |+1.0|
    assert [i["has_expert_reason"] for i in overall["items"]] == [True, False]   # ghi chú không có tiền tố không tính
    assert [i["attempt_id"] for i in cases.list_cases(30, direction="ai_higher")["items"]] == ["W2"]
    assert [i["attempt_id"] for i in cases.list_cases(30, direction="ai_lower")["items"]] == ["W1"]
    assert [i["attempt_id"] for i in cases.list_cases(30, skill="speaking", min_abs=0)["items"]] == ["S1"]
    second = cases.list_cases(30, page=2, limit=1)
    assert [i["attempt_id"] for i in second["items"]] == ["W1"] and second["total"] == 2


def test_cases_tie_goes_to_the_most_recent_expert_score(db):
    # CC: W1 +0.5, W2 −1.0; hạ ngưỡng về 0 và tạo hoà ở overall bằng cách chỉnh S1 thành |1.0| như W1
    next(e for e in db.tables["evaluations"] if e["id"] == "exs1")["overall_band"] = 5.5   # exs1: Expert 5.5 so AI 6.5 → −1.0
    order = [i["attempt_id"] for i in cases.list_cases(30, criterion="overall", min_abs=1.0)["items"]]
    assert order == ["W2", "S1", "W1"]                          # S1 (20/11 01:00) mới hơn W1 (20/11 00:00)


def test_cases_reject_bad_criterion_and_direction(db):
    with pytest.raises(InvalidRequestError):
        cases.list_cases(30, criterion="XYZ")
    with pytest.raises(InvalidRequestError):
        cases.list_cases(30, direction="sideways")


# ---------- trang so sánh ----------
def test_detail_defaults_to_latest_done_ai_evaluation_and_shows_both_sides(db):
    result = detail.case_detail("W2")
    assert result["attempt"] == {"id": "W2", "skill": "writing", "mode": "mock", "test_title": "Opinion essay",
                                 "submitted_at": "2026-11-11T00:00:00+00:00"}
    assert [e["id"] for e in result["ai_evaluations"]] == ["ai2", "ai2old"]
    assert result["ai"]["evaluation_id"] == "ai2" and result["ai"]["overall_band"] == 7.0
    assert result["ai"]["criteria"][0] == {"task_no": 2, "code": "TR", "band": 7, "comment": "tr comment"}
    assert result["expert"]["reason"] == "Missed the off-topic paragraph" and result["expert"]["feedback"] == "Off topic"
    assert result["expert"]["scored_at"] == "2026-11-21T00:00:00+00:00"
    run = result["ai"]["runs"][0]
    assert run["model"] == "qwen3.7-plus" and run["prompt_versions"] == {"grade": 7} and run["trace_url"] is None
    task = result["writing"][0]
    assert task["task_no"] == 2 and task["content"] == "I agree with this view." and result["speaking"] == []
    assert {(a["source"], a["category"]) for a in task["annotations"]} == {("ai", "GRA"), ("expert", "TR")}


def test_detail_can_pick_an_older_ai_evaluation(db):
    result = detail.case_detail("W2", "ai2old")
    assert result["ai"]["evaluation_id"] == "ai2old" and result["ai"]["overall_band"] == 6.0
    assert {a["explanation"] for a in result["writing"][0]["annotations"]} == {"old ai", "expert note"}
    assert [r["run_id"] for r in result["ai"]["runs"]] == ["run2old"]


def test_detail_speaking_shows_transcript_by_question(db):
    result = detail.case_detail("S1")
    assert result["speaking"] == [{"part": 1, "question": "Do you like music?", "transcript": "I like music"}]
    assert result["writing"] == [] and result["expert"]["reason"] is None


def test_detail_without_a_pair_is_404(db):
    for attempt in ("W4", "W5", "missing"):
        with pytest.raises(NotFoundError):
            detail.case_detail(attempt)
    with pytest.raises(NotFoundError):
        detail.case_detail("W2", "ai1")          # evaluation AI của bài khác
