"""
Nộp và chấm Listening/Reading (SD-04): chấm ngay trong request.

- Section được chấm: các part đã chọn (req.parts theo order_no), mặc định cả đề.
- Mọi câu trong các section đó được lưu vào answers (câu bỏ trống = sai).
- Band quy đổi từ `band_conversions`: đề < 40 câu được quy đổi tỷ lệ sang thang 40 (`round(raw * 40 / count)`).
- Nộp lần 2 trả lại kết quả lần đầu (SD-04: double submission returns the first result).
"""
from typing import Any, Optional

from app.core.domain_errors import InvalidRequestError, NotFoundError

from app.services.listening_reading.lr_answer_matching import (
    is_correct,
    multiselect_match_count,
    parse_selected_keys,
)
from app.services.listening_reading.lr_test_content import (
    load_lr_question_keys,
    load_lr_test,
    lr_part,
)
from app.db.supabase import db
from app.services.practice.practice_attempt_lifecycle import ensure_can_submit, require_submitted


def _invalidate_profile(learner_id: Any) -> None:
    if not learner_id:
        return
    try:
        from app.services.learning_profile.common import invalidate_user_profile_cache
        invalidate_user_profile_cache(str(learner_id))
    except Exception:
        pass


def lookup_band(skill: str, raw_score: int) -> Optional[float]:
    rows = db().table("band_conversions").select("band").eq("skill", skill) \
        .lte("raw_min", raw_score).gte("raw_max", raw_score).limit(1).execute().data
    return float(rows[0]["band"]) if rows else None


def _result(attempt: dict[str, Any], time_spent: Optional[int] = None) -> dict[str, Any]:
    return {
        "attempt_id": attempt["id"], "test_id": attempt["test_id"], "skill": attempt["skill"],
        "raw_score": attempt.get("raw_score") or 0, "total_questions": attempt.get("question_count") or 0,
        "band": float(attempt["lr_band"]) if attempt.get("lr_band") is not None else None,
        "time_spent_sec": time_spent, "submitted_at": attempt.get("submitted_at"),
    }


def grade_lr_sections(
    sections: list[dict[str, Any]],
    answers: dict[str, Any],
    keys: dict[str, list[Any]],
) -> tuple[list[dict[str, Any]], int, int]:
    """Chấm mọi câu hỏi trong các section đã chọn; trả (answer_rows, raw_score, question_count)."""
    rows: list[dict[str, Any]] = []
    raw = 0
    for s in sections:
        section_id = s["id"]
        for group in lr_part(s).get("question_groups") or []:
            group_opts = group.get("group_options") or []
            g_questions = sorted(group.get("questions") or [], key=lambda q: q["number"])
            sel_count = group.get("select_count") or 0

            if sel_count > 1 and len(g_questions) == sel_count:
                seen_ref: set[str] = set()
                ref_keys: list[Any] = []
                for q_item in g_questions:
                    for ans_item in (keys.get(q_item["id"]) or []):
                        norm_item = str(ans_item).strip().lower()
                        if norm_item and norm_item not in seen_ref:
                            seen_ref.add(norm_item)
                            ref_keys.append(ans_item)
                opts = list(group_opts)
                seen_opt_keys: set[str] = {
                    str(o.get("label") or o.get("key") or "").strip().lower() for o in opts
                }
                for q_item in g_questions:
                    for q_opt in (q_item.get("question_options") or []):
                        lbl = str(q_opt.get("label") or q_opt.get("key") or "").strip().lower()
                        if lbl not in seen_opt_keys:
                            seen_opt_keys.add(lbl)
                            opts.append(q_opt)
                givens = [answers.get(q["id"], answers.get(str(q["number"]))) for q in g_questions]
                parsed_rows = [parse_selected_keys(v, opts) for v in givens]
                per_row_valid = all(
                    len(pk) <= sel_count for pk, v in zip(parsed_rows, givens) if v is not None
                )
                combined_tokens: list[Any] = []
                for v in givens:
                    if isinstance(v, (list, tuple, set)):
                        combined_tokens.extend(v)
                    elif v is not None and str(v).strip():
                        combined_tokens.append(v)
                matched, _ = (
                    multiselect_match_count(combined_tokens, ref_keys, sel_count, opts)
                    if per_row_valid and combined_tokens
                    else (0, sel_count)
                )
                target_keys = parse_selected_keys(ref_keys, opts)
                single_per_row = all(len(pk) == 1 for pk in parsed_rows if pk)
                used_target: set[str] = set()
                for idx, q in enumerate(g_questions):
                    given = givens[idx]
                    text = ",".join(map(str, given)) if isinstance(given, list) else (str(given) if given is not None else None)
                    if single_per_row and per_row_valid and matched > 0:
                        row_key = next(iter(parsed_rows[idx]), "")
                        ok = bool(row_key and row_key in target_keys and row_key not in used_target)
                        if ok:
                            used_target.add(row_key)
                    else:
                        ok = idx < matched
                    raw += int(ok)
                    rows.append({"question_id": q["id"], "section_id": section_id, "answer": text, "is_correct": ok})
                continue

            for q in g_questions:
                given = answers.get(q["id"], answers.get(str(q["number"])))
                text = ",".join(map(str, given)) if isinstance(given, list) else (str(given) if given is not None else None)
                opts = group_opts + (q.get("question_options") or [])
                ok = is_correct(
                    given,
                    keys.get(q["id"]) or [],
                    group.get("max_words"),
                    options=opts,
                    select_count=sel_count,
                )
                raw += int(ok)
                rows.append({"question_id": q["id"], "section_id": section_id, "answer": text, "is_correct": ok})

    return rows, raw, len(rows)


def compute_proportional_band(skill: str, raw_score: int, question_count: int) -> Optional[float]:
    if question_count <= 0:
        return None
    scaled_raw = min(40, max(0, round(raw_score * 40 / question_count)))
    return lookup_band(skill, scaled_raw)


def submit_lr(attempt: dict[str, Any], answers: dict[str, Any], parts: Optional[list[int]],
              time_spent: Optional[int] = None) -> dict[str, Any]:
    if attempt["status"] == "scored":
        return _result(attempt, time_spent)
    test = load_lr_test(attempt["test_id"])
    if not test:
        raise NotFoundError("Bài thi không tồn tại")
    sections = [s for s in test.get("sections") or [] if not parts or s["order_no"] in parts]
    if not sections:
        raise InvalidRequestError("Không có phần thi nào được chọn")

    ensure_can_submit(attempt)
    qids = [q["id"] for s in sections for g in (lr_part(s).get("question_groups") or [])
            for q in g.get("questions") or []]
    key_rows = load_lr_question_keys(qids)
    keys = {qid: row.get("accepted_answers") or [] for qid, row in key_rows.items()}

    rows, raw, count = grade_lr_sections(sections, answers, keys)
    band = compute_proportional_band(attempt["skill"], raw, count)
    updated = require_submitted(db().rpc("submit_lr_attempt", {
        "p_attempt_id": attempt["id"], "p_section_ids": [s["id"] for s in sections], "p_answers": rows,
        "p_raw_score": raw, "p_question_count": count, "p_band": band,
    }).execute().data)
    _invalidate_profile(attempt.get("learner_id"))
    return _result(updated, time_spent)
