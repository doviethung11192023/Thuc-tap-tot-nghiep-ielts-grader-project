"""Khoá chia nhóm cho chênh lệch AI–Expert (FR-056): phiên bản prompt chính, model, dạng đề, khoảng band Expert."""
from dataclasses import dataclass, field
from typing import Any, Optional

from app.core.domain_errors import InvalidRequestError
from app.db.supabase import db
from app.services.ai_monitoring.ai_expert_gap_pairs import EvalPair, load_runs
from app.services.ai_monitoring.paged_rows import chunks

GROUP_BY = ("none", "prompt_version", "model", "task_type", "band_range")
# Prompt "chính" của một lượt: prompt chấm tổng (Task 2 grade) hoặc tiêu chí đầu tiên của kỹ năng
MAIN_PROMPT_ORDER = ("grade", "ta", "fc", "pr", "cc", "lr", "gra")


@dataclass
class GroupContext:
    runs: dict[str, list[dict[str, Any]]] = field(default_factory=dict)         # evaluation AI → các lượt chấm
    categories: dict[str, dict[int, Optional[str]]] = field(default_factory=dict)   # test_id → {task_no: dạng đề}


def prompt_label(runs: list[dict[str, Any]], skill: str) -> str:
    """"<khoá prompt>@v<số>" của lượt chính: Writing ưu tiên Task 2; thiếu thông tin → "unknown"."""
    for run in sorted(runs, key=lambda r: -(r.get("task_no") or 0)):
        versions = run.get("prompt_versions")
        if isinstance(versions, dict) and versions:
            key = next((k for k in MAIN_PROMPT_ORDER if versions.get(k) is not None), None)
            if key:
                return f"{key}@v{versions[key]}"
    return "unknown"


def model_label(runs: list[dict[str, Any]]) -> str:
    models = {r["model"] for r in runs if r.get("model")}
    return "mixed" if len(models) > 1 else next(iter(models), "unknown")


def band_range_label(expert_overall: Optional[float]) -> str:
    if expert_overall is None:
        return "unknown"
    band = float(expert_overall)
    return "<=5.0" if band <= 5.0 else ">=7.0" if band >= 7.0 else "5.5-6.5"


def task_type_label(pair: EvalPair, categories: dict[str, dict[int, Optional[str]]]) -> str:
    """Speaking một nhóm; Writing lấy dạng đề của Task 2 nếu có chấm, không thì Task 1."""
    if pair.skill == "speaking":
        return "speaking"
    graded = {task for _, task in pair.ai_scores}
    by_task = categories.get(pair.attempt["test_id"], {})
    for task_no in (2, 1):
        if task_no in graded:
            return by_task.get(task_no) or "uncategorized"
    return "uncategorized"


def load_categories(test_ids: list[str]) -> dict[str, dict[int, Optional[str]]]:
    out: dict[str, dict[int, Optional[str]]] = {}
    for part in chunks(test_ids):
        sections = db().table("sections").select("id, test_id").in_("test_id", part).execute().data or []
        section_test = {s["id"]: s["test_id"] for s in sections}
        for task_part in chunks(list(section_test)):
            for task in db().table("writing_tasks").select("section_id, task_type, prompt_category") \
                    .in_("section_id", task_part).execute().data or []:
                task_no = 1 if task["task_type"] == "task1" else 2
                out.setdefault(section_test[task["section_id"]], {})[task_no] = task.get("prompt_category")
    return out


def load_context(pairs: list[EvalPair], group_by: str) -> GroupContext:
    """Chỉ đọc phần dữ liệu mà kiểu chia nhóm cần."""
    ctx = GroupContext()
    if group_by in ("prompt_version", "model"):
        ctx.runs = load_runs([p.ai["id"] for p in pairs])
    if group_by == "task_type":
        ctx.categories = load_categories(sorted({p.attempt["test_id"] for p in pairs if p.skill == "writing"}))
    return ctx


def group_key(pair: EvalPair, group_by: str, ctx: GroupContext) -> str:
    if group_by == "prompt_version":
        return prompt_label(ctx.runs.get(pair.ai["id"], []), pair.skill)
    if group_by == "model":
        return model_label(ctx.runs.get(pair.ai["id"], []))
    if group_by == "task_type":
        return task_type_label(pair, ctx.categories)
    if group_by == "band_range":
        return band_range_label(pair.expert.get("overall_band"))
    raise InvalidRequestError("group_by phải là none, prompt_version, model, task_type hoặc band_range")
