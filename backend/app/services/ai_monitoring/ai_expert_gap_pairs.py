"""Ghép điểm AI với điểm Expert chính thức của cùng attempt (US6, US12) và tính độ lệch Expert − AI.

Quy mô demo nhỏ nên đọc vài truy vấn rồi tính trong Python, không cần view (data-model.md §6).
- Cặp = attempt có evaluation Expert chính thức đã xong và ít nhất một evaluation AI đã xong.
- AI = evaluation AI xong mới nhất (hoặc evaluation Admin chọn khi xem chi tiết).
- Độ lệch tiêu chí tính theo attempt: trung bình band các task có ở cả hai bên, Writing hai task thành một mẫu.
"""
from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any, Optional

from app.db.supabase import db
from app.services.ai_monitoring.ai_monitoring_time import now_vn, parse_iso
from app.services.ai_monitoring.paged_rows import chunks, fetch_all

CRITERION_ORDER = ("TA", "TR", "CC", "LR", "GRA", "FC", "P")
Scores = dict[tuple[str, int], float]     # (mã tiêu chí, task_no) → band


@dataclass
class EvalPair:
    attempt: dict[str, Any]
    ai: dict[str, Any]
    expert: dict[str, Any]
    ai_scores: Scores = field(default_factory=dict)
    expert_scores: Scores = field(default_factory=dict)

    def __post_init__(self) -> None:
        # Speaking không có task: AI ghi task_no 0 còn bản nháp Expert có thể mặc định 1, nên ghép theo mã tiêu chí
        if self.attempt.get("skill") == "speaking":
            self.ai_scores = {(code, 0): band for (code, _), band in self.ai_scores.items()}
            self.expert_scores = {(code, 0): band for (code, _), band in self.expert_scores.items()}

    @property
    def skill(self) -> str:
        return self.attempt["skill"]

    @property
    def scored_at(self):
        return parse_iso(self.expert.get("submitted_at") or self.expert["created_at"])

    def overall_diff(self) -> Optional[float]:
        if self.ai.get("overall_band") is None or self.expert.get("overall_band") is None:
            return None
        return float(self.expert["overall_band"]) - float(self.ai["overall_band"])

    def criterion_bands(self) -> dict[str, tuple[float, float]]:
        """mã tiêu chí → (band AI, band Expert), trung bình các task có ở cả hai bên."""
        bands = {}
        for code in {c for c, _ in self.ai_scores}:
            tasks = [t for c, t in self.ai_scores if c == code and (code, t) in self.expert_scores]
            if tasks:
                bands[code] = (sum(self.ai_scores[(code, t)] for t in tasks) / len(tasks),
                               sum(self.expert_scores[(code, t)] for t in tasks) / len(tasks))
        return bands

    def criterion_diffs(self) -> dict[str, float]:
        return {code: expert - ai for code, (ai, expert) in self.criterion_bands().items()}


def _scores_by_evaluation(evaluation_ids: list[str]) -> dict[str, Scores]:
    codes = {c["id"]: c["code"] for c in db().table("criteria").select("id, code").execute().data or []}
    out: dict[str, Scores] = {}
    for part in chunks(evaluation_ids):
        for row in db().table("criterion_scores").select("evaluation_id, criterion_id, task_no, band") \
                .in_("evaluation_id", part).execute().data or []:
            code = codes.get(row["criterion_id"])
            if code and row.get("band") is not None:
                out.setdefault(row["evaluation_id"], {})[(code, int(row["task_no"]))] = float(row["band"])
    return out


def _ai_evaluations(attempt_ids: list[str]) -> list[dict[str, Any]]:
    rows = []
    for part in chunks(attempt_ids):
        rows += db().table("evaluations").select("id, attempt_id, overall_band, created_at, is_official") \
            .eq("evaluator_type", "ai").eq("status", "done").in_("attempt_id", part).execute().data or []
    return rows


def _attempts(attempt_ids: list[str]) -> dict[str, dict[str, Any]]:
    rows = []
    for part in chunks(attempt_ids):
        rows += db().table("attempts").select("id, skill, mode, test_id, submitted_at") \
            .in_("id", part).execute().data or []
    return {r["id"]: r for r in rows}


def load_pairs(days: int, skill: Optional[str] = None, only_attempt: Optional[str] = None,
               ai_evaluation_id: Optional[str] = None) -> list[EvalPair]:
    """Các cặp AI–Expert mà Expert chấm trong `days` ngày gần nhất (days None = không giới hạn)."""
    def experts_query():
        query = db().table("evaluations").select("id, attempt_id, skill, overall_band, feedback, created_at, submitted_at") \
            .eq("evaluator_type", "expert").eq("is_official", True).eq("status", "done")
        if skill:
            query = query.eq("skill", skill)
        return query.eq("attempt_id", only_attempt) if only_attempt else query

    experts = fetch_all(experts_query)
    if days:
        cutoff = now_vn() - timedelta(days=days)
        experts = [e for e in experts if parse_iso(e.get("submitted_at") or e["created_at"]) >= cutoff]
    attempt_ids = [e["attempt_id"] for e in experts]
    ai_by_attempt: dict[str, dict[str, Any]] = {}
    for ai in sorted(_ai_evaluations(attempt_ids), key=lambda e: e["created_at"]):
        if ai_evaluation_id is None or ai["id"] == ai_evaluation_id:
            ai_by_attempt[ai["attempt_id"]] = ai       # sắp tăng dần nên bản mới nhất ghi đè sau cùng
    attempts = _attempts(list(ai_by_attempt))
    kept = [e for e in experts if e["attempt_id"] in ai_by_attempt and e["attempt_id"] in attempts]
    scores = _scores_by_evaluation([e["id"] for e in kept] + [ai_by_attempt[e["attempt_id"]]["id"] for e in kept])
    return [EvalPair(attempts[e["attempt_id"]], ai_by_attempt[e["attempt_id"]], e,
                     scores.get(ai_by_attempt[e["attempt_id"]]["id"], {}), scores.get(e["id"], {})) for e in kept]


def load_runs(evaluation_ids: list[str]) -> dict[str, list[dict[str, Any]]]:
    """Các lượt chấm của từng evaluation AI, task nhỏ trước."""
    out: dict[str, list[dict[str, Any]]] = {}
    for part in chunks(evaluation_ids):
        for run in db().table("grading_runs").select("id, evaluation_id, task_no, model, prompt_versions, trace_id, "
                                                     "status, started_at").in_("evaluation_id", part).execute().data or []:
            out.setdefault(run["evaluation_id"], []).append(run)
    for runs in out.values():
        runs.sort(key=lambda r: r.get("task_no") or 0)
    return out
