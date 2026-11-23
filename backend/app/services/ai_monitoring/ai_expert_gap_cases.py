"""Danh sách ca lệch AI–Expert (US12, FR-053): lọc theo kỹ năng, tiêu chí, độ lệch tối thiểu, chiều lệch."""
from typing import Any, Optional

from app.core.domain_errors import InvalidRequestError
from app.db.supabase import db
from app.services.ai_monitoring.ai_expert_gap import DEFAULT_DAYS
from app.services.ai_monitoring.ai_expert_gap_groups import (
    load_categories, model_label, prompt_label, task_type_label,
)
from app.services.ai_monitoring.ai_expert_gap_pairs import CRITERION_ORDER, EvalPair, load_pairs, load_runs
from app.services.ai_monitoring.paged_rows import chunks

REASON_PREFIX = "CHANGE_REASON:"
DIRECTIONS = ("all", "ai_higher", "ai_lower")
EPSILON = 1e-9


def expert_reasons(expert_evaluation_ids: list[str]) -> dict[str, str]:
    """evaluation Expert → lý do giải trình (chữ sau tiền tố CHANGE_REASON:), chỉ những bài có lý do."""
    out: dict[str, str] = {}
    for part in chunks(expert_evaluation_ids):
        for row in db().table("review_assignments").select("evaluation_id, note") \
                .in_("evaluation_id", part).execute().data or []:
            note = (row.get("note") or "").strip()
            if note.startswith(REASON_PREFIX) and note[len(REASON_PREFIX):].strip():
                out[row["evaluation_id"]] = note[len(REASON_PREFIX):].strip()
    return out


def _bands(pair: EvalPair, criterion: str) -> Optional[tuple[float, float]]:
    """(band AI, band Expert) của tiêu chí đang lọc; overall lấy từ evaluation."""
    if criterion == "overall":
        if pair.overall_diff() is None:
            return None
        return float(pair.ai["overall_band"]), float(pair.expert["overall_band"])
    return pair.criterion_bands().get(criterion)


def _matches(diff: float, min_abs: float, direction: str) -> bool:
    if abs(diff) < min_abs - EPSILON:
        return False
    return direction == "all" or (direction == "ai_higher") == (diff < 0)


def filter_cases(pairs: list[EvalPair], criterion: str, min_abs: float, direction: str) -> list[tuple[EvalPair, float, float, float]]:
    """[(cặp, band AI, band Expert, độ lệch Expert − AI)] xếp |lệch| giảm dần, hoà thì Expert chấm sau xếp trước."""
    rows = []
    for pair in pairs:
        bands = _bands(pair, criterion)
        if bands and _matches(bands[1] - bands[0], min_abs, direction):
            rows.append((pair, bands[0], bands[1], bands[1] - bands[0]))
    rows.sort(key=lambda r: r[0].scored_at.timestamp(), reverse=True)
    rows.sort(key=lambda r: -abs(r[3]))             # sort ổn định: giữ thứ tự mới trước khi hoà
    return rows


def _main_run(runs: list[dict[str, Any]]) -> dict[str, Any]:
    return max(runs, key=lambda r: r.get("task_no") or 0) if runs else {}


def list_cases(days: int = DEFAULT_DAYS, skill: Optional[str] = None, criterion: str = "overall",
               min_abs: float = 1.0, direction: str = "all", page: int = 1, limit: int = 20) -> dict[str, Any]:
    criterion = criterion.upper() if criterion.lower() != "overall" else "overall"
    if criterion != "overall" and criterion not in CRITERION_ORDER:
        raise InvalidRequestError("criterion phải là overall, TA, TR, CC, LR, GRA, FC hoặc P")
    if direction not in DIRECTIONS:
        raise InvalidRequestError("direction phải là all, ai_higher hoặc ai_lower")
    rows = filter_cases(load_pairs(days, skill), criterion, min_abs, direction)
    chosen = rows[(page - 1) * limit: page * limit]
    return {"items": _build_items(chosen), "total": len(rows), "page": page, "limit": limit}


def _build_items(chosen: list[tuple[EvalPair, float, float, float]]) -> list[dict[str, Any]]:
    if not chosen:
        return []
    pairs = [c[0] for c in chosen]
    runs = load_runs([p.ai["id"] for p in pairs])
    categories = load_categories(sorted({p.attempt["test_id"] for p in pairs if p.skill == "writing"}))
    test_ids = sorted({p.attempt["test_id"] for p in pairs})
    titles = {t["id"]: t["title"] for t in db().table("tests").select("id, title").in_("id", test_ids).execute().data or []}
    reasons = expert_reasons([p.expert["id"] for p in pairs])
    items = []
    for pair, ai_band, expert_band, diff in chosen:
        run_list = runs.get(pair.ai["id"], [])
        items.append({
            "attempt_id": pair.attempt["id"], "skill": pair.skill, "mode": pair.attempt.get("mode"),
            "test_title": titles.get(pair.attempt["test_id"]),
            "task_type": task_type_label(pair, categories),
            "ai_evaluation_id": pair.ai["id"], "expert_evaluation_id": pair.expert["id"],
            "ai_band": round(ai_band, 2), "expert_band": round(expert_band, 2), "diff": round(diff, 2),
            "ai_overall": pair.ai.get("overall_band"), "expert_overall": pair.expert.get("overall_band"),
            "model": model_label(run_list), "prompt_versions": _main_run(run_list).get("prompt_versions"),
            "prompt_label": prompt_label(run_list, pair.skill),
            "has_expert_reason": pair.expert["id"] in reasons,
            "expert_scored_at": (pair.expert.get("submitted_at") or pair.expert["created_at"]),
        })
    return items
