"""Gợi ý: phần đề L/R gần 70%, lọc 14 ngày, Writing theo dạng đề, Mock gần ngày thi (spec 005; TC-S01…S10)."""
from learner_journey_fixtures import attempt, bands_attempts, full_catalog, inputs, lr_test, simple_test, writing_test

from app.services.learner_journey.next_step_rules import build_next_step
from app.services.learner_journey.question_ability_elo_model import mastery, question_difficulty

READING_PRIORITY = bands_attempts(l=7.0, r=6.0, w=7.0, s=7.0)


def tfng_history():
    """20 câu TFNG (5 đúng) + 3 câu matching sai, trên đề cũ."""
    out = [{"skill": "reading", "question_type": "true_false_not_given", "question_id": f"h{i}",
            "is_correct": i % 4 == 0} for i in range(20)]
    return out + [{"skill": "reading", "question_type": "matching", "question_id": f"m{i}", "is_correct": False}
                  for i in range(3)]


def reading_parts_catalog():
    """4 đề Reading; phần 2 có TFNG, độ khó khác nhau theo đề; phần 1 không có TFNG."""
    return [lr_test(f"R{i}", sections=[["completion"] * 13, ["true_false_not_given"] * 13, ["matching"] * 14])
            for i in range(4)]


def difficulty_by_test():
    """R0 rất dễ, R1 dễ, R2 trung bình, R3 khó."""
    rates = {"R0": (99, 100), "R1": (80, 100), "R2": (50, 100), "R3": (10, 100)}
    return {f"{t}-s2-q{j}": question_difficulty(*rates[t]) for t in rates for j in range(13)}


def test_s02_lr_parts_ranked_near_70_percent():
    r = build_next_step(inputs(attempts=READING_PRIORITY, catalog=reading_parts_catalog(),
                               lr_answers=tfng_history(), difficulty=difficulty_by_test()))
    assert r["priority_skill"] == "reading"
    spot = r["weak_spot"]
    assert spot["key"] == "true_false_not_given" and spot["answered"] == 20
    # TC-R02: câu lý do dùng mức thành thạo của chính Learner
    assert r["reason"] == f"Reading thấp hơn mục tiêu 1.0 band; dạng True/False/Not Given bạn làm đúng khoảng {round(spot['value'] * 100)}%"
    sug = r["suggestions"]
    assert len(sug) == 3 and all(s["kind"] == "part" and s["parts"] == [2] for s in sug)
    dist = [abs(s["predicted_correct"] - 0.70) for s in sug]
    assert dist == sorted(dist)
    assert 0 < spot["value"] < mastery(0.0)


def test_s03_no_weak_spot_suggests_whole_tests():
    r = build_next_step(inputs(attempts=READING_PRIORITY))
    assert r["weak_spot"] is None and all(s["kind"] == "test" and s["parts"] == [] for s in r["suggestions"])


def test_s04_recent_tests_skipped():
    attempts = READING_PRIORITY + [attempt("reading", 6.0, 5, test_id="R0", aid="x1")]
    ids = [s["test_id"] for s in build_next_step(inputs(attempts=attempts))["suggestions"]]
    assert "R0" not in ids and len(ids) == 3


def test_s05_all_recent_least_recent_first():
    attempts = READING_PRIORITY + [attempt("reading", None, d, status="in_progress" if d == 0 else "scored",
                                           test_id=f"R{i}", aid=f"x{i}")
                                   for i, d in enumerate((2, 9, 4, 6))]
    ids = [s["test_id"] for s in build_next_step(inputs(attempts=attempts))["suggestions"]]
    assert ids == ["R1", "R3", "R2"]


def test_s06_fewer_tests_than_three():
    catalog = [lr_test("R0"), lr_test("R1")] + [t for t in full_catalog() if t["skill"] != "reading"]
    assert len(build_next_step(inputs(attempts=READING_PRIORITY, catalog=catalog))["suggestions"]) == 2


