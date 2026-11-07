"""
Cron cứu lượt chấm bị bỏ rơi (ADR-02). Trước đây server khởi động lại giữa chừng là attempt kẹt mãi ở grading.

Hai tình huống, đều đọc từ grading_runs:
- chưa worker nào nhận (mất job, Redis sập lúc nộp): đẩy lại. Job còn trong hàng đợi thì ARQ bỏ qua.
- worker nhận rồi nhưng lease hết hạn (worker chết): chạy lại, tối đa MAX_RECOVERIES lần. Quá số đó thì
  lượt chấm thất bại, attempt sang grading_failed để Admin chạy lại (UC-24).
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from app.db.supabase import db
from app.services.grading.grading_queue import GRADING_LEASE_SECONDS, enqueue_grading_run
from app.services.speaking.speaking_evaluation_finalizer import finalize_speaking_evaluation
from app.services.writing.writing_evaluation_finalizer import finalize_writing_evaluation

MAX_RECOVERIES = 2
UNCLAIMED_GRACE_SECONDS = 120   # job mới nộp cần thời gian tới worker; không đẩy lại ngay


def _parse(value: Optional[str]) -> Optional[datetime]:
    return datetime.fromisoformat(value) if value else None


def stale_action(run: dict[str, Any], now: datetime) -> Optional[str]:
    """None (để yên) | 'requeue' | 'recover' | 'fail'."""
    claimed_at = _parse(run.get("claimed_at"))
    if claimed_at is None:
        waited = now - _parse(run["started_at"])
        return "requeue" if waited > timedelta(seconds=UNCLAIMED_GRACE_SECONDS) else None
    if now - claimed_at <= timedelta(seconds=GRADING_LEASE_SECONDS):
        return None
    return "recover" if (run.get("recovery_count") or 0) < MAX_RECOVERIES else "fail"


def _finalize(skill: str, evaluation_id: str) -> None:
    (finalize_speaking_evaluation if skill == "speaking" else finalize_writing_evaluation)(evaluation_id)


def _mark_failed(run: dict[str, Any], skill: str, now: datetime) -> None:
    db().table("grading_runs").update({
        "status": "failed", "finished_at": now.isoformat(),
        "error": f"Worker bị mất sau {MAX_RECOVERIES} lần chạy lại",
    }).eq("id", run["id"]).eq("status", "running").execute()
    _finalize(skill, run["evaluation_id"])


async def recover_stale_grading_runs(redis: Any) -> dict[str, int]:
    runs = db().table("grading_runs").select("id, evaluation_id, status, started_at, claimed_at, recovery_count") \
        .eq("status", "running").execute().data or []
    if not runs:
        return {"requeued": 0, "recovered": 0, "failed": 0}
    evaluations = db().table("evaluations").select("id, skill") \
        .in_("id", list({r["evaluation_id"] for r in runs})).execute().data or []
    skill_by_evaluation = {e["id"]: e["skill"] for e in evaluations}

    now = datetime.now(timezone.utc)
    counts = {"requeued": 0, "recovered": 0, "failed": 0}
    for run in runs:
        action = stale_action(run, now)
        skill = skill_by_evaluation.get(run["evaluation_id"])
        if action is None or skill is None:
            continue
        if action == "fail":
            _mark_failed(run, skill, now)
            counts["failed"] += 1
            continue
        if action == "recover":     # bỏ lease để job mới nhận được
            db().table("grading_runs").update({"claimed_at": None, "recovery_count": run["recovery_count"] + 1}) \
                .eq("id", run["id"]).eq("claimed_at", run["claimed_at"]).execute()
        await enqueue_grading_run(redis, run["id"], skill)
        counts["recovered" if action == "recover" else "requeued"] += 1
    return counts
