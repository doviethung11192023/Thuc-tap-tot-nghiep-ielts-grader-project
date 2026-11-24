"""
Kết quả Writing cho trang tổng kết và trang chi tiết essay:
- GET /test-practice/attempts/{id}/summary  (WritingSummaryResult, useWritingAttemptSummary)
- GET /essays/{essay_id}/results            (trang /results/{essayId}, lib/adapters.ts)
"""
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Optional

from app.db.supabase import db
from app.services.writing.writing_bands import task_band
from app.services.writing.writing_task_materials import approved_sample
from app.services.writing.writing_test_content import chart_image_url

RUN_TO_ESSAY_STATUS = {"running": "evaluating", "done": "completed", "failed": "failed"}
CODE_TO_SCORE_KEY = {
    "TA": "task_response",
    "TR": "task_response",
    "CC": "coherence_cohesion",
    "LR": "lexical_resource",
    "GRA": "grammatical_range_and_accuracy",
}
_ESSAY_SELECT = (
    "id, attempt_id, section_id, content, word_count, updated_at, "
    "writing_tasks(task_type, prompt_category, task_prompt, chart_image_key, min_words)"
)


def _load_evaluations(attempt_id: str) -> tuple[Optional[dict[str, Any]], Optional[dict[str, Any]]]:
    """Trả về (evaluation đang áp dụng [official > AI mới nhất], evaluation AI mới nhất)."""
    rows = db().table("evaluations") \
        .select("id, status, overall_band, feedback, is_official, evaluator_type, created_at") \
        .eq("attempt_id", attempt_id).order("created_at", desc=True).execute().data or []
    official = next((e for e in rows if e.get("is_official")), None)
    ai_eval = next((e for e in rows if e.get("evaluator_type") == "ai"), None)
    return (official or ai_eval), ai_eval


def _review_request_meta(attempt_id: str) -> tuple[Optional[str], Optional[str]]:
    """Trả về (expert_review_status, due_at mở hiện tại nếu có)."""
    try:
        reqs = db().table("review_requests").select("id, status").eq("attempt_id", attempt_id).limit(1).execute().data or []
        if not reqs:
            return None, None
        req = reqs[0]
        due_at = None
        if req.get("status") in ("waiting", "assigned"):
            asgns = (
                db().table("review_assignments")
                .select("due_at, ended_at")
                .eq("attempt_id", attempt_id)
                .is_("ended_at", "null")
                .limit(1)
                .execute()
                .data
                or []
            )
            due_at = asgns[0].get("due_at") if asgns else None
        return req.get("status"), due_at
    except Exception:
        return None, None


def _task_scores_and_comments(
    evaluation_id: str,
) -> tuple[dict[int, dict[str, float]], dict[int, dict[str, str]]]:
    rows = db().table("criterion_scores").select("task_no, band, comment, criteria(code)") \
        .eq("evaluation_id", evaluation_id).execute().data or []
    scores: dict[int, dict[str, float]] = {}
    comments: dict[int, dict[str, str]] = {}
    for r in rows:
        code = (r.get("criteria") or {}).get("code")
        key = CODE_TO_SCORE_KEY.get(code or "")
        if not key:
            continue
        tno = r.get("task_no") or 1
        scores.setdefault(tno, {})[key] = float(r["band"])
        if isinstance(r.get("comment"), str) and r["comment"].strip():
            comments.setdefault(tno, {})[key] = r["comment"].strip()
    for sc in scores.values():
        if len(sc) == 4:
            sc["overall_band"] = task_band(list(sc.values()))
    return scores, comments


def _runs(evaluation_id: str) -> dict[int, dict[str, Any]]:
    rows = db().table("grading_runs").select("task_no, status, output, finished_at") \
        .eq("evaluation_id", evaluation_id).order("started_at").execute().data or []
    return {r["task_no"]: r for r in rows}


def _feedback(output: dict, key: str, limit: int = 2) -> list[str]:
    items = []
    for crit in (output.get("criteria_analysis") or {}).values():
        crit = crit or {}
        source = crit.get("feedback") if isinstance(crit.get("feedback"), dict) else crit
        items += [s.strip() for s in source.get(key) or [] if isinstance(s, str) and s.strip()]
    return items[:limit]


