"""Chạy lại chấm AI cho một hoặc nhiều attempt (US3, UC-24): xem trước rồi chạy.

Việc quyết định có chạy được hay không nằm trong function SQL start_ai_regrade (khoá attempt, kiểm trạng thái,
tạo evaluation mới, ghi audit trong cùng transaction). Ở đây chỉ chuẩn hoá danh sách, ước tính chi phí
và đẩy các lượt mới vào hàng đợi chấm bình thường (FR-014).
"""
import uuid
from datetime import timedelta
from typing import Any, Optional

from fastapi.concurrency import run_in_threadpool

from app.core.domain_errors import DomainError
from app.db.supabase import db
from app.services.ai_monitoring import model_pricing
from app.services.ai_monitoring.ai_budget_status import budget_status
from app.services.ai_monitoring.ai_monitoring_time import now_vn
from app.services.ai_monitoring.ai_usage_report import month_cost_usd
from app.services.grading.grading_queue import enqueue_grading_run

MAX_ATTEMPTS = 50
COST_WINDOW_DAYS = 30
AI_SKILLS = ("writing", "speaking")
SKIP_BY_STATUS = {"in_progress": "not_submitted", "abandoned": "not_submitted", "submitted": "grading",
                  "grading": "grading", "no_speech": "no_speech"}


class RegradeLimitError(DomainError):
    """Quá số attempt tối đa của một đợt (422)."""
    status_code = 422


def dedupe(attempt_ids: list[str]) -> tuple[list[str], list[dict[str, str]]]:
    """Bỏ trùng giữ thứ tự; mỗi bản sao thừa thành một dòng bỏ qua lý do duplicate. Quá 50 bài sau khi bỏ trùng → 422."""
    seen: set[str] = set()
    unique, skipped = [], []
    for attempt_id in attempt_ids:
        if attempt_id in seen:
            skipped.append({"attempt_id": attempt_id, "reason": "duplicate"})
        else:
            seen.add(attempt_id)
            unique.append(attempt_id)
    if len(unique) > MAX_ATTEMPTS:
        raise RegradeLimitError(f"Tối đa {MAX_ATTEMPTS} bài")
    return unique, skipped


def _average_run_costs() -> dict[str, float]:
    """Trung bình cost_usd mỗi lượt của từng kỹ năng trong 30 ngày (chỉ lượt đã biết chi phí)."""
    since = (now_vn() - timedelta(days=COST_WINDOW_DAYS)).isoformat()
    rows = db().table("grading_runs").select("cost_usd, evaluations!inner(skill)") \
        .eq("status", "done").gte("started_at", since).not_.is_("cost_usd", "null").execute().data or []
    sums: dict[str, list[float]] = {}
    for row in rows:
        sums.setdefault((row.get("evaluations") or {}).get("skill"), []).append(float(row["cost_usd"]))
    return {skill: sum(values) / len(values) for skill, values in sums.items()}


def _writing_task_counts(attempt_ids: list[str]) -> dict[str, int]:
    """Số task có bài viết không rỗng của mỗi attempt Writing: mỗi task là một lượt chấm."""
    rows = db().table("essays").select("attempt_id, content").in_("attempt_id", attempt_ids).execute().data or []
    counts: dict[str, int] = {}
    for row in rows:
        if (row.get("content") or "").strip():
            counts[row["attempt_id"]] = counts.get(row["attempt_id"], 0) + 1
    return counts


def estimate_cost(to_regrade: list[dict[str, Any]]) -> Optional[float]:
    """Σ theo kỹ năng: số bài × trung bình cost_usd mỗi lượt × số task. None khi chưa có số liệu để ước tính."""
    if not to_regrade:
        return 0.0
    averages = _average_run_costs()
    task_counts = _writing_task_counts([a["attempt_id"] for a in to_regrade if a["skill"] == "writing"])
    total = 0.0
    for item in to_regrade:
        average = averages.get(item["skill"])
        if average is None:
            return None
        total += average * (task_counts.get(item["attempt_id"], 1) if item["skill"] == "writing" else 1)
    return round(total, 6)


