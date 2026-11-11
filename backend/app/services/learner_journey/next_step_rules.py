"""
Ráp luật thành thẻ "Bước tiếp theo" (BR-17, ADR-23; selection rules ở specs/005 data-model). Hàm thuần:
mọi dữ liệu truyền vào qua JourneyInputs nên test được không cần DB.
"""
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable, Optional

from . import reason_sentence_templates as reasons
from .criterion_trend_calculator import criterion_trends, weakest_criterion, weakest_prompt_type
from .current_band_calculator import current_bands, exam_countdown
from .journey_constants import EXAM_SOON_DAYS, LR_SKILLS, MAX_SUGGESTIONS, VN_TZ, question_type_label
from .priority_skill_selector import priority_order
from .question_ability_elo_model import predicted_correct, replay_abilities, weakest_type
from .suggestion_picker import (
    last_done_by_test, lr_parts, mock_first_due, mock_suggestion, pick, practice_tests, whole_tests, writing_parts,
)


@dataclass
class JourneyInputs:
    goal: Optional[dict[str, Any]]                 # dòng learner_profiles (None = chưa có)
    attempts: list[dict[str, Any]]                 # {id, test_id, skill, mode, status, band, submitted_at}
    now: datetime                                  # có múi giờ
    catalog: list[dict[str, Any]] = field(default_factory=list)
    lr_answers: list[dict[str, Any]] = field(default_factory=list)       # đã xếp theo thời gian nộp, số câu
    difficulty: dict[str, float] = field(default_factory=dict)           # question_id → b
    criterion_rows: list[dict[str, Any]] = field(default_factory=list)   # có thêm khoá skill
    writing_task_rows: list[dict[str, Any]] = field(default_factory=list)
    mock_pool: dict[str, dict[str, Any]] = field(default_factory=dict)   # skill → {remaining, open_attempt_id}
    # Đọc độ khó khi cần (chỉ khi kỹ năng ưu tiên là L/R đã có band): question_ids → {question_id: b}
    difficulty_loader: Optional[Callable[[set[str]], dict[str, float]]] = None


def goal_is_set(goal: Optional[dict[str, Any]]) -> bool:
    return bool(goal) and goal.get("target_overall") is not None


def _weak_spot_lr(skill: str, data: JourneyInputs):
    abilities = replay_abilities((a for a in data.lr_answers if a["skill"] == skill), data.difficulty)
    weak = weakest_type(abilities, skill)
    if not weak:
        return None, abilities
    spot = {"kind": "question_type", "key": weak["question_type"], "label": question_type_label(weak["question_type"]),
            "value": round(weak["mastery"], 2), "answered": weak["answered"], "comment": None, "prompt_type": None}
    return spot, abilities


def _weak_spot_ws(skill: str, data: JourneyInputs):
    weak = weakest_criterion(criterion_trends(r for r in data.criterion_rows if r.get("skill") == skill), skill)
    prompt = weakest_prompt_type(data.writing_task_rows) if skill == "writing" else None
    if not weak:
        return None, prompt
    spot = {"kind": "criterion", "key": weak["code"], "label": weak["code"], "value": round(weak["trend"], 2),
            "answered": None, "comment": weak["comment"], "prompt_type": prompt["label"] if prompt else None}
    return spot, prompt


def _candidates(skill: str, info: dict, data: JourneyInputs, tests: list, last_done: dict):
    """(weak_spot, ứng viên, xếp theo 70%?)."""
    if info["band"] is None:
        return None, whole_tests(tests, "diagnostic", last_done), False
    if skill in LR_SKILLS:
        if data.difficulty_loader:
            ids = {a["question_id"] for a in data.lr_answers if a["skill"] == skill}
            ids.update(qid for t in tests for s in t["sections"] for qid, _ in s["questions"])
            data.difficulty = data.difficulty_loader(ids)
        spot, abilities = _weak_spot_lr(skill, data)
        if spot:
            predict = lambda qs: predicted_correct(qs, abilities, skill, data.difficulty)  # noqa: E731
            parts = lr_parts(tests, spot["key"], predict, last_done)
            if parts:
                return spot, parts, True
        return spot, whole_tests(tests, "test", last_done), False
    spot, prompt = _weak_spot_ws(skill, data)
    if prompt:
        parts = writing_parts(tests, prompt["label"], last_done)
        if parts:
            return spot, parts, False
    return spot, whole_tests(tests, "test", last_done), False


def _reason(skill: str, info: dict, spot: Optional[dict], mock_first: bool, days_left: Optional[int]) -> str:
    if mock_first:
        return reasons.mock_soon(skill, days_left)
    if info["band"] is None:
        return reasons.no_band(skill)
    if info["gap"] is not None and info["gap"] <= 0:
        return reasons.target_reached(skill)
    if spot and spot["kind"] == "question_type":
        return reasons.weak_question_type(skill, info["gap"], spot["label"], spot["value"])
    if spot:
        return reasons.weak_criterion(skill, info["gap"], spot["key"])
    return reasons.no_weak_spot(skill, info["gap"])


def build_bands_and_exam(data: JourneyInputs) -> tuple[dict, dict]:
    goal = data.goal or {}
    today = data.now.astimezone(VN_TZ).date()
    return current_bands(data.attempts, goal), exam_countdown(goal.get("test_date"), today)


def build_next_step(data: JourneyInputs) -> dict[str, Any]:
    if not goal_is_set(data.goal):
        return {"goal_set": False}
    bands, exam = build_bands_and_exam(data)
    days_left = exam["days_left"]
    last_done = last_done_by_test(data.attempts)
    for skill in priority_order(bands):
        tests = practice_tests(data.catalog, skill)
        if not tests:
            continue
        info = bands[skill]
        spot, candidates, by_target = _candidates(skill, info, data, tests, last_done)
        suggestions = pick(candidates, data.now, by_target)
        mock_first = mock_first_due(skill, days_left, data.attempts, data.mock_pool, data.now, EXAM_SOON_DAYS)
        if mock_first:
            suggestions = [mock_suggestion(skill)] + suggestions[:MAX_SUGGESTIONS - 1]
        return {"goal_set": True, "priority_skill": skill, "reason": _reason(skill, info, spot, mock_first, days_left),
                "weak_spot": spot, "suggestions": suggestions, "exam_days_left": days_left}
    return {"goal_set": True, "priority_skill": None, "reason": reasons.no_published_test(), "weak_spot": None,
            "suggestions": [], "exam_days_left": days_left}
