"""Engine Lộ trình Cá nhân hóa (BR-12, BR-17, FR-08): Chẩn đoán EWMA, Chặng Band & Nhịp độ Tuần."""
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Tuple
from .common import (
    get_all_published_tests,
    get_roadmap_config_cached,
    get_user_answers_cached,
    get_user_criteria_cached,
    round_to_ielts_band,
    to_vn_date_str,
)
from .roadmap_matcher import resolve_exam_phase, select_smart_practice_trio
from .roadmap_strategies import get_strategy_for_weakness

VN_TZ = timezone(timedelta(hours=7))
SKILLS = ("listening", "reading", "writing", "speaking")


def _ewma_weighted_avg(values_newest_first: List[float], alpha: float = 0.7) -> float:
    if not values_newest_first:
        return 0.0
    w_sum = 0.0
    v_sum = 0.0
    for idx, val in enumerate(values_newest_first):
        w = alpha ** idx
        w_sum += w
        v_sum += w * val
    return v_sum / w_sum if w_sum > 0 else 0.0


def _days_until(test_date_str: str) -> int:
    try:
        target = datetime.fromisoformat(test_date_str[:10]).date()
        return max(1, (target - datetime.now(VN_TZ).date()).days)
    except Exception:
        return 45


def _detect_ewma_weakness(
    user_id: str,
    priority_skill: str,
    attempts: List[Dict[str, Any]],
) -> Tuple[str, str, str]:
    skill_atts = [a for a in attempts if str(a.get("skill", "")).lower() == priority_skill and a.get("status") in ("scored", "waiting_expert")]
    att_ids = [a["id"] for a in skill_atts[:8]]
    att_rank = {aid: i for i, aid in enumerate(att_ids)}

    if priority_skill in ("listening", "reading"):
        scored_ids = [a["id"] for a in attempts if a.get("status") == "scored"]
        answers = [x for x in get_user_answers_cached(user_id, scored_ids) if x.get("attempt_id") in att_rank]
        if not answers:
            return ("diagnostic", priority_skill, "Chưa đủ dữ liệu câu trả lời để xác định dạng bài yếu.")
        by_type_and_att: Dict[str, Dict[int, List[float]]] = {}
        for ans in answers:
            qt = ans.get("question_type") or "other"
            rank = att_rank.get(ans["attempt_id"], 99)
            by_type_and_att.setdefault(qt, {}).setdefault(rank, []).append(1.0 if ans.get("is_correct") else 0.0)
        scored_types = []
        for qt, per_att in by_type_and_att.items():
            total_q = sum(len(v) for v in per_att.values())
            per_att_avgs = [sum(per_att[r]) / len(per_att[r]) for r in sorted(per_att.keys())]
            acc = round(_ewma_weighted_avg(per_att_avgs) * 100)
            scored_types.append((acc, -total_q, qt, total_q))
        scored_types.sort()
        low_acc, _, weak_qt, n_q = scored_types[0]
        return (weak_qt, weak_qt.replace("_", " ").title(), f"Độ chính xác EWMA ở dạng này đạt {low_acc}% qua {n_q} câu gần nhất.")

    crit_rows = [c for c in get_user_criteria_cached(user_id, [a["id"] for a in attempts]) if c.get("attempt_id") in att_rank]
    if not crit_rows:
        return ("diagnostic", priority_skill, "Chưa đủ bài chấm theo tiêu chí (Writing/Speaking).")
    by_code: Dict[str, Dict[int, List[float]]] = {}
    for c in crit_rows:
        by_code.setdefault(c["code"], {}).setdefault(att_rank.get(c["attempt_id"], 99), []).append(float(c["band"]))
    ranked = []
    for code, per_att in by_code.items():
        avgs = [sum(per_att[r]) / len(per_att[r]) for r in sorted(per_att.keys())]
        ranked.append((round(_ewma_weighted_avg(avgs), 2), code))
    ranked.sort()
    low_band, weak_code = ranked[0]
    return (weak_code, weak_code, f"Tiêu chí {weak_code} đang đạt mức trung bình trọng số Band {round_to_ielts_band(low_band):.1f} (thấp nhất trong 4 tiêu chí).")


def _build_milestones(input_band: float, current_band: float, target_band: float, next_test_id: str | None) -> List[Dict[str, Any]]:
    start = min(input_band, current_band)
    end = max(target_band, start + 0.5)
    step = 0.5 if (end - start) <= 1.5 else 1.0
    targets: List[float] = []
    cursor = round_to_ielts_band(start + step)
    while cursor < end - 0.05:
        targets.append(cursor)
        cursor = round_to_ielts_band(cursor + step)
    if not targets or targets[-1] < end:
        targets.append(round_to_ielts_band(end))
    milestones = []
    prev_floor = start
    found_active = False
    for idx, t_val in enumerate(targets[:4]):
        span = max(0.5, t_val - prev_floor)
        pct = min(100, max(0, round(((current_band - prev_floor) / span) * 100)))
        is_active = (not found_active) and pct < 100
        if is_active:
            found_active = True
        milestones.append(
            {
                "id": f"ms-{idx + 1}",
                "band_target": t_val,
                "title": f"Chặng {idx + 1}: {prev_floor:.1f} → {t_val:.1f}",
                "total_cups_earned": 1 if pct >= 100 else 0,
                "max_cups": 1,
                "completed_units": pct,
                "total_units": 100,
                "is_active": is_active or (idx == len(targets[:4]) - 1 and not found_active),
                "progress_percent": pct,
                "next_test_id": next_test_id,
            }
        )
        prev_floor = t_val
    return milestones


