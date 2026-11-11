"""Mô hình năng lực Elo theo dạng câu L/R (spec 005 FR-010/011; TC-E01…E08)."""
import math

from app.services.learner_journey.journey_constants import AVERAGE_DIFFICULTY
from app.services.learner_journey.question_ability_elo_model import (
    mastery, predicted_correct, question_difficulty, replay_abilities, sigmoid, step_size, weakest_type,
)


def ans(qid, correct, qtype="completion", skill="reading"):
    return {"skill": skill, "question_type": qtype, "question_id": qid, "is_correct": correct}


def test_e01_unseen_question_is_average():
    assert math.isclose(question_difficulty(0, 0), AVERAGE_DIFFICULTY)
    assert math.isclose(AVERAGE_DIFFICULTY, -math.log(0.6 / 0.4))


def test_e02_difficulty_smoothed():
    easy, hard = question_difficulty(90, 100), question_difficulty(10, 100)
    assert easy < AVERAGE_DIFFICULTY < hard
    # m = 5: 1 lượt đúng / 1 chỉ dịch nhẹ khỏi mức trung bình
    p = (1 + 5 * 0.6) / (1 + 5)
    assert math.isclose(question_difficulty(1, 1), -math.log(p / (1 - p)))


def test_e03_theta_moves_with_answers():
    up = replay_abilities([ans(f"q{i}", True) for i in range(5)], {})[("reading", "completion")]
    down = replay_abilities([ans(f"q{i}", False) for i in range(5)], {})[("reading", "completion")]
    assert up["theta"] > 0 > down["theta"] and up["answered"] == 5
    assert 0 < mastery(down["theta"]) < mastery(0.0) < mastery(up["theta"]) < 1


def test_e04_step_size_shrinks():
    assert math.isclose(step_size(0), 0.4)
    assert math.isclose(step_size(20), 0.2)
    assert step_size(10_000) == 0.1


def test_e05_missing_easy_question_costs_more():
    diff = {"easy": question_difficulty(95, 100), "hard": question_difficulty(5, 100)}
    easy = replay_abilities([ans("easy", False)], diff)[("reading", "completion")]["theta"]
    hard = replay_abilities([ans("hard", False)], diff)[("reading", "completion")]["theta"]
    assert easy < hard < 0


def test_e06_weak_type_needs_six_answers():
    answers = [ans(f"t{i}", i % 4 == 0, "true_false_not_given") for i in range(20)]
    answers += [ans(f"m{i}", False, "matching") for i in range(3)]
    weak = weakest_type(replay_abilities(answers, {}), "reading")
    assert weak["question_type"] == "true_false_not_given" and weak["answered"] == 20


def test_e07_no_weak_type_below_threshold():
    answers = [ans(f"m{i}", False, "matching") for i in range(5)]
    assert weakest_type(replay_abilities(answers, {}), "reading") is None


def test_e08_predicted_correct_of_part():
    abilities = {("reading", "matching"): {"theta": 1.0, "answered": 10}}
    diff = {"a": 0.0, "b": 0.0}
    p = predicted_correct([("a", "matching"), ("b", "completion")], abilities, "reading", diff)
    assert math.isclose(p, (sigmoid(1.0) + sigmoid(0.0)) / 2)
    assert predicted_correct([], abilities, "reading", diff) is None
