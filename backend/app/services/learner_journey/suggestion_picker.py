"""
Ứng viên gợi ý và cách chọn (FR-009, 012, 014–017). Hàm thuần.

catalog test: {id, title, skill, allowed_mode, sections: [{order_no, task_type, prompt_category,
questions: [(question_id, question_type)]}]} — chỉ đề đã publish (reader lọc).
Gợi ý Practice chỉ dùng đề allowed_mode practice/both; đề Mock do hệ thống chọn ngẫu nhiên (/mock/start)
nên gợi ý Mock không trỏ vào đề cụ thể.
"""
from datetime import datetime, timedelta
from typing import Any, Callable, Optional

from .criterion_trend_calculator import prompt_type_label
from .journey_constants import LR_SKILLS, MAX_SUGGESTIONS, NOT_DONE_STATUSES, PRACTICE_MODES, RECENT_DAYS, TARGET_CORRECT


def parse_ts(value: Any) -> Optional[datetime]:
    if not value:
        return None
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


def practice_tests(catalog: list[dict[str, Any]], skill: str) -> list[dict[str, Any]]:
    return [t for t in catalog if t["skill"] == skill and t.get("allowed_mode") in PRACTICE_MODES]


def last_done_by_test(attempts: list[dict[str, Any]]) -> dict[str, datetime]:
    """Lần nộp gần nhất mỗi đề; bài đã nộp tính là đã làm dù chưa chấm xong (FR-020)."""
    out: dict[str, datetime] = {}
    for a in attempts:
        ts = parse_ts(a.get("submitted_at"))
        if ts is None or a.get("status") in NOT_DONE_STATUSES:
            continue
        if a["test_id"] not in out or ts > out[a["test_id"]]:
            out[a["test_id"]] = ts
    return out


def _suggestion(test: dict, kind: str, parts: list[int], last_done: dict, question_type=None, predicted=None) -> dict:
    done = last_done.get(test["id"])
    return {"kind": kind, "skill": test["skill"], "test_id": test["id"], "test_title": test.get("title"),
            "mode": "practice", "parts": parts, "question_type": question_type,
            "predicted_correct": round(predicted, 2) if predicted is not None else None,
            "last_done_at": done.isoformat() if done else None}


def whole_tests(tests: list[dict], kind: str, last_done: dict) -> list[dict]:
    """Cả đề. Chẩn đoán L/R ưu tiên đề đủ 40 câu để tính được band (BR-03)."""
    if kind == "diagnostic" and tests and tests[0]["skill"] in LR_SKILLS:
        full = [t for t in tests if sum(len(s["questions"]) for s in t["sections"]) == 40]
        tests = full or tests
    return [_suggestion(t, kind, [], last_done) for t in tests]


def lr_parts(tests: list[dict], question_type: str, predict: Callable[[list], Optional[float]],
             last_done: dict) -> list[dict]:
    """Phần đề chứa dạng câu yếu, kèm xác suất làm đúng dự đoán."""
    out = []
    for t in tests:
        for s in t["sections"]:
            if any(qt == question_type for _, qt in s["questions"]):
                out.append(_suggestion(t, "part", [s["order_no"]], last_done, question_type, predict(s["questions"])))
    return out


def writing_parts(tests: list[dict], prompt_label: str, last_done: dict) -> list[dict]:
    """Task thuộc dạng đề yếu (Practice Writing làm được từng task)."""
    return [_suggestion(t, "part", [s["order_no"]], last_done) for t in tests for s in t["sections"]
            if s.get("task_type") and prompt_type_label(s["task_type"], s.get("prompt_category")) == prompt_label]


def pick(candidates: list[dict], now: datetime, rank_by_target: bool = False) -> list[dict]:
    """Ưu tiên chưa làm trong 14 ngày (L/R phần đề: gần 70% nhất); thiếu thì lấy đề làm lâu nhất (FR-015)."""
    cutoff = now - timedelta(days=RECENT_DAYS)
    fresh = [c for c in candidates if c["last_done_at"] is None or parse_ts(c["last_done_at"]) < cutoff]
    stale = [c for c in candidates if c not in fresh]
    if rank_by_target:
        fresh.sort(key=lambda c: abs((c["predicted_correct"] if c["predicted_correct"] is not None else 0)
                                     - TARGET_CORRECT))
    stale.sort(key=lambda c: c["last_done_at"])
    return (fresh + stale)[:MAX_SUGGESTIONS]


def mock_first_due(skill: str, days_left: Optional[int], attempts: list[dict], mock_pool: dict, now: datetime,
                   exam_soon_days: int) -> bool:
    """Còn ≤ 14 ngày tới ngày thi, chưa có Mock kỹ năng này trong 14 ngày qua và còn đề Mock (FR-016)."""
    if days_left is None or days_left > exam_soon_days:
        return False
    pool = mock_pool.get(skill) or {}
    if not pool.get("remaining") and not pool.get("open_attempt_id"):
        return False
    cutoff = now - timedelta(days=RECENT_DAYS)
    for a in attempts:
        ts = parse_ts(a.get("submitted_at"))
        if a.get("skill") == skill and a.get("mode") == "mock" and ts and ts >= cutoff \
                and a.get("status") not in NOT_DONE_STATUSES:
            return False
    return True


def mock_suggestion(skill: str) -> dict[str, Any]:
    return {"kind": "mock", "skill": skill, "test_id": None, "test_title": None, "mode": "mock", "parts": [],
            "question_type": None, "predicted_correct": None, "last_done_at": None}