def compute_personalized_roadmap(user_id: str, attempts: List[Dict[str, Any]], goal: Dict[str, Any]) -> Dict[str, Any]:
    cfg = get_roadmap_config_cached()
    input_band = round_to_ielts_band(goal["input_band"])
    skill_diagnostics: Dict[str, Dict[str, Any]] = {}
    ranked_skills: List[Tuple[int, float, float, str]] = []

    for sk in SKILLS:
        sk_all = [a for a in attempts if str(a.get("skill", "")).lower() == sk]
        scored = [a for a in sk_all if a.get("status") == "scored" and a.get("band") is not None and float(a["band"]) > 0]
        waiting = [a for a in sk_all if a.get("status") == "waiting_expert"]
        prelim_vals = [float(a["preliminary_band"]) for a in waiting if a.get("preliminary_band") is not None]
        mocks = [a for a in scored if a.get("mode") in ("mock", "exam") and (sk in ("writing", "speaking") or (a.get("question_count") or 40) >= 30)]

        if mocks:
            cur_band = round_to_ielts_band(sum(float(a["band"]) for a in mocks[:cfg["mock_window"]]) / len(mocks[:cfg["mock_window"]]))
            conf, conf_label = "high", "Chuẩn Thi Thử (Mock)"
        elif len(scored) >= cfg["min_attempts_confidence"]:
            cur_band = round_to_ielts_band(sum(float(a["band"]) for a in scored[:cfg["practice_window"]]) / len(scored[:cfg["practice_window"]]))
            conf, conf_label = "low", "Ước lượng Luyện tập"
        else:
            cur_band, conf, conf_label = input_band, "insufficient", "Cần làm bài Chẩn đoán"

        t_band = round_to_ielts_band(float(goal.get(f"target_{sk}") or goal["target_overall"]))
        gap = round(max(0.0, t_band - cur_band), 1)
        skill_diagnostics[sk] = {
            "skill": sk, "current_band": cur_band, "target_band": t_band, "gap": gap,
            "confidence": conf, "confidence_label": conf_label, "attempts_count": len(scored),
            "mock_count": len(mocks), "waiting_expert_count": len(waiting),
            "preliminary_avg": round_to_ielts_band(sum(prelim_vals) / len(prelim_vals)) if prelim_vals else None,
        }
        ranked_skills.append((1 if conf == "insufficient" else 0, gap, -cur_band, sk))

    ranked_skills.sort(reverse=True)
    priority_skill = ranked_skills[0][3]
    p_diag = skill_diagnostics[priority_skill]
    is_diagnostic = p_diag["confidence"] == "insufficient"

    predicted_overall = round_to_ielts_band(sum(d["current_band"] for d in skill_diagnostics.values()) / 4.0)
    days_remaining = _days_until(goal["test_date"])
    weeks_remaining = max(1, (days_remaining + 6) // 7)
    overall_gap = max(0.0, float(goal["target_overall"]) - predicted_overall)
    needed_tests_total = max(2, round((overall_gap / 0.5) * cfg["tests_per_half_band"]))
    weekly_target = min(14, max(2, round(needed_tests_total / weeks_remaining)))

    week_ago_iso = (datetime.now(VN_TZ) - timedelta(days=7)).date().isoformat()
    completed_week = sum(1 for a in attempts if (to_vn_date_str(a.get("submitted_at") or a.get("started_at")) or "") >= week_ago_iso and a.get("status") in ("scored", "waiting_expert"))
    pacing_status = "completed" if overall_gap <= 0 else ("on_track" if completed_week >= weekly_target else "needs_boost")

    weak_key, weak_label, evidence = _detect_ewma_weakness(user_id, priority_skill, attempts)
    strategy = get_strategy_for_weakness(priority_skill, weak_key, is_diagnostic=(weak_key == "diagnostic"))
    rec_tests = select_smart_practice_trio(
        priority_skill, p_diag["current_band"], p_diag["target_band"], weak_key, weak_label,
        weak_key == "diagnostic", days_remaining, attempts, get_all_published_tests(), cfg,
    )
    milestones = _build_milestones(input_band, predicted_overall, float(goal["target_overall"]), rec_tests[0]["id"] if rec_tests else None)
    reason_line = (
        f"Ưu tiên {priority_skill.capitalize()} vì mới có {p_diag['attempts_count']} bài — cần làm chẩn đoán theo chuẩn BR-12."
        if is_diagnostic
        else f"{priority_skill.capitalize()} đang thấp hơn mục tiêu {p_diag['gap']:.1f} band (hiện tại {p_diag['current_band']:.1f} vs mục tiêu {p_diag['target_band']:.1f})."
    )
    return {
        "predicted_overall": predicted_overall,
        "skill_diagnostics": skill_diagnostics,
        "study_milestones": milestones,
        "roadmap": {
            "priority_skill": priority_skill, "priority_reason": reason_line, "is_diagnostic": is_diagnostic,
            "weakest_area": weak_label, "evidence_summary": evidence, "exam_phase": resolve_exam_phase(days_remaining),
            "strategy": strategy, "recommended_tests": rec_tests,
            "recent_exclude_days": cfg["recent_exclude_days"],
            "expert_review_tip": priority_skill in ("writing", "speaking"),
            "weekly_pacing": {
                "days_remaining": days_remaining, "weeks_remaining": weeks_remaining,
                "weekly_target_tests": weekly_target, "completed_this_week": completed_week,
                "pacing_status": pacing_status,
            },
        },
    }
