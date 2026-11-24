"""
Mô hình năng lực L/R theo dạng câu: Elo dạng Rasch 1 tham số (ADR-23, source of truth §8). Hàm thuần.

- Độ khó câu q: p_q = (đúng + m·p0) / (lượt + m); b_q = −ln(p_q / (1 − p_q)), chung cho mọi Learner.
- Duyệt câu Learner đã làm theo thời gian nộp: P = σ(θ − b_q); θ ← θ + K·(đúng − P),
  K = max(0,1; 0,4 / (1 + n/20)), n = số câu đã tính của dạng đó.
- Mức thành thạo hiển thị = P với câu độ khó trung bình b0.
"""
import math
from typing import Any, Iterable, Optional

from .journey_constants import (
    AVERAGE_DIFFICULTY, K_BASE, K_HALF_LIFE, K_MIN, MIN_TYPE_ANSWERS, PRIOR_CORRECT_RATE, PRIOR_WEIGHT,
)


def sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def question_difficulty(correct: int, total: int) -> float:
    """b_q làm mượt về mức trung bình; câu chưa ai làm có b = b0."""
    p = (correct + PRIOR_WEIGHT * PRIOR_CORRECT_RATE) / (total + PRIOR_WEIGHT)
    return -math.log(p / (1 - p))


def difficulty_map(stats: dict[str, tuple[int, int]]) -> dict[str, float]:
    """{question_id: (đúng, lượt)} → {question_id: b}."""
    return {qid: question_difficulty(c, t) for qid, (c, t) in stats.items()}


def step_size(answered: int) -> float:
    return max(K_MIN, K_BASE / (1 + answered / K_HALF_LIFE))


def replay_abilities(answers: Iterable[dict[str, Any]], difficulty: dict[str, float]) -> dict[tuple[str, str], dict]:
    """
    answers đã xếp theo thời gian nộp rồi số câu: {skill, question_type, question_id, is_correct}.
    Trả {(skill, question_type): {theta, answered}}. Câu bỏ trống (is_correct không phải True) tính là sai.
    """
    out: dict[tuple[str, str], dict] = {}
    for a in answers:
        key = (a["skill"], a["question_type"])
        state = out.setdefault(key, {"theta": 0.0, "answered": 0})
        b = difficulty.get(a["question_id"], AVERAGE_DIFFICULTY)
        p = sigmoid(state["theta"] - b)
        state["theta"] += step_size(state["answered"]) * ((1.0 if a.get("is_correct") is True else 0.0) - p)
        state["answered"] += 1
    return out


def mastery(theta: float) -> float:
    """Xác suất làm đúng một câu độ khó trung bình (0–1)."""
    return sigmoid(theta - AVERAGE_DIFFICULTY)


def weakest_type(abilities: dict[tuple[str, str], dict], skill: str) -> Optional[dict[str, Any]]:
    """Dạng câu có θ thấp nhất trong các dạng đã trả lời ≥ 6 câu; không dạng nào đủ thì None."""
    eligible = [(qtype, s) for (sk, qtype), s in abilities.items()
                if sk == skill and s["answered"] >= MIN_TYPE_ANSWERS]
    if not eligible:
        return None
    qtype, state = min(eligible, key=lambda item: (item[1]["theta"], item[0]))
    return {"question_type": qtype, "theta": state["theta"], "answered": state["answered"],
            "mastery": mastery(state["theta"])}


def predicted_correct(questions: Iterable[tuple[str, str]], abilities: dict[tuple[str, str], dict],
                      skill: str, difficulty: dict[str, float]) -> Optional[float]:
    """TB xác suất đúng trên các câu (question_id, question_type) của một phần đề; dạng chưa có dữ liệu θ = 0."""
    probs = [sigmoid(abilities.get((skill, qtype), {}).get("theta", 0.0)
                     - difficulty.get(qid, AVERAGE_DIFFICULTY)) for qid, qtype in questions]
    return sum(probs) / len(probs) if probs else None