def _classify(attempt: Optional[dict[str, Any]]) -> Optional[str]:
    """Lý do bỏ qua thấy được từ bảng attempts; None = có thể chạy lại (function SQL kiểm lần cuối)."""
    if attempt is None:
        return "not_found"
    if attempt["skill"] not in AI_SKILLS:
        return "not_ai_graded"
    return SKIP_BY_STATUS.get(attempt["status"])


def _attempts_with_running_run(attempt_ids: list[str]) -> set[str]:
    """Attempt đang có lượt chấm chạy (kể cả chạy lại một bài đã scored): start_ai_regrade cũng bỏ qua."""
    if not attempt_ids:
        return set()
    evaluations = db().table("evaluations").select("id, attempt_id").in_("attempt_id", attempt_ids) \
        .eq("evaluator_type", "ai").execute().data or []
    by_evaluation = {row["id"]: row["attempt_id"] for row in evaluations}
    if not by_evaluation:
        return set()
    runs = db().table("grading_runs").select("evaluation_id").eq("status", "running") \
        .in_("evaluation_id", list(by_evaluation)).execute().data or []
    return {by_evaluation[row["evaluation_id"]] for row in runs if row["evaluation_id"] in by_evaluation}


def _speaking_with_deleted_audio(attempt_ids: list[str]) -> set[str]:
    if not attempt_ids:
        return set()
    rows = db().table("speaking_responses").select("attempt_id").in_("attempt_id", attempt_ids) \
        .not_.is_("audio_deleted_at", "null").execute().data or []
    return {row["attempt_id"] for row in rows}


def preview(attempt_ids: list[str]) -> dict[str, Any]:
    unique, skipped = dedupe(attempt_ids)
    rows = db().table("attempts").select("id, skill, status").in_("id", unique).execute().data or [] if unique else []
    by_id = {row["id"]: row for row in rows}
    running = _attempts_with_running_run(list(by_id))
    no_audio = _speaking_with_deleted_audio([a for a, r in by_id.items() if r["skill"] == "speaking"])
    to_regrade = []
    for attempt_id in unique:
        reason = _classify(by_id.get(attempt_id)) or ("grading" if attempt_id in running else None) \
            or ("audio_deleted" if attempt_id in no_audio else None)
        if reason:
            skipped.append({"attempt_id": attempt_id, "reason": reason})
        else:
            attempt = by_id[attempt_id]
            to_regrade.append({"attempt_id": attempt_id, "skill": attempt["skill"], "status": attempt["status"]})
    budget = budget_status(month_cost_usd(), model_pricing.get_budget())
    return {"to_regrade": to_regrade, "skipped": skipped, "estimated_cost_usd": estimate_cost(to_regrade),
            "budget": {"state": budget["state"], "percent": budget["percent"]}}


def _start_regrade(attempt_id: str, admin_id: str, batch_id: Optional[str]) -> dict[str, Any]:
    return db().rpc("start_ai_regrade", {"p_attempt_id": attempt_id, "p_admin_id": admin_id,
                                         "p_batch_id": batch_id}).execute().data or {}


async def run_regrade(admin_id: str, attempt_ids: list[str], redis: Any) -> dict[str, Any]:
    """Mỗi attempt gọi start_ai_regrade rồi đẩy từng run vào hàng đợi. Không chặn khi vượt ngân sách (FR-019)."""
    unique, skipped = dedupe(attempt_ids)
    batch_id = str(uuid.uuid4()) if len(unique) > 1 else None
    queued = []
    for attempt_id in unique:
        # supabase-py đồng bộ: chạy trong threadpool, không thì 50 lời gọi chặn event loop của cả API
        result = await run_in_threadpool(_start_regrade, attempt_id, admin_id, batch_id)
        if result.get("status") != "queued":
            skipped.append({"attempt_id": attempt_id, "reason": result.get("reason") or "not_found"})
            continue
        run_ids = [run["run_id"] for run in result.get("runs") or []]
        for run_id in run_ids:
            await enqueue_grading_run(redis, run_id, result["skill"])
        queued.append({"attempt_id": attempt_id, "evaluation_id": result["evaluation_id"], "run_ids": run_ids})
    return {"batch_id": batch_id if queued else None, "queued": queued, "skipped": skipped}
