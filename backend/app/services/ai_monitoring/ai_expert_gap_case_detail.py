"""Trang so sánh một attempt AI–Expert (US12, FR-054, FR-055): điểm, nhận xét, lỗi đánh dấu của hai bên, lý do Expert."""
from typing import Any, Optional

from app.core.domain_errors import NotFoundError
from app.db.supabase import db
from app.services.ai_monitoring import model_pricing
from app.services.ai_monitoring.ai_expert_gap_cases import expert_reasons
from app.services.ai_monitoring.ai_expert_gap_pairs import CRITERION_ORDER, EvalPair, load_pairs, load_runs
from app.services.ai_monitoring.grading_run_queries import trace_url
from app.services.speaking.speaking_test_content import speaking_part_number

ANNOTATION_FIELDS = "id, evaluation_id, essay_id, type, category, start_pos, end_pos, original_text, corrected_text, explanation"


def _criteria(evaluation_id: str) -> list[dict[str, Any]]:
    codes = {c["id"]: c["code"] for c in db().table("criteria").select("id, code").execute().data or []}
    rows = db().table("criterion_scores").select("criterion_id, task_no, band, comment") \
        .eq("evaluation_id", evaluation_id).execute().data or []
    items = [{"task_no": r["task_no"], "code": codes.get(r["criterion_id"]), "band": r["band"],
              "comment": r.get("comment")} for r in rows]
    order = {code: i for i, code in enumerate(CRITERION_ORDER)}
    return sorted(items, key=lambda i: (i["task_no"], order.get(i["code"], 99)))


def _ai_evaluations(attempt_id: str) -> list[dict[str, Any]]:
    return db().table("evaluations").select("id, created_at, overall_band, is_official") \
        .eq("attempt_id", attempt_id).eq("evaluator_type", "ai").eq("status", "done") \
        .order("created_at", desc=True).execute().data or []


def _ai_runs(evaluation_id: str) -> list[dict[str, Any]]:
    view_days = model_pricing.get_trace_view_days()
    return [{"run_id": r["id"], "task_no": r.get("task_no"), "model": r.get("model"),
             "prompt_versions": r.get("prompt_versions"), "status": r["status"],
             "trace_url": trace_url(r.get("trace_id"), r.get("started_at"), view_days)}
            for r in load_runs([evaluation_id]).get(evaluation_id, [])]


def _annotation_rows(attempt_id: str, evaluation_ids: dict[str, str]) -> list[dict[str, Any]]:
    """Lỗi đánh dấu của hai evaluation, gắn nguồn ai|expert theo evaluation_id."""
    rows = db().table("annotations").select(ANNOTATION_FIELDS).eq("attempt_id", attempt_id) \
        .in_("evaluation_id", list(evaluation_ids)).execute().data or []
    return [{**r, "source": evaluation_ids[r["evaluation_id"]]} for r in rows]


def _writing(attempt: dict[str, Any], annotations: list[dict[str, Any]]) -> list[dict[str, Any]]:
    essays = db().table("essays").select("id, section_id, content").eq("attempt_id", attempt["id"]).execute().data or []
    tasks = {t["section_id"]: t for t in db().table("writing_tasks").select("section_id, task_type, task_prompt")
             .in_("section_id", [e["section_id"] for e in essays]).execute().data or []} if essays else {}
    out = []
    for essay in essays:
        task = tasks.get(essay["section_id"])
        if not task:
            continue
        marks = [{k: a[k] for k in ("source", "type", "category", "start_pos", "end_pos", "original_text",
                                    "corrected_text", "explanation")} for a in annotations if a["essay_id"] == essay["id"]]
        out.append({"task_no": 1 if task["task_type"] == "task1" else 2, "task_prompt": task["task_prompt"],
                    "content": essay["content"], "annotations": marks})
    return sorted(out, key=lambda t: t["task_no"])


def _speaking(attempt: dict[str, Any]) -> list[dict[str, Any]]:
    responses = db().table("speaking_responses").select("id, speaking_question_id, section_id, transcript") \
        .eq("attempt_id", attempt["id"]).not_.is_("confirmed_at", "null").execute().data or []
    if not responses:
        return []
    questions = {q["id"]: q for q in db().table("speaking_questions").select("id, order_no, prompt")
                 .in_("id", [r["speaking_question_id"] for r in responses]).execute().data or []}
    sections = {s["id"]: s for s in db().table("sections").select("id, order_no, title")
                .in_("id", list({r["section_id"] for r in responses})).execute().data or []}
    items = [{"part": speaking_part_number(sections[r["section_id"]]), "order_no": questions[r["speaking_question_id"]]["order_no"],
              "question": questions[r["speaking_question_id"]]["prompt"], "transcript": r.get("transcript")}
             for r in responses]
    return [{k: v for k, v in i.items() if k != "order_no"} for i in sorted(items, key=lambda i: (i["part"], i["order_no"]))]


def _expert_block(pair: EvalPair) -> dict[str, Any]:
    reason = expert_reasons([pair.expert["id"]]).get(pair.expert["id"])
    return {"evaluation_id": pair.expert["id"], "overall_band": pair.expert.get("overall_band"),
            "scored_at": pair.expert.get("submitted_at") or pair.expert["created_at"],
            "criteria": _criteria(pair.expert["id"]), "reason": reason, "feedback": pair.expert.get("feedback")}


def case_detail(attempt_id: str, ai_evaluation_id: Optional[str] = None) -> dict[str, Any]:
    pairs = load_pairs(None, only_attempt=attempt_id, ai_evaluation_id=ai_evaluation_id)
    if not pairs:
        raise NotFoundError("Không có cặp điểm AI–Expert cho bài này")
    pair = pairs[0]
    attempt = pair.attempt
    titles = db().table("tests").select("title").eq("id", attempt["test_id"]).execute().data
    annotations = _annotation_rows(attempt_id, {pair.ai["id"]: "ai", pair.expert["id"]: "expert"}) \
        if pair.skill == "writing" else []
    return {
        "attempt": {"id": attempt["id"], "skill": pair.skill, "mode": attempt.get("mode"),
                    "test_title": titles[0]["title"] if titles else None, "submitted_at": attempt.get("submitted_at")},
        "ai_evaluations": _ai_evaluations(attempt_id),
        "ai": {"evaluation_id": pair.ai["id"], "overall_band": pair.ai.get("overall_band"),
               "criteria": _criteria(pair.ai["id"]), "runs": _ai_runs(pair.ai["id"])},
        "expert": _expert_block(pair),
        "writing": _writing(attempt, annotations) if pair.skill == "writing" else [],
        "speaking": _speaking(attempt) if pair.skill == "speaking" else [],
    }