def _resolve_status(current: Optional[dict[str, Any]], run: dict[str, Any], scores: dict[str, float]) -> str:
    if current and current.get("evaluator_type") == "expert":
        if current.get("status") == "done" and len(scores) >= 4:
            return "completed"
        if current.get("status") == "failed":
            return "failed"
    if run.get("status") in RUN_TO_ESSAY_STATUS:
        return RUN_TO_ESSAY_STATUS[run["status"]]
    if current and current.get("status") == "done" and len(scores) >= 4:
        return "completed"
    if current and current.get("status") == "failed":
        return "failed"
    return "pending"


def _essays_with_task(attempt_id: str) -> list[dict[str, Any]]:
    rows = db().table("essays").select(_ESSAY_SELECT).eq("attempt_id", attempt_id).execute().data or []
    for e in rows:
        e["task_no"] = 1 if (e.get("writing_tasks") or {}).get("task_type") == "task1" else 2
    # Giữ cả task bỏ trống: essays chỉ có task trong phạm vi bài, task trống hiện "Chưa làm" và tính band 0 (BR-04)
    return sorted(rows, key=lambda e: e["task_no"])


def _build_criteria_analysis(raw: dict[str, Any], comments: dict[str, str], is_expert: bool) -> dict[str, Any]:
    alias_pairs = [
        ("task_response", ("task_response", "task_achievement")),
        ("coherence_cohesion", ("coherence_cohesion",)),
        ("lexical_resource", ("lexical_resource",)),
        ("grammar_accuracy", ("grammatical_range_and_accuracy", "grammar_accuracy")),
    ]
    out: dict[str, Any] = dict(raw)
    for target_key, candidates in alias_pairs:
        base = next((dict(raw[c]) for c in candidates if isinstance(raw.get(c), dict)), {})
        comment_key = "grammatical_range_and_accuracy" if target_key == "grammar_accuracy" else target_key
        expert_note = comments.get(comment_key)
        if expert_note and is_expert:
            sub = dict(base.get("sub_criteria") or {})
            sub["Nhận xét chính thức của Chuyên gia"] = expert_note
            base["sub_criteria"] = sub
        out[target_key] = base
    return out


def build_attempt_summary(attempt: dict[str, Any]) -> dict[str, Any]:
    test = db().table("tests").select("title").eq("id", attempt["test_id"]).execute().data
    current, ai_eval = _load_evaluations(attempt["id"])
    scores_map, comments_map = _task_scores_and_comments(current["id"]) if current else ({}, {})
    cur_runs = _runs(current["id"]) if current else {}
    ai_runs = _runs(ai_eval["id"]) if ai_eval and (not current or ai_eval["id"] != current["id"]) else {}
    is_expert = bool(current and current.get("evaluator_type") == "expert")
    tasks = []
    for e in _essays_with_task(attempt["id"]):
        tno = e["task_no"]
        wt = e.get("writing_tasks") or {}
        run = cur_runs.get(tno) or ai_runs.get(tno) or {}
        output = run.get("output") or {}
        tscores = scores_map.get(tno) or {}
        status = _resolve_status(current, run, tscores)
        if not run and not (e.get("word_count") or 0) and status == "pending":
            status = "not_attempted"     # task không có lượt chấm và không có chữ: Learner bỏ trống, không phải đang chờ chấm
        strengths = _feedback(output, "strengths")
        tasks.append({
            "task": f"task{tno}", "task_no": tno, "essay_id": e["id"], "status": status,
            "word_count": e.get("word_count") or 0, "content": e.get("content") or "",
            "task_prompt": wt.get("task_prompt") or "",
            "chart_image_url": chart_image_url(wt.get("chart_image_key")),
            "prompt_category": wt.get("prompt_category"),
            "min_words": wt.get("min_words") or (150 if tno == 1 else 250),
            "scores": tscores if status == "completed" else None,
            "task_subtype": output.get("task_subtype"),
            "strengths": strengths, "areas_to_improve": _feedback(output, "areas_to_improve"),
        })
    done = bool(tasks) and current is not None and current["status"] in ("done", "failed")
    eval_type = (current or {}).get("evaluator_type")
    expert_fb = (current or {}).get("feedback") if is_expert else None
    rev_status, rev_due_at = _review_request_meta(attempt["id"])
    ai_scores_map = (
        _task_scores_and_comments(ai_eval["id"])[0]
        if ai_eval and (not current or ai_eval["id"] != current["id"]) and ai_eval.get("status") == "done"
        else scores_map
    )
    ai_eval_payload = (
        {
            "overall_band": float(ai_eval["overall_band"]),
            "tasks": ai_scores_map,
            "created_at": ai_eval.get("created_at"),
        }
        if ai_eval and ai_eval.get("status") == "done" and ai_eval.get("overall_band") is not None
        else None
    )
    expert_eval_payload = (
        {
            "overall_band": float(current["overall_band"]),
            "feedback": current.get("feedback"),
            "tasks": scores_map,
            "created_at": current.get("created_at"),
        }
        if is_expert and current and current.get("status") == "done" and current.get("overall_band") is not None
        else None
    )
    return {
        "attempt_id": attempt["id"], "test_id": attempt["test_id"],
        "title": (test[0]["title"] if test else None) or "IELTS Practice Test",
        "skill": "writing", "mode": attempt["mode"], "status": attempt["status"],
        "overall_band": float((current or {}).get("overall_band") or 0.0) if done else 0.0,
        "correct_count": 0, "total_questions": 0,
        "submitted_at": attempt.get("submitted_at") or attempt.get("started_at"),
        "task_formats_result": [], "evaluator_type": eval_type,
        "evaluation_status": (current or {}).get("status"), "expert_feedback": expert_fb,
        "expert_review_status": rev_status, "expert_review_due_at": rev_due_at,
        "ai_evaluation": ai_eval_payload, "expert_review": expert_eval_payload,
        "writing": {"grading_done": done, "evaluator_type": eval_type, "expert_feedback": expert_fb, "tasks": tasks},
    }


