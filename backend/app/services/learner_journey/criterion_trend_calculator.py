"""
Điểm yếu W/S (source of truth §8): trung bình động theo tiêu chí và band theo dạng đề Writing. Hàm thuần.

criterion row: {attempt_id, submitted_at, code, task_no, band, comment} (điểm chính thức).
task row: {attempt_id, task_type ('task1'|'task2'), prompt_category, band} — band = TB tiêu chí của task đó.
"""
from collections import defaultdict
from typing import Any, Iterable, Optional

from .journey_constants import MIN_PROMPT_TYPE_ATTEMPTS, SPEAKING_CRITERIA, TREND_WEIGHT, WRITING_CRITERIA


def criterion_trends(rows: Iterable[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """{code: {trend, comment}}: TB các task của bài, rồi m ← 0,5·band + 0,5·m theo thời gian nộp."""
    per_attempt: dict[tuple[str, str], list[dict]] = defaultdict(list)
    submitted: dict[str, str] = {}
    for r in rows:
        per_attempt[(r["attempt_id"], r["code"])].append(r)
        submitted[r["attempt_id"]] = str(r.get("submitted_at") or "")
    out: dict[str, dict[str, Any]] = {}
    for (attempt_id, code), items in sorted(per_attempt.items(), key=lambda kv: submitted[kv[0][0]]):
        band = sum(float(i["band"]) for i in items) / len(items)
        # Writing 2 task cùng tiêu chí: nhận xét của task điểm thấp hơn
        comment = min(items, key=lambda i: float(i["band"])).get("comment")
        prev = out.get(code)
        trend = band if prev is None else TREND_WEIGHT * band + (1 - TREND_WEIGHT) * prev["trend"]
        out[code] = {"trend": trend, "comment": comment or (prev or {}).get("comment")}
    return out


def weakest_criterion(trends: dict[str, dict[str, Any]], skill: str) -> Optional[dict[str, Any]]:
    """Tiêu chí có trung bình động thấp nhất; hoà thì theo thứ tự tiêu chí chuẩn."""
    order = WRITING_CRITERIA if skill == "writing" else SPEAKING_CRITERIA
    rank = {c: i for i, c in enumerate(order)}
    if not trends:
        return None
    code, info = min(trends.items(), key=lambda kv: (kv[1]["trend"], rank.get(kv[0], 99)))
    return {"code": code, "trend": info["trend"], "comment": info.get("comment")}


def prompt_type_label(task_type: str, prompt_category: Optional[str]) -> str:
    if prompt_category and prompt_category.strip():
        return prompt_category.strip()
    return "Task 1" if task_type == "task1" else "Task 2"


def weakest_prompt_type(task_rows: Iterable[dict[str, Any]]) -> Optional[dict[str, Any]]:
    """Dạng đề có band TB thấp nhất trong các dạng đã làm ≥ 2 bài; không có thì None."""
    groups: dict[str, list[float]] = defaultdict(list)
    for r in task_rows:
        groups[prompt_type_label(r["task_type"], r.get("prompt_category"))].append(float(r["band"]))
    eligible = [(label, sum(v) / len(v), len(v)) for label, v in groups.items() if len(v) >= MIN_PROMPT_TYPE_ATTEMPTS]
    if not eligible:
        return None
    label, avg, count = min(eligible, key=lambda x: (x[1], x[0]))
    return {"label": label, "band": avg, "attempts": count}
