"""
Band hiện tại theo kỹ năng (BR-12), overall (BR-02), khoảng cách tới mục tiêu và số ngày tới ngày thi.
Hàm thuần: không đọc DB. Band tự nhập lúc đặt mục tiêu không bao giờ được dùng làm band hiện tại (FR-004).

attempt: {skill, mode, status, band, submitted_at}; band là kết quả chính thức (attempt_results.band),
L/R chỉ có band khi làm đủ 40 câu (BR-03) nên bài làm phần đề tự bị loại.
"""
from datetime import date
from typing import Any, Iterable, Optional

from .journey_constants import MOCK_BAND_ATTEMPTS, PRACTICE_BAND_ATTEMPTS, SCORED, SKILLS


def round_band(value: float) -> float:
    """Làm tròn kiểu IELTS (BR-02): .25 lên .5, .75 lên số nguyên kế tiếp."""
    whole = int(value)
    rem = round(value - whole, 4)
    if rem < 0.25:
        return float(whole)
    if rem < 0.75:
        return whole + 0.5
    return whole + 1.0


def _newest_first(attempts: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(attempts, key=lambda a: str(a.get("submitted_at") or ""), reverse=True)


def skill_band(attempts: Iterable[dict[str, Any]]) -> dict[str, Any]:
    """Band 1 kỹ năng: TB 3 Mock gần nhất; không có Mock thì TB 5 Practice gần nhất (BR-12)."""
    graded = [a for a in attempts if a.get("status") == SCORED and a.get("band") is not None]
    mocks = _newest_first(a for a in graded if a.get("mode") == "mock")[:MOCK_BAND_ATTEMPTS]
    used, source = (mocks, "mock") if mocks else (
        _newest_first(a for a in graded if a.get("mode") == "practice")[:PRACTICE_BAND_ATTEMPTS], "practice")
    if not used:
        return {"band": None, "source": "none", "attempts_used": 0, "low_confidence": False}
    band = round_band(sum(float(a["band"]) for a in used) / len(used))
    return {"band": band, "source": source, "attempts_used": len(used),
            "low_confidence": source == "practice" or len(used) == 1}


def skill_target(goal: dict[str, Any], skill: str) -> Optional[float]:
    value = goal.get(f"target_{skill}")
    if value is None:
        value = goal.get("target_overall")
    return float(value) if value is not None else None


def current_bands(attempts: list[dict[str, Any]], goal: dict[str, Any]) -> dict[str, Any]:
    """{listening..speaking: {band, source, attempts_used, low_confidence, target, gap}, overall}."""
    out: dict[str, Any] = {}
    for skill in SKILLS:
        info = skill_band(a for a in attempts if a.get("skill") == skill)
        target = skill_target(goal, skill)
        info["target"] = target
        info["gap"] = round(target - info["band"], 1) if target is not None and info["band"] is not None else None
        out[skill] = info
    bands = [out[s]["band"] for s in SKILLS]
    out["overall"] = round_band(sum(bands) / 4) if all(b is not None for b in bands) else None
    return out


def exam_countdown(test_date: Optional[str], today: date) -> dict[str, Any]:
    """Số ngày tới ngày thi theo giờ VN; ngày đã qua thì days_left = None, date_passed = True."""
    if not test_date:
        return {"test_date": None, "days_left": None, "date_passed": False}
    exam = date.fromisoformat(str(test_date)[:10])
    days = (exam - today).days
    if days < 0:
        return {"test_date": exam.isoformat(), "days_left": None, "date_passed": True}
    return {"test_date": exam.isoformat(), "days_left": days, "date_passed": False}