def build_essay_result(essay_id: str, user_id: str, is_admin: bool) -> Optional[dict[str, Any]]:
    """None khi không có essay hoặc người xem không phải chủ (API trả 404)."""
    rows = db().table("essays").select(_ESSAY_SELECT).eq("id", essay_id).execute().data
    if not rows:
        return None
    essay = rows[0]
    attempt_id = essay["attempt_id"]
    with ThreadPoolExecutor(max_workers=4) as pool:
        f_owner = pool.submit(
            lambda: db().table("attempts").select("learner_id, test_id, tests(title)").eq("id", attempt_id).execute().data
        )
        f_evals = pool.submit(_load_evaluations, attempt_id)
        f_siblings = pool.submit(_essays_with_task, attempt_id)
        owner = f_owner.result()
        if not is_admin and (not owner or str(owner[0]["learner_id"]) != str(user_id)):
            return None
        current, ai_eval = f_evals.result()
        sibling_rows = f_siblings.result()

        att = owner[0] if owner else {}
        wt = essay.get("writing_tasks") or {}
        task_type = wt.get("task_type") or "task2"
        task_no = 1 if task_type == "task1" else 2

        f_scores = pool.submit(_task_scores_and_comments, current["id"]) if current else None
        f_cur_runs = pool.submit(_runs, current["id"]) if current else None
        f_ai_runs = (
            pool.submit(_runs, ai_eval["id"])
            if ai_eval and (not current or ai_eval["id"] != current["id"])
            else None
        )
        f_anns = (
            pool.submit(
                lambda: db().table("annotations").select("*").eq("evaluation_id", current["id"])
                .eq("essay_id", essay_id).order("start_pos").execute().data or []
            )
            if current
            else None
        )
        scores_map, comments_map = f_scores.result() if f_scores else ({}, {})
        cur_runs = f_cur_runs.result() if f_cur_runs else {}
        ai_runs = f_ai_runs.result() if f_ai_runs else {}
        ann_rows = f_anns.result() if f_anns else []

    scores = scores_map.get(task_no) or {}
    run = cur_runs.get(task_no) or ai_runs.get(task_no) or {}
    status = _resolve_status(current, run, scores)
    is_expert = bool(current and current.get("evaluator_type") == "expert")
    result, annotations = None, []
    if status == "completed" and len(scores) >= 4:
        output = run.get("output") or {}
        ai_scores_for_task = (
            (_task_scores_and_comments(ai_eval["id"])[0].get(task_no) or {})
            if is_expert and ai_eval and ai_eval.get("status") == "done" and ai_eval["id"] != (current or {}).get("id")
            else scores
        )
        ai_side = (
            {
                "overall_band": ai_scores_for_task.get("overall_band") or float(ai_eval.get("overall_band") or 0.0),
                "task_response_score": ai_scores_for_task.get("task_response", 0.0),
                "coherence_cohesion_score": ai_scores_for_task.get("coherence_cohesion", 0.0),
                "lexical_resource_score": ai_scores_for_task.get("lexical_resource", 0.0),
                "grammar_accuracy_score": ai_scores_for_task.get("grammatical_range_and_accuracy", 0.0),
            }
            if ai_eval and ai_eval.get("status") == "done" and (len(ai_scores_for_task) >= 4 or ai_eval.get("overall_band") is not None)
            else None
        )
        expert_side = (
            {
                "overall_band": scores.get("overall_band") or float((current or {}).get("overall_band") or 0.0),
                "task_response_score": scores.get("task_response", 0.0),
                "coherence_cohesion_score": scores.get("coherence_cohesion", 0.0),
                "lexical_resource_score": scores.get("lexical_resource", 0.0),
                "grammar_accuracy_score": scores.get("grammatical_range_and_accuracy", 0.0),
                "feedback": (current or {}).get("feedback"),
            }
            if is_expert and current and current.get("status") == "done"
            else None
        )
        result = {
            "overall_band": scores.get("overall_band") or float((current or {}).get("overall_band") or 0.0),
            "task_response_score": scores.get("task_response", 0.0),
            "coherence_cohesion_score": scores.get("coherence_cohesion", 0.0),
            "lexical_resource_score": scores.get("lexical_resource", 0.0),
            "grammar_accuracy_score": scores.get("grammatical_range_and_accuracy", 0.0),
            "overall_upgraded_essay": output.get("overall_upgraded_essay"),
            "criteria_analysis": _build_criteria_analysis(output.get("criteria_analysis") or {}, comments_map.get(task_no, {}), is_expert),
            "is_score_overridden": is_expert,
            "evaluator_type": (current or {}).get("evaluator_type") or "ai",
            "expert_feedback": (current or {}).get("feedback") if is_expert else None,
            "ai_evaluation": ai_side,
            "expert_review": expert_side,
            # spec 006: bài mẫu đã duyệt, danh sách ý chính (Task 1 có đáp án), nguồn số liệu biểu đồ
            "sample_essay": approved_sample(essay["section_id"]) if essay.get("section_id") else None,
            "key_point_check": output.get("key_point_check"),
            "chart_source": output.get("chart_source"),
        }
        annotations = [{
            "id": a["id"], "type": a["type"], "category": "TR" if a["category"] == "TA" else a["category"],
            "title": a.get("title") or "", "original_text": a["original_text"],
            "corrected_text": a.get("corrected_text"), "explanation": a["explanation"], "recommendation": None,
            "position_start": a["start_pos"], "position_end": a["end_pos"],
        } for a in ann_rows]
    siblings = [{"essay_id": s["id"], "task_no": s["task_no"], "task_type": f"task{s['task_no']}", "word_count": s.get("word_count") or 0}
                for s in sibling_rows]
    return {
        "essay": {
            "id": essay["id"], "attempt_id": attempt_id, "test_id": att.get("test_id"),
            "test_title": (att.get("tests") or {}).get("title") or "IELTS Writing Practice",
            "task_no": task_no, "task_type": task_type, "task_prompt": wt.get("task_prompt") or "",
            "chart_image_url": chart_image_url(wt.get("chart_image_key")),
            "prompt_category": wt.get("prompt_category"),
            "min_words": wt.get("min_words") or (150 if task_no == 1 else 250),
            "content": essay["content"], "word_count": essay.get("word_count") or 0,
            "status": status, "evaluated_at": run.get("finished_at") or (current.get("created_at") if current else None),
        },
        "result": result, "inline_annotations": annotations, "sibling_essays": siblings, "trace_info": None,
    }
