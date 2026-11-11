"""Dữ liệu giả cho test lộ trình học (spec 005): đề, bài làm, câu trả lời. Hôm nay = 2026-11-11 giờ VN."""
from datetime import datetime, timedelta, timezone

from app.services.learner_journey.next_step_rules import JourneyInputs

NOW = datetime(2026, 11, 11, 3, 0, tzinfo=timezone.utc)   # 10:00 giờ VN


def days_ago(n: int) -> str:
    return (NOW - timedelta(days=n)).isoformat()


def lr_test(tid, skill="reading", sections=None, mode="practice"):
    """sections: list các list dạng câu, mỗi phần tử 1 câu. Mặc định 40 câu completion chia 3 phần."""
    sections = sections or [["completion"] * 13, ["completion"] * 13, ["completion"] * 14]
    return {"id": tid, "title": f"Test {tid}", "skill": skill, "allowed_mode": mode,
            "sections": [{"order_no": i + 1, "task_type": None, "prompt_category": None,
                          "questions": [(f"{tid}-s{i + 1}-q{j}", qt) for j, qt in enumerate(types)]}
                         for i, types in enumerate(sections)]}


def writing_test(tid, task1_cat=None, task2_cat=None, mode="practice"):
    return {"id": tid, "title": f"Writing {tid}", "skill": "writing", "allowed_mode": mode,
            "sections": [{"order_no": 1, "task_type": "task1", "prompt_category": task1_cat, "questions": []},
                         {"order_no": 2, "task_type": "task2", "prompt_category": task2_cat, "questions": []}]}


def simple_test(tid, skill, mode="practice"):
    return {"id": tid, "title": f"{skill} {tid}", "skill": skill, "allowed_mode": mode,
            "sections": [{"order_no": 1, "task_type": None, "prompt_category": None, "questions": []}]}


def full_catalog():
    """Mỗi kỹ năng 4 đề Practice."""
    return ([lr_test(f"L{i}", "listening") for i in range(4)] + [lr_test(f"R{i}") for i in range(4)]
            + [writing_test(f"W{i}") for i in range(4)] + [simple_test(f"S{i}", "speaking") for i in range(4)])


def attempt(skill, band, days=5, mode="practice", status="scored", test_id=None, aid=None):
    return {"id": aid or f"{skill}-{band}-{days}-{mode}", "test_id": test_id or f"old-{skill}", "skill": skill,
            "mode": mode, "status": status, "band": band, "submitted_at": days_ago(days)}


def bands_attempts(l=None, r=None, w=None, s=None, mode="mock"):
    out = []
    for skill, band in (("listening", l), ("reading", r), ("writing", w), ("speaking", s)):
        if band is not None:
            out.append(attempt(skill, band, 20, mode))
    return out


def inputs(goal=None, attempts=None, catalog=None, **kw) -> JourneyInputs:
    goal = {"target_overall": 7.0} if goal is None else goal
    return JourneyInputs(goal=goal, attempts=attempts or [], now=NOW,
                         catalog=full_catalog() if catalog is None else catalog, **kw)
