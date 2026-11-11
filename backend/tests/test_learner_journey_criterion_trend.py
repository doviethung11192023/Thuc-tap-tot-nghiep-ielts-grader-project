"""Tiêu chí W/S và dạng đề Writing (spec 005 FR-013/014; TC-W01…W06)."""
import math

from app.services.learner_journey.criterion_trend_calculator import (
    criterion_trends, weakest_criterion, weakest_prompt_type,
)


def row(attempt, day, code, band, task_no=1, comment=None):
    return {"attempt_id": attempt, "submitted_at": f"2026-11-{day:02d}T00:00:00+00:00", "code": code,
            "task_no": task_no, "band": band, "comment": comment}


def test_w01_moving_average():
    trends = criterion_trends([row("a3", 3, "CC", 5.0), row("a1", 1, "CC", 6.0), row("a2", 2, "CC", 5.0)])
    assert math.isclose(trends["CC"]["trend"], 5.25)


def test_w02_weakest_criterion_with_latest_comment():
    rows = [row("a1", 1, "CC", 6.0, comment="cũ"),
            row("a2", 2, "TA", 6.0), row("a2", 2, "CC", 4.0, comment="Thiếu từ nối"),
            row("a2", 2, "LR", 6.0), row("a2", 2, "GRA", 5.5)]
    weak = weakest_criterion(criterion_trends(rows), "writing")
    assert weak["code"] == "CC" and math.isclose(weak["trend"], 5.0) and weak["comment"] == "Thiếu từ nối"


def test_w02b_criterion_values_from_spec():
    rows = [row("a1", 1, "TA", 6.0), row("a1", 1, "CC", 5.0), row("a1", 1, "LR", 6.0), row("a1", 1, "GRA", 5.5)]
    assert weakest_criterion(criterion_trends(rows), "writing")["code"] == "CC"


def test_w03_two_tasks_averaged_comment_from_lower_task():
    rows = [row("a1", 1, "CC", 5.0, task_no=1, comment="Task 1 rời rạc"),
            row("a1", 1, "CC", 6.0, task_no=2, comment="Task 2 ổn")]
    t = criterion_trends(rows)["CC"]
    assert math.isclose(t["trend"], 5.5) and t["comment"] == "Task 1 rời rạc"


def task(attempt, task_type, category, band):
    return {"attempt_id": attempt, "task_type": task_type, "prompt_category": category, "band": band}


def test_w04_weakest_prompt_type():
    rows = [task("a1", "task2", "Opinion", 5.0), task("a2", "task2", "Opinion", 5.0),
            task("a3", "task1", "Line graph", 6.0), task("a4", "task1", "Line graph", 6.0)]
    assert weakest_prompt_type(rows)["label"] == "Opinion"


def test_w05_prompt_type_needs_two_attempts():
    rows = [task("a1", "task2", "Opinion", 4.0), task("a2", "task1", "Line graph", 6.0),
            task("a3", "task1", "Line graph", 6.5)]
    assert weakest_prompt_type(rows)["label"] == "Line graph"
    assert weakest_prompt_type([task("a1", "task2", "Opinion", 4.0)]) is None


def test_w06_empty_category_falls_back_to_task():
    rows = [task("a1", "task1", None, 5.0), task("a2", "task1", "  ", 5.0)]
    assert weakest_prompt_type(rows)["label"] == "Task 1"
