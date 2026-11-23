"""The bake-off gate compares the phoneme channel with Whisper word confidence, so the matching must be right."""
import importlib.util
import sys
from pathlib import Path

SCRIPT = Path(__file__).resolve().parent.parent / "scripts" / "evaluate_speech_models.py"
spec = importlib.util.spec_from_file_location("evaluate_speech_models", SCRIPT)
evaluator = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = evaluator   # dataclass resolves annotations through sys.modules
spec.loader.exec_module(evaluator)


def test_confidence_follows_each_occurrence_in_order():
    heard = [("the", 0.9), ("dog", 0.8), ("the", 0.4)]
    assert evaluator.word_confidences(["the", "dog", "the"], heard) == [0.9, 0.8, 0.4]


def test_word_never_heard_scores_zero_without_losing_later_words():
    heard = [("my", 0.9), ("cat", 0.7)]
    assert evaluator.word_confidences(["my", "friend", "cat"], heard) == [0.9, 0.0, 0.7]


def test_extra_heard_words_are_skipped():
    heard = [("um", 0.5), ("big", 0.6), ("dog", 0.8)]
    assert evaluator.word_confidences(["big", "dog"], heard) == [0.6, 0.8]


def test_rank_auc_rewards_lower_scores_on_wrong_words():
    assert evaluator.rank_auc([0.1, 0.2], [0.8, 0.9]) == 1.0
    assert evaluator.rank_auc([0.5], [0.5]) == 0.5
