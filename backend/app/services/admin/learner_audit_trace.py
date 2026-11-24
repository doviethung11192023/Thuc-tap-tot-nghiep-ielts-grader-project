"""Hồ Sơ Minh Chứng Trắng 360° (White-Box Mathematical & Data Audit) cho từng Học viên."""
from datetime import datetime, timedelta, timezone
from time import perf_counter
from typing import Any, Dict, List
from app.core.domain_errors import NotFoundError
from app.db.supabase import db
from app.services.learning_profile.common import (
    compute_daily_active_minutes,
    get_all_published_tests,
    get_from_cache,
    get_learner_goal,
    get_roadmap_config_cached,
    get_user_answers_cached,
    get_user_attempts,
    round_to_ielts_band,
    set_to_cache,
)
from app.services.learning_profile.overview_aggregator import compute_learning_profile_overview
from app.services.learning_profile.practice_aggregator import compute_learning_profile_test_practice
from app.services.learning_profile.roadmap_matcher import score_candidate_tests

VN_TZ = timezone(timedelta(hours=7))


def _fmt_vn(ts: Any) -> str:
    if not ts:
        return "-"
    try:
        dt = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
        return (dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt).astimezone(VN_TZ).strftime("%d/%m/%Y %H:%M")
    except Exception:
        return str(ts)[:16]


def _build_br12_proof(attempts: List[Dict[str, Any]], goal: Dict[str, Any], diag: Dict[str, Any], cfg: Dict[str, int]) -> Dict[str, Any]:
    skills_proof: List[Dict[str, Any]] = []
    for sk in ("listening", "reading", "writing", "speaking"):
        d = diag[sk]
        sk_all = [a for a in attempts if str(a.get("skill", "")).lower() == sk]
        scored = [a for a in sk_all if a.get("status") == "scored" and a.get("band") is not None and float(a["band"]) > 0]
        mocks = [a for a in scored if a.get("mode") in ("mock", "exam") and (sk in ("writing", "speaking") or (a.get("question_count") or 40) >= 30)]

        if mocks:
            used = mocks[: cfg["mock_window"]]
            rule = f"Nhánh 1 (Chuẩn Mock): Trung bình {len(used)}/{cfg['mock_window']} bài Thi thử gần nhất"
            vals = [float(a["band"]) for a in used]
            formula = f"({' + '.join(f'{v:.1f}' for v in vals)}) / {len(vals)} = {sum(vals)/len(vals):.2f} → {d['current_band']:.1f}"
        elif len(scored) >= cfg["min_attempts_confidence"]:
            used = scored[: cfg["practice_window"]]
            rule = f"Nhánh 2 (Luyện tập): Trung bình {len(used)}/{cfg['practice_window']} bài Practice có điểm > 0"
            vals = [float(a["band"]) for a in used]
            formula = f"({' + '.join(f'{v:.1f}' for v in vals)}) / {len(vals)} = {sum(vals)/len(vals):.2f} → {d['current_band']:.1f}"
        else:
            used = []
            rule = f"Nhánh 3 (Chẩn đoán): Có {len(scored)} < {cfg['min_attempts_confidence']} bài đạt ngưỡng → Neo theo Input Band"
            formula = f"Neo Input Band = {float(goal['input_band']):.1f}"

        used_ids = {a["id"] for a in used}
        excluded = [
            {
                "id": a["id"],
                "title": (a.get("tests") or {}).get("title") or sk.capitalize(),
                "status": a.get("status"),
                "band": a.get("band"),
                "reason": "Đang chờ Expert" if a.get("status") == "waiting_expert" else ("Nộp trắng / 0.0" if (a.get("band") == 0 or a.get("status") != "scored") else "Ngoài cửa sổ gần nhất"),
            }
            for a in sk_all[:8]
            if a["id"] not in used_ids
        ]
        skills_proof.append({
            "skill": sk.capitalize(), "rule_applied": rule, "formula": formula,
            "current_band": d["current_band"], "target_band": d["target_band"], "gap": d["gap"],
            "included_attempts": [{"id": a["id"], "title": (a.get("tests") or {}).get("title") or sk, "mode": a.get("mode"), "band": a.get("band"), "date": _fmt_vn(a.get("submitted_at") or a.get("started_at"))} for a in used],
            "excluded_attempts": excluded[:5],
        })
    vals_4 = [diag[sk]["current_band"] for sk in ("listening", "reading", "writing", "speaking")]
    overall_avg = sum(vals_4) / 4.0
    return {
        "overall_formula": f"({' + '.join(f'{v:.1f}' for v in vals_4)}) / 4 = {overall_avg:.2f} → Làm tròn BR-02: {round_to_ielts_band(overall_avg):.1f}",
        "skills": skills_proof,
    }


