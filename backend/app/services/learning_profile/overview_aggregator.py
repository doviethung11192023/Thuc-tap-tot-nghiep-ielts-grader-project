from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List
from .common import (
    TZ_VN,
    get_user_answers_cached,
    get_user_attempts,
    get_learner_goal,
    get_vietnamese_month_abbr,
    compute_daily_active_minutes,
    get_from_cache,
    set_to_cache,
    round_to_ielts_band,
    to_vn_date_str,
)
from .roadmap_aggregator import compute_personalized_roadmap
from .monthly_aggregator import compute_monthly_progression
from .adaptive_streak_service import compute_adaptive_streak
from .learner_badges_service import compute_learner_badges
from .gamification_state_store import get_gamification_state, sync_new_badge_notifications
from .question_type_aggregator import compute_question_type_accuracy
from .valid_study_day import load_attempt_quality_map


def compute_learning_profile_overview(user_id: str) -> Dict[str, Any]:
    """Tổng hợp dữ liệu thực tế cho Tab Tổng quan (Overview) chuẩn IELTS (BR-12, BR-17, Monthly)."""
    cache_key = f"overview_v2_{user_id}"
    cached = get_from_cache(cache_key)
    if cached is not None:
        return cached

    attempts = get_user_attempts(user_id)
    goal = get_learner_goal(user_id)
    daily_minutes = compute_daily_active_minutes(attempts)

    roadmap_bundle = compute_personalized_roadmap(user_id, attempts, goal)
    monthly_bundle = compute_monthly_progression(user_id, attempts, daily_minutes, goal)
    sk_diag = roadmap_bundle["skill_diagnostics"]

    scored_attempts = [a for a in attempts if a.get("band") is not None and a.get("status") == "scored"]
    bands_by_skill: Dict[str, List[float]] = {"listening": [], "reading": [], "writing": [], "speaking": []}
    counts_by_skill = {"listening": 0, "reading": 0, "writing": 0, "speaking": 0}
    total_minutes = sum(daily_minutes.values())
    for a in attempts:
        sk = str(a.get("skill", "")).lower()
        if a.get("status") == "scored" and sk in counts_by_skill:
            counts_by_skill[sk] += 1
        if a.get("band") is not None and a.get("status") == "scored" and sk in bands_by_skill:
            bands_by_skill[sk].append(float(a["band"]))

    def avg_hist(vals: List[float]) -> float:
        valid = [x for x in vals if x > 0]
        return round_to_ielts_band(sum(valid) / len(valid)) if valid else 0.0

    all_bands = [float(a["band"]) for a in scored_attempts if float(a["band"]) > 0]
    w_score = avg_hist(bands_by_skill["writing"])
    l_score = avg_hist(bands_by_skill["listening"])
    r_score = avg_hist(bands_by_skill["reading"])
    s_score = avg_hist(bands_by_skill["speaking"])

    practiced_vals = [sc for sc in (w_score, l_score, r_score, s_score) if sc > 0]
    avg_band = round_to_ielts_band(sum(practiced_vals) / len(practiced_vals)) if practiced_vals else 0.0
    best_band = round_to_ielts_band(max(all_bands)) if all_bands else 0.0
    predicted_band = roadmap_bundle["predicted_overall"] if practiced_vals else round_to_ielts_band(goal["input_band"])

    high_conf_cnt = sum(1 for d in sk_diag.values() if d["confidence"] == "high")
    low_conf_cnt = sum(1 for d in sk_diag.values() if d["confidence"] == "low")
    overall_conf = "Chuẩn Thi Thử (Mock)" if high_conf_cnt >= 2 else ("Ước lượng Luyện tập" if (high_conf_cnt + low_conf_cnt) > 0 else "Chưa đủ dữ liệu")
    waiting_expert_total = sum(d["waiting_expert_count"] for d in sk_diag.values())

    prog_pct = 0
    if goal["target_overall"] > goal["input_band"]:
        prog_pct = min(100, max(0, round(((predicted_band - goal["input_band"]) / (goal["target_overall"] - goal["input_band"])) * 100)))

    all_dates = [d for d in (to_vn_date_str(a.get("submitted_at") or a.get("started_at")) for a in attempts if a.get("status") in ("scored", "waiting_expert", "grading") or a.get("submitted_at")) if d]
    all_dates.sort(reverse=True)

    recent_submissions = []
    for a in attempts[:5]:
        b_val = round_to_ielts_band(float(a["band"])) if a.get("band") is not None else (
            round_to_ielts_band(float(a["preliminary_band"])) if a.get("preliminary_band") is not None else None
        )
        sk = str(a.get("skill", "")).lower()
        st = a.get("status") or "in_progress"
        t_id = a.get("test_id") or ""
        if st in ("scored", "waiting_expert") and t_id:
            t_link = f"/test-practice/{sk}/{t_id}/summary?attemptId={a['id']}&returnUrl=%2Flearning-profile"
        elif st == "in_progress" and t_id:
            t_link = f"/test-practice/{sk}/{t_id}?mode={a.get('mode') or 'practice'}"
        else:
            t_link = "/test-practice/history"
        recent_submissions.append({
            "id": a["id"], "type": "test",
            "title": (a.get("tests") or {}).get("title") or f"IELTS {sk.capitalize()} Practice",
            "date": str(a.get("submitted_at") or a.get("started_at", ""))[:10],
            "status": st, "band": b_val, "link": t_link,
        })

    radar_data = [
        {"skill": "Writing", "score": w_score, "count": len(bands_by_skill["writing"])},
        {"skill": "Overview", "score": avg_band, "count": len(scored_attempts)},
        {"skill": "Listening", "score": l_score, "count": len(bands_by_skill["listening"])},
        {"skill": "Reading", "score": r_score, "count": len(bands_by_skill["reading"])},
        {"skill": "Speaking", "score": s_score, "count": len(bands_by_skill["speaking"])},
    ]
    donut_data = [
        {"name": "Listening", "value": counts_by_skill["listening"], "color": "#f59e0b"},
        {"name": "Reading", "value": counts_by_skill["reading"], "color": "#10b981"},
        {"name": "Writing", "value": counts_by_skill["writing"], "color": "#2563eb"},
        {"name": "Speaking", "value": counts_by_skill["speaking"], "color": "#ef4444"},
    ]

    gstate = get_gamification_state(user_id)
    quality_map = load_attempt_quality_map(user_id, attempts)
    adaptive_streak = compute_adaptive_streak(attempts, daily_minutes, goal, state=gstate, quality_map=quality_map)
    frozen_set = set(adaptive_streak.get("frozen_dates") or [])

    today = datetime.now(TZ_VN).date()
    start_monday = today - timedelta(days=today.weekday()) - timedelta(weeks=12)
    weeks_data = []
    day_labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    for w_idx in range(13):
        w_monday = start_monday + timedelta(weeks=w_idx)
        w_days, w_total = [], 0
        for d_offset in range(7):
            cur_date = w_monday + timedelta(days=d_offset)
            cur_str = cur_date.isoformat()
            mins = daily_minutes.get(cur_str, 0)
            w_total += mins
            w_days.append({
                "day_of_week": day_labels[d_offset],
                "date": cur_str,
                "minutes": mins,
                "is_future": cur_date > today,
                "is_frozen": cur_str in frozen_set,
            })
        weeks_data.append({"week_index": w_idx, "month_label": get_vietnamese_month_abbr(w_monday) if w_monday.day <= 7 or w_idx == 0 else "", "days": w_days, "total_minutes": w_total})

    qt_report = compute_question_type_accuracy(user_id, scored_attempts).get("report") if scored_attempts else []
    scored_ids = [a["id"] for a in scored_attempts if a.get("id")][:50]
    badge_answers = get_user_answers_cached(user_id, scored_ids) if scored_ids else []
    badges = compute_learner_badges(attempts, adaptive_streak, goal, predicted_band, qt_report, answers=badge_answers)
    sync_new_badge_notifications(user_id, badges, gstate)

    result = {
        "kpis": {
            "total_time_hours": round(total_minutes / 60, 1), "total_time_minutes": total_minutes,
            "total_cups": sum(1 for b in all_bands if b >= 7.0), "total_tests_taken": len(scored_attempts),
            "total_exercises_studied": len(scored_attempts),
        },
        "dashboard_stats": {
            "total_submissions": len(scored_attempts), "avg_band": avg_band,
            "best_band": best_band, "last_activity_date": all_dates[0] if all_dates else "-",
        },
        "recent_submissions": recent_submissions,
        "goals": {
            "input_band": goal["input_band"], "predicted_band": predicted_band,
            "target_band": goal["target_overall"],
            "target_listening": goal.get("target_listening", goal["target_overall"]),
            "target_reading": goal.get("target_reading", goal["target_overall"]),
            "target_writing": goal.get("target_writing", goal["target_overall"]),
            "target_speaking": goal.get("target_speaking", goal["target_overall"]),
            "confidence_label": overall_conf, "waiting_expert_count": waiting_expert_total,
            "progress_percent": prog_pct, "test_date": goal["test_date"],
        },
        "study_milestones": roadmap_bundle["study_milestones"],
        "skill_diagnostics": sk_diag,
        "roadmap": roadmap_bundle["roadmap"],
        "monthly_progression": monthly_bundle["monthly_progression"],
        "monthly_scorecard": monthly_bundle["monthly_scorecard"],
        "radar_data": radar_data, "donut_data": donut_data, "heatmap_weeks": weeks_data,
        "adaptive_streak": adaptive_streak, "badges": badges,
    }
    set_to_cache(cache_key, result, ttl_seconds=180)
    return result
