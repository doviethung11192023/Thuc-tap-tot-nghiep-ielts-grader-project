"""Câu lý do theo mẫu cố định (FR-018, source of truth §8). Không dùng LLM."""
from .journey_constants import SKILL_LABELS


def _gap(gap: float) -> str:
    return f"{gap:.1f}"


def no_band(skill: str) -> str:
    return f"Bạn chưa có band {SKILL_LABELS[skill]}; làm 1 bài để hệ thống đánh giá"


def mock_soon(skill: str, days_left: int) -> str:
    return f"Còn {days_left} ngày tới ngày thi; làm 1 bài Mock {SKILL_LABELS[skill]} để kiểm tra"


def weak_question_type(skill: str, gap: float, type_label: str, mastery: float) -> str:
    return (f"{SKILL_LABELS[skill]} thấp hơn mục tiêu {_gap(gap)} band; "
            f"dạng {type_label} bạn làm đúng khoảng {round(mastery * 100)}%")


def weak_criterion(skill: str, gap: float, code: str) -> str:
    return f"{SKILL_LABELS[skill]} thấp hơn mục tiêu {_gap(gap)} band; tiêu chí yếu nhất là {code}"


def no_weak_spot(skill: str, gap: float) -> str:
    if skill in ("listening", "reading"):
        return f"{SKILL_LABELS[skill]} thấp hơn mục tiêu {_gap(gap)} band; làm thêm đề đầy đủ để hệ thống tìm dạng câu yếu"
    return f"{SKILL_LABELS[skill]} thấp hơn mục tiêu {_gap(gap)} band; làm thêm bài để hệ thống tìm điểm yếu"


def target_reached(skill: str) -> str:
    return f"Bạn đã đạt mục tiêu {SKILL_LABELS[skill]}; tiếp tục luyện để giữ phong độ"


def no_published_test() -> str:
    return "Chưa có đề nào đã publish để gợi ý; hãy quay lại sau"
