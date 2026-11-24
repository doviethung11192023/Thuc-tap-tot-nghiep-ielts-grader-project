"""
Tham số lộ trình học (source of truth §8 "Lộ trình học", ADR-23). Giá trị khởi đầu, hiệu chỉnh khi có dữ liệu
Learner thật (§13). Không hiển thị cho Learner.
"""
import math
from datetime import timedelta, timezone

SKILLS = ("listening", "reading", "writing", "speaking")   # thứ tự hoà (BR-17)
LR_SKILLS = ("listening", "reading")
SKILL_LABELS = {"listening": "Listening", "reading": "Reading", "writing": "Writing", "speaking": "Speaking"}

VN_TZ = timezone(timedelta(hours=7))

# Band hiện tại (BR-12)
MOCK_BAND_ATTEMPTS = 3
PRACTICE_BAND_ATTEMPTS = 5

# Elo (Rasch 1 tham số) cho dạng câu L/R
PRIOR_CORRECT_RATE = 0.6            # p0
PRIOR_WEIGHT = 5                    # m: số lượt giả để làm mượt độ khó
AVERAGE_DIFFICULTY = -math.log(PRIOR_CORRECT_RATE / (1 - PRIOR_CORRECT_RATE))   # b0
K_BASE, K_MIN, K_HALF_LIFE = 0.4, 0.1, 20
MIN_TYPE_ANSWERS = 6                # dạng câu ít hơn thì không coi là điểm yếu
TARGET_CORRECT = 0.70               # vùng mục tiêu 0,60–0,75, xếp gần 0,70 nhất

# W/S
TREND_WEIGHT = 0.5                  # m ← 0,5·band + 0,5·m
MIN_PROMPT_TYPE_ATTEMPTS = 2
WRITING_CRITERIA = ("TA", "TR", "CC", "LR", "GRA")
SPEAKING_CRITERIA = ("FC", "LR", "GRA", "P")

# Gợi ý
RECENT_DAYS = 14                    # đề làm trong 14 ngày qua thì tạm bỏ qua
EXAM_SOON_DAYS = 14                 # còn ≤ 14 ngày tới ngày thi → ưu tiên Mock
MAX_SUGGESTIONS = 3
PRACTICE_MODES = ("practice", "both")

# Trạng thái attempt
SCORED = "scored"
NOT_DONE_STATUSES = ("in_progress", "abandoned")

QUESTION_TYPE_LABELS = {
    "multiple_choice": "Multiple Choice",
    "true_false_not_given": "True/False/Not Given",
    "matching": "Matching",
    "completion": "Completion",
    "short_answer": "Short Answer",
}


def question_type_label(key: str) -> str:
    return QUESTION_TYPE_LABELS.get(key, key.replace("_", " ").title())