def _build_ewma_and_utility(
    user_id: str,
    attempts: List[Dict[str, Any]],
    overview: Dict[str, Any],
    practice: Dict[str, Any],
    cfg: Dict[str, int],
) -> Dict[str, Any]:
    roadmap = overview["roadmap"]
    pskill = roadmap["priority_skill"]
    p_diag = overview["skill_diagnostics"][pskill]
    sk_atts = [a for a in attempts if str(a.get("skill", "")).lower() == pskill and a.get("status") in ("scored", "waiting_expert")][:8]
    att_rank = {a["id"]: idx for idx, a in enumerate(sk_atts)}
    ewma_rows: List[Dict[str, Any]] = []

    if pskill in ("listening", "reading"):
        scored_ids = [a["id"] for a in attempts if a.get("status") == "scored"]
        answers = [x for x in get_user_answers_cached(user_id, scored_ids) if x.get("attempt_id") in att_rank]
        grouped: Dict[str, Dict[int, List[float]]] = {}
        for ans in answers:
            grouped.setdefault(ans.get("question_type") or "other", {}).setdefault(att_rank[ans["attempt_id"]], []).append(1.0 if ans.get("is_correct") else 0.0)
        for qt, per_att in grouped.items():
            ranks = sorted(per_att.keys())
            w_sum = sum(0.7 ** idx for idx in range(len(ranks)))
            v_sum = sum((0.7 ** idx) * (sum(per_att[r]) / len(per_att[r])) for idx, r in enumerate(ranks))
            ewma_rows.append({"item": qt.replace("_", " ").title(), "raw_key": qt, "sample_count": sum(len(v) for v in per_att.values()), "ewma_value": f"{round((v_sum / w_sum) * 100)}%"})
    else:
        for c in (practice.get("criterion_mastery") or {}).get(pskill, []):
            ewma_rows.append({"item": f"{c['code']} - {c['name']}", "raw_key": c["code"], "sample_count": c["sample_count"], "ewma_value": f"Band {c['average_band']:.1f}", "_band": float(c["average_band"])})

    weak_key = "diagnostic"
    if ewma_rows and pskill in ("listening", "reading"):
        ewma_rows.sort(key=lambda r: int(r["ewma_value"].rstrip("%")))
        weak_key = ewma_rows[0]["raw_key"]
    elif ewma_rows:
        sampled = [r for r in ewma_rows if int(r.get("sample_count") or 0) > 0]
        if sampled:
            sampled.sort(key=lambda r: r.get("_band", 9.0))
            weak_key = sampled[0]["raw_key"]
        for r in ewma_rows:
            r.pop("_band", None)

    pool = score_candidate_tests(
        pskill, p_diag["current_band"], p_diag["target_band"], weak_key,
        weak_key == "diagnostic", roadmap["weekly_pacing"]["days_remaining"],
        attempts, get_all_published_tests(), cfg,
    )
    selected_ids = {t["id"]: t["slot_label"] for t in roadmap.get("recommended_tests", [])}
    utility_table = [
        {
            "id": p["test"]["id"], "title": p["test"]["title"], "difficulty": p["test"]["difficulty"],
            "is_micro": p["is_micro"], "days_ago": p["days_ago"],
            "w_cov": p["weakness_cov"], "w_zpd": p["zpd_fit"], "w_sr": p["spaced_rep"], "w_phase": p["format_fit"],
            "total_score": p["score"], "selected_slot": selected_ids.get(p["test"]["id"], "-"),
        }
        for p in pool[:10]
    ]
    return {"ewma_rows": ewma_rows, "utility_table": utility_table, "question_type_report": practice.get("question_type_report", [])}


def get_learner_whitebox_audit(user_id: str) -> Dict[str, Any]:
    """Xuất Hồ sơ Minh chứng Trắng 5 phần khớp 100% với số liệu trang Học viên."""
    t0 = perf_counter()
    cache_key = f"audit_{user_id}"
    cached = get_from_cache(cache_key)
    if cached is not None:
        return {**cached, "cache_hit": True, "elapsed_ms": round((perf_counter() - t0) * 1000, 1)}

    prof = db().table("profiles").select("id, email, full_name, role, created_at").eq("id", user_id).execute().data
    if not prof:
        raise NotFoundError("Không tìm thấy học viên")

    overview = compute_learning_profile_overview(user_id)
    practice = compute_learning_profile_test_practice(user_id)
    attempts = get_user_attempts(user_id)
    goal = get_learner_goal(user_id)
    cfg = get_roadmap_config_cached()
    daily_mins = compute_daily_active_minutes(attempts)

    br12_proof = _build_br12_proof(attempts, goal, overview["skill_diagnostics"], cfg)
    algo_proof = _build_ewma_and_utility(user_id, attempts, overview, practice, cfg)
    daily_sessions = [{"date": d, "minutes": m, "hours": round(m / 60.0, 2)} for d, m in sorted(daily_mins.items(), reverse=True)[:14]]
    ledger = [
        {
            "id": a["id"], "title": (a.get("tests") or {}).get("title") or a["skill"],
            "skill": a["skill"], "mode": a["mode"], "status": a["status"],
            "raw_score": a.get("raw_score"), "question_count": a.get("question_count"),
            "band": a.get("band"), "preliminary_band": a.get("preliminary_band"),
            "submitted_vn": _fmt_vn(a.get("submitted_at") or a.get("started_at")),
        }
        for a in attempts[:25]
    ]
    payload = {
        "learner": prof[0],
        "overview_snapshot": {"goals": overview["goals"], "roadmap": overview["roadmap"], "monthly_scorecard": overview.get("monthly_scorecard")},
        "audit_sections": {
            "br12_band_proof": br12_proof,
            "ewma_weakness_proof": algo_proof["ewma_rows"],
            "utility_match_score_proof": algo_proof["utility_table"],
            "question_type_report": algo_proof["question_type_report"],
            "monthly_progression": overview.get("monthly_progression", []),
            "daily_session_clusters": daily_sessions,
            "criterion_mastery": practice.get("criterion_mastery", {}),
            "raw_attempts_ledger": ledger,
        },
        "config_used": cfg,
    }
    set_to_cache(cache_key, payload, ttl_seconds=60)
    return {**payload, "cache_hit": False, "elapsed_ms": round((perf_counter() - t0) * 1000, 1)}
