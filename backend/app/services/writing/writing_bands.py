"""Tính band Writing trong code (ADR-03): LLM chỉ chấm từng tiêu chí."""
import math
from typing import Optional


def ielts_round(value: float) -> float:
    """BR-02: phần lẻ < .25 → xuống; .25–< .75 → .5; ≥ .75 → lên band kế tiếp."""
    whole = math.floor(value)
    frac = value - whole
    if frac < 0.25:
        return float(whole)
    if frac < 0.75:
        return whole + 0.5
    return float(whole + 1)


def to_half_band(value) -> Optional[float]:
    """Điểm tiêu chí từ AI → bội số 0.5 trong [0, 9] (BR-01)."""
    if value is None:
        return None
    return min(9.0, max(0.0, round(float(value) * 2) / 2))


def task_band(criterion_bands: list[float]) -> float:
    """BR-04: band một task = trung bình 4 tiêu chí, làm tròn BR-02."""
    return ielts_round(sum(criterion_bands) / len(criterion_bands))


def attempt_band(task_bands: dict[int, float]) -> float:
    """BR-04: Task 2 nặng gấp đôi Task 1; làm một task thì lấy band của task đó."""
    if 1 in task_bands and 2 in task_bands:
        return ielts_round((task_bands[1] + 2 * task_bands[2]) / 3)
    return ielts_round(next(iter(task_bands.values())))
