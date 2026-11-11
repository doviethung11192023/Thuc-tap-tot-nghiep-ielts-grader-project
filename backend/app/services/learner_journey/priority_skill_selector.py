"""
Kỹ năng ưu tiên (BR-17, FR-008). Hàm thuần.

Kỹ năng chưa có band xếp đầu theo thứ tự L, R, W, S; còn lại khoảng cách (mục tiêu − hiện tại) lớn nhất,
hoà thì band thấp hơn, hoà nữa theo thứ tự L, R, W, S. Trả cả danh sách để builder bỏ qua kỹ năng
không có đề nào đã publish (chuyển sang kỹ năng kế tiếp theo cùng luật).
"""
from typing import Any

from .journey_constants import SKILLS


def priority_order(bands: dict[str, Any]) -> list[str]:
    order = {s: i for i, s in enumerate(SKILLS)}
    missing = [s for s in SKILLS if bands[s]["band"] is None]
    measured = [s for s in SKILLS if bands[s]["band"] is not None]
    measured.sort(key=lambda s: (-(bands[s]["gap"] if bands[s]["gap"] is not None else float("-inf")),
                                 bands[s]["band"], order[s]))
    return missing + measured