def test_s07_writing_weak_prompt_type():
    task_rows = [{"attempt_id": f"w{i}", "task_type": t, "prompt_category": c, "band": b}
                 for i, (t, c, b) in enumerate((("task2", "Opinion", 5.0), ("task2", "Opinion", 5.0),
                                                ("task1", "Line graph", 6.0), ("task1", "Line graph", 6.0)))]
    catalog = [writing_test("W0", "Line graph", "Discussion"), writing_test("W1", "Bar chart", "Opinion"),
               writing_test("W2", None, "Opinion")]
    att = bands_attempts(l=7.0, r=7.0, w=6.0, s=7.0)
    r = build_next_step(inputs(attempts=att, catalog=catalog, writing_task_rows=task_rows))
    assert r["weak_spot"] is None or r["weak_spot"]["prompt_type"] == "Opinion"
    assert [(s["test_id"], s["parts"], s["kind"]) for s in r["suggestions"]] == [("W1", [2], "part"), ("W2", [2], "part")]
    # Không có đề dạng đó → đề Practice Writing bất kỳ
    r2 = build_next_step(inputs(attempts=att, catalog=[writing_test("W0", "Line graph", "Discussion")],
                                writing_task_rows=task_rows))
    assert [(s["test_id"], s["kind"]) for s in r2["suggestions"]] == [("W0", "test")]


def test_s08_mock_only_tests_never_practice_suggestions():
    catalog = [lr_test("Rmock", mode="mock"), lr_test("Rboth", mode="both"), lr_test("Rprac")]
    ids = {s["test_id"] for s in build_next_step(inputs(attempts=READING_PRIORITY, catalog=catalog))["suggestions"]}
    assert ids == {"Rboth", "Rprac"}


POOL = {"reading": {"remaining": 3, "open_attempt_id": None}}


def test_s09_mock_first_close_to_exam():
    goal = {"target_overall": 7.0, "test_date": "2026-11-21"}
    r = build_next_step(inputs(goal=goal, attempts=READING_PRIORITY, mock_pool=POOL))
    assert r["exam_days_left"] == 10
    assert r["suggestions"][0] == {"kind": "mock", "skill": "reading", "test_id": None, "test_title": None,
                                   "mode": "mock", "parts": [], "question_type": None, "predicted_correct": None,
                                   "last_done_at": None}
    assert len(r["suggestions"]) == 3
    assert r["reason"] == "Còn 10 ngày tới ngày thi; làm 1 bài Mock Reading để kiểm tra"   # TC-R04


def test_s10_normal_suggestions_when_mock_rule_not_met():
    soon = {"target_overall": 7.0, "test_date": "2026-11-21"}
    recent_mock = READING_PRIORITY + [attempt("reading", 6.0, 3, "mock", aid="m3")]
    cases = [
        inputs(goal=soon, attempts=recent_mock, mock_pool=POOL),                                  # Mock 3 ngày trước
        inputs(goal={"target_overall": 7.0, "test_date": "2026-12-21"}, attempts=READING_PRIORITY, mock_pool=POOL),
        inputs(goal=soon, attempts=READING_PRIORITY, mock_pool={"reading": {"remaining": 0}}),    # hết đề Mock
        inputs(goal={"target_overall": 7.0, "test_date": "2026-11-01"}, attempts=READING_PRIORITY, mock_pool=POOL),
    ]
    for case in cases:
        assert all(s["kind"] != "mock" for s in build_next_step(case)["suggestions"])


def test_s01_speaking_diagnostic_whole_tests():
    att = bands_attempts(l=6.0, r=6.0, w=6.0)
    catalog = [simple_test("S0", "speaking"), simple_test("S1", "speaking", mode="mock")]
    r = build_next_step(inputs(attempts=att, catalog=catalog + [lr_test("R0")]))
    assert r["priority_skill"] == "speaking"
    assert [(s["test_id"], s["kind"]) for s in r["suggestions"]] == [("S0", "diagnostic")]
