"""
Nguồn dữ liệu cho learning profile / dashboard (services/learning_profile/*).
Cung cấp batch readers cho attempts (kèm preliminary_band), tests kèm metadata dạng bài,
điểm tiêu chí (criterion_scores), câu trả lời và cấu hình roadmap từ system_settings.
"""
from typing import Any
from uuid import UUID

from app.db.supabase import db


def _valid_uuids(ids: list[str]) -> list[str]:
    out: list[str] = []
    for raw in ids:
        try:
            out.append(str(UUID(str(raw))))
        except Exception:
            continue
    return out

DEFAULT_ROADMAP_CONFIG: dict[str, int] = {
    "mock_window": 3,
    "practice_window": 5,
    "min_attempts_confidence": 2,
    "recent_exclude_days": 14,
    "recommended_count": 3,
    "tests_per_half_band": 6,
}


def user_attempts(user_id: str) -> list[dict[str, Any]]:
    rows = (
        db()
        .table("attempts")
        .select(
            "id, test_id, skill, mode, status, raw_score, question_count, started_at, submitted_at, "
            "tests(id, title, duration_minutes, difficulty, source_name)"
        )
        .eq("learner_id", user_id)
        .neq("status", "abandoned")
        .order("started_at", desc=True)
        .execute()
        .data
        or []
    )
    bands: dict[str, Any] = {}
    prelims: dict[str, Any] = {}
    if rows:
        res = (
            db()
            .table("attempt_results")
            .select("attempt_id, band, preliminary_band")
            .in_("attempt_id", [r["id"] for r in rows])
            .execute()
        )
        for b in res.data or []:
            bands[b["attempt_id"]] = b.get("band")
            prelims[b["attempt_id"]] = b.get("preliminary_band")
    out: list[dict[str, Any]] = []
    for r in rows:
        t = r.get("tests") or {}
        aid = r["id"]
        out.append(
            {
                **{k: r.get(k) for k in ("id", "test_id", "skill", "mode", "raw_score", "question_count", "started_at", "submitted_at")},
                "status": r["status"],
                "band": float(bands[aid]) if bands.get(aid) is not None else None,
                "preliminary_band": float(prelims[aid]) if prelims.get(aid) is not None else None,
                "tests": {
                    "id": t.get("id"),
                    "title": t.get("title"),
                    "duration_min": t.get("duration_minutes"),
                    "difficulty": t.get("difficulty") or "medium",
                    "source_name": t.get("source_name") or "",
                },
            }
        )
    return out


def published_tests() -> list[dict[str, Any]]:
    rows = (
        db()
        .table("tests")
        .select("id, title, skill, duration_minutes, difficulty, source_name, allowed_mode")
        .eq("status", "published")
        .execute()
        .data
        or []
    )
    test_ids = [r["id"] for r in rows]
    qtypes_by_test: dict[str, set[str]] = {tid: set() for tid in test_ids}
    task_types_by_test: dict[str, set[str]] = {tid: set() for tid in test_ids}

    if test_ids:
        secs = db().table("sections").select("id, test_id, kind").in_("test_id", test_ids).execute().data or []
        sec_to_test = {s["id"]: s["test_id"] for s in secs}
        lr_ids = [s["id"] for s in secs if s.get("kind") == "lr"]
        w_ids = [s["id"] for s in secs if s.get("kind") == "writing"]
        if lr_ids:
            qgrps = db().table("question_groups").select("lr_section_id, question_type").in_("lr_section_id", lr_ids).execute().data or []
            for g in qgrps:
                tid = sec_to_test.get(g.get("lr_section_id"))
                if tid and g.get("question_type"):
                    qtypes_by_test[tid].add(g["question_type"])
        if w_ids:
            wt = db().table("writing_tasks").select("section_id, task_type, prompt_category").in_("section_id", w_ids).execute().data or []
            for w in wt:
                tid = sec_to_test.get(w.get("section_id"))
                if tid and w.get("task_type"):
                    task_types_by_test[tid].add(w["task_type"])

    return [
        {
            "id": r["id"],
            "title": r["title"],
            "skill": r["skill"],
            "duration_min": r.get("duration_minutes"),
            "difficulty": r.get("difficulty") or "medium",
            "source_name": r.get("source_name") or "",
            "allowed_mode": r.get("allowed_mode") or "both",
            "question_types": sorted(qtypes_by_test.get(r["id"], set())),
            "task_types": sorted(task_types_by_test.get(r["id"], set())),
        }
        for r in rows
    ]


def learner_goal_row(user_id: str) -> dict[str, Any]:
    if not _valid_uuids([user_id]):
        return {}
    rows = db().table("learner_profiles").select(
        "input_band, target_overall, target_listening, target_reading, target_writing, target_speaking, test_date"
    ).eq("user_id", user_id).execute().data
    return rows[0] if rows else {}


def answers_with_types(attempt_ids: list[str]) -> list[dict[str, Any]]:
    valid_ids = _valid_uuids(attempt_ids)
    if not valid_ids:
        return []
    rows = db().table("answers").select(
        "attempt_id, question_id, is_correct, questions(question_groups(question_type, subtype))"
    ).in_("attempt_id", valid_ids).execute().data or []
    return [
        {
            "attempt_id": r["attempt_id"], "question_id": r["question_id"], "is_correct": r["is_correct"],
            "question_type": ((r.get("questions") or {}).get("question_groups") or {}).get("question_type") or "other",
            "question_subtype": ((r.get("questions") or {}).get("question_groups") or {}).get("subtype") or "",
        }
        for r in rows
    ]


def user_criterion_scores(attempt_ids: list[str]) -> list[dict[str, Any]]:
    valid_ids = _valid_uuids(attempt_ids)
    if not valid_ids:
        return []
    evals = db().table("evaluations").select("id, attempt_id, skill, evaluator_type, is_official, submitted_at, created_at").in_("attempt_id", valid_ids).eq("status", "done").execute().data or []
    if not evals:
        return []
    chosen: dict[str, dict[str, Any]] = {}
    for ev in evals:
        aid = ev["attempt_id"]
        if aid not in chosen or ev.get("is_official"):
            chosen[aid] = ev
    ev_by_id = {ev["id"]: ev for ev in chosen.values()}
    scores = db().table("criterion_scores").select("evaluation_id, band, task_no, criteria(code, name)").in_("evaluation_id", list(ev_by_id.keys())).execute().data or []
    out: list[dict[str, Any]] = []
    for s in scores:
        ev = ev_by_id.get(s.get("evaluation_id"), {})
        crit = s.get("criteria") or {}
        if not crit.get("code") or s.get("band") is None:
            continue
        out.append({
            "attempt_id": ev.get("attempt_id"), "skill": ev.get("skill"),
            "code": crit["code"], "name": crit.get("name") or crit["code"],
            "band": float(s["band"]), "task_no": s.get("task_no") or 0,
            "is_official": bool(ev.get("is_official")), "date": ev.get("submitted_at") or ev.get("created_at") or "",
        })
    return out


def get_roadmap_config() -> dict[str, int]:
    rows = db().table("system_settings").select("value").eq("key", "roadmap_config").execute().data or []
    cfg = dict(DEFAULT_ROADMAP_CONFIG)
    if rows and isinstance(rows[0].get("value"), dict):
        for k, v in rows[0]["value"].items():
            if k in cfg and isinstance(v, (int, float)) and v > 0:
                cfg[k] = int(v)
    return cfg
