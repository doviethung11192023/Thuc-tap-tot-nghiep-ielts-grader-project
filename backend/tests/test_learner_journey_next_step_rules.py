"""Kỹ năng ưu tiên, câu lý do và shape của thẻ "Bước tiếp theo" (spec 005; TC-P01…P07, TC-R01…R07, TC-A01)."""
from learner_journey_fixtures import attempt, bands_attempts, inputs, lr_test

from app.services.learner_journey.next_step_rules import build_next_step


def test_p01_no_goal():
    assert build_next_step(inputs(goal={})) == {"goal_set": False}
    assert build_next_step(inputs(goal={"target_overall": None, "test_date": "2026-12-01"})) == {"goal_set": False}


def test_p02_new_learner_starts_with_listening_diagnostic():
    catalog = [lr_test("Lpart", "listening", [["completion"] * 13])] + [lr_test(f"L{i}", "listening") for i in range(4)]
    r = build_next_step(inputs(catalog=catalog))
    assert r["priority_skill"] == "listening"
    assert r["reason"] == "Bạn chưa có band Listening; làm 1 bài để hệ thống đánh giá"   # TC-R01
    assert r["weak_spot"] is None
    assert len(r["suggestions"]) == 3
    assert all(s["kind"] == "diagnostic" and s["parts"] == [] and s["mode"] == "practice" for s in r["suggestions"])
    assert "Lpart" not in {s["test_id"] for s in r["suggestions"]}      # đề 13 câu không tính được band


def test_p03_missing_writing_after_lr():
    assert build_next_step(inputs(attempts=bands_attempts(l=6.0, r=6.0)))["priority_skill"] == "writing"


def test_p04_tie_on_gap_lower_band_wins():
    goal = {"target_overall": 7.0, "target_writing": 6.5}
    r = build_next_step(inputs(goal=goal, attempts=bands_attempts(l=6.5, r=6.0, w=5.5, s=6.5)))
    assert r["priority_skill"] == "writing"


def test_p05_full_tie_follows_skill_order():
    r = build_next_step(inputs(attempts=bands_attempts(l=6.0, r=6.0, w=6.5, s=6.5)))
    assert r["priority_skill"] == "listening"


def test_p06_every_target_reached():
    r = build_next_step(inputs(attempts=bands_attempts(l=8.0, r=8.0, w=7.5, s=8.0)))
    assert r["priority_skill"] == "writing"                                   # thặng dư nhỏ nhất
    assert r["reason"] == "Bạn đã đạt mục tiêu Writing; tiếp tục luyện để giữ phong độ"   # TC-R06
    assert len(r["suggestions"]) >= 1


def test_p07_skip_skill_without_practice_test():
    catalog = [lr_test("Lmock", "listening", mode="mock"), lr_test("R1")]
    r = build_next_step(inputs(catalog=catalog))
    assert r["priority_skill"] == "reading" and r["suggestions"][0]["test_id"] == "R1"


def test_p07_empty_catalog():
    r = build_next_step(inputs(catalog=[]))
    assert r["priority_skill"] is None and r["suggestions"] == []
    assert r["reason"] == "Chưa có đề nào đã publish để gợi ý; hãy quay lại sau"


def test_r03_writing_weak_criterion_reason():
    rows = [{"skill": "writing", "attempt_id": "w1", "submitted_at": "2026-11-01T00:00:00+00:00", "code": c,
             "task_no": 2, "band": b, "comment": f"nhận xét {c}"}
            for c, b in (("TR", 6.0), ("CC", 5.0), ("LR", 6.0), ("GRA", 5.5))]
    r = build_next_step(inputs(attempts=bands_attempts(l=7.0, r=7.0, w=6.0, s=7.0), criterion_rows=rows))
    assert r["priority_skill"] == "writing"
    assert r["reason"] == "Writing thấp hơn mục tiêu 1.0 band; tiêu chí yếu nhất là CC"
    assert r["weak_spot"]["kind"] == "criterion" and r["weak_spot"]["comment"] == "nhận xét CC"


def test_r05_lr_without_enough_answers():
    answers = [{"skill": "reading", "question_type": "matching", "question_id": f"q{i}", "is_correct": False}
               for i in range(5)]
    r = build_next_step(inputs(attempts=bands_attempts(l=7.0, r=6.0, w=7.0, s=7.0), lr_answers=answers))
    assert r["weak_spot"] is None                                            # TC-R07: không nêu dạng < 6 câu
    assert r["reason"] == "Reading thấp hơn mục tiêu 1.0 band; làm thêm đề đầy đủ để hệ thống tìm dạng câu yếu"
    assert all(s["kind"] == "test" for s in r["suggestions"])


def test_r07_prompt_type_needs_two_attempts():
    task_rows = [{"attempt_id": "w1", "task_type": "task2", "prompt_category": "Opinion", "band": 4.0}]
    r = build_next_step(inputs(attempts=bands_attempts(l=7.0, r=7.0, w=6.0, s=7.0), writing_task_rows=task_rows))
    assert r["priority_skill"] == "writing" and (r["weak_spot"] or {}).get("prompt_type") is None


def test_a01_contract_shape():
    r = build_next_step(inputs(goal={"target_overall": 7.0, "test_date": "2026-12-11"},
                               attempts=[attempt("listening", 6.0)]))
    assert set(r) == {"goal_set", "priority_skill", "reason", "weak_spot", "suggestions", "exam_days_left"}
    assert r["exam_days_left"] == 30
    keys = {"kind", "skill", "test_id", "test_title", "mode", "parts", "question_type", "predicted_correct",
            "last_done_at"}
    assert all(set(s) == keys for s in r["suggestions"])
