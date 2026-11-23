"""Chênh lệch điểm AI so với Expert (US6, FR-026, FR-027, FR-056): tổng, từng tiêu chí, chia nhóm."""
from typing import Any, Optional

from app.core.domain_errors import InvalidRequestError
from app.services.ai_monitoring.ai_expert_gap_groups import GROUP_BY, group_key, load_context
from app.services.ai_monitoring.ai_expert_gap_pairs import CRITERION_ORDER, EvalPair, load_pairs

SKILL_ORDER = {"writing": 0, "speaking": 1}
DEFAULT_DAYS = 30


def summarize(diffs: list[float]) -> Optional[dict[str, Any]]:
    """n, trung bình trị tuyệt đối, trung bình có dấu (Expert − AI); không có mẫu → None."""
    if not diffs:
        return None
    return {"n": len(diffs), "mean_abs": round(sum(abs(d) for d in diffs) / len(diffs), 2),
            "mean_signed": round(sum(diffs) / len(diffs), 2)}


def pair_stats(pairs: list[EvalPair]) -> dict[str, Any]:
    overall = [d for d in (p.overall_diff() for p in pairs) if d is not None]
    by_criterion: dict[tuple[str, str], list[float]] = {}
    for pair in pairs:
        for code, diff in pair.criterion_diffs().items():
            by_criterion.setdefault((pair.skill, code), []).append(diff)
    ordered = sorted(by_criterion, key=lambda k: (SKILL_ORDER.get(k[0], 9), CRITERION_ORDER.index(k[1])
                                                  if k[1] in CRITERION_ORDER else 99))
    return {"overall": summarize(overall),
            "by_criterion": [{"skill": skill, "code": code, **summarize(by_criterion[(skill, code)])}
                             for skill, code in ordered]}


def gap_overview(days: int = DEFAULT_DAYS, group_by: str = "none") -> dict[str, Any]:
    if group_by not in GROUP_BY:
        raise InvalidRequestError("group_by phải là none, prompt_version, model, task_type hoặc band_range")
    pairs = load_pairs(days)
    if group_by == "none":
        return {"days": days, **pair_stats(pairs)}
    ctx = load_context(pairs, group_by)
    grouped: dict[str, list[EvalPair]] = {}
    for pair in pairs:
        grouped.setdefault(group_key(pair, group_by, ctx), []).append(pair)
    groups = [{"key": key, "label": key, **pair_stats(items)} for key, items in sorted(grouped.items())]
    return {"days": days, "group_by": group_by, "groups": groups}
