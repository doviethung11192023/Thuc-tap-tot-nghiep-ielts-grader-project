from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List
from .common import (
    get_user_attempts, get_learner_goal,
    get_vietnamese_month_abbr, compute_daily_active_minutes,
    get_from_cache, set_to_cache, round_to_ielts_band
)
from app.services.learner_journey.next_step_builder import compute_current_bands

def compute_learning_profile_overview(user_id: str) -> Dict[str, Any]:
    """Tổng hợp dữ liệu thực tế cho Tab Tổng quan (Overview) chuẩn IELTS."""
    cache_key = f"overview_{user_id}"
    cached = get_from_cache(cache_key)
    if cached is not None:
        return cached

    attempts = get_user_attempts(user_id)
    goal = get_learner_goal(user_id)
    daily_minutes = compute_daily_active_minutes(attempts)

    scored_attempts = [a for a in attempts if a.get("band") is not None and a.get("status") == "scored"]
    bands_by_skill = {"listening": [], "reading": [], "writing": [], "speaking": []}
    counts_by_skill = {"listening": 0, "reading": 0, "writing": 0, "speaking": 0}
    total_minutes = sum(daily_minutes.values())

    for a in attempts:
        sk = str(a.get("skill", "")).lower()
        if sk in counts_by_skill:
            counts_by_skill[sk] += 1
        if a.get("band") is not None and a.get("status") == "scored":
            b_val = float(a["band"])
            if sk in bands_by_skill:
                bands_by_skill[sk].append(b_val)

    all_bands = [float(a["band"]) for a in scored_attempts]

    # Band hiện tại theo BR-12 (spec 005): không dùng band tự nhập, chưa đủ dữ liệu thì None
    journey = compute_current_bands(user_id, attempts)
    cb = journey["current_bands"]
    l_score, r_score, w_score, s_score = (cb[s]["band"] or 0.0 for s in ("listening", "reading", "writing", "speaking"))
    avg_band = round_to_ielts_band(sum(all_bands) / len(all_bands)) if all_bands else 0.0
    best_band = round_to_ielts_band(max(all_bands)) if all_bands else 0.0
    predicted_band = cb["overall"]

    prog_pct = 0
    if predicted_band is not None and goal["target_overall"] > goal["input_band"]:
        prog_pct = min(100, max(0, round(((predicted_band - goal["input_band"]) / (goal["target_overall"] - goal["input_band"])) * 100)))

    all_dates = [str(a.get("started_at") or "")[:10] for a in attempts if a.get("started_at")]
    all_dates.sort(reverse=True)

    recent_submissions = []
    for a in attempts[:4]:
        b_val = round_to_ielts_band(float(a["band"])) if a.get("band") is not None else None
        sk = str(a.get("skill", "")).lower()
        t_id = a.get("test_id") or ""
        t_link = f"/test-practice/{sk}/{t_id}/summary?attemptId={a['id']}&returnUrl=%2Flearning-profile" if (a.get("status") == "scored" and t_id) else (f"/results/{a['id']}" if a.get("status") == "scored" else "/test-practice/history")
        recent_submissions.append({
            "id": a["id"], "type": "test", "title": (a.get("tests") or {}).get("title") or f"IELTS {sk.capitalize()} Practice",
            "date": str(a.get("submitted_at") or a.get("started_at", ""))[:10], "status": a.get("status") or "in_progress",
            "band": b_val, "link": t_link,
        })
    recent_submissions.sort(key=lambda x: x.get("date") or "", reverse=True)

    radar_data = [
        {"skill": "Writing", "score": w_score, "count": len(bands_by_skill["writing"])},
        {"skill": "Overview", "score": predicted_band or 0.0, "count": len(attempts)},
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

    today = datetime.now(timezone.utc).date()
    start_monday = today - timedelta(days=today.weekday()) - timedelta(weeks=12)
    weeks_data = []
    day_labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    for w_idx in range(13):
        w_monday = start_monday + timedelta(weeks=w_idx)
        w_days = []
        w_total = 0
        for d_offset in range(7):
            cur_date = w_monday + timedelta(days=d_offset)
            cur_str = cur_date.isoformat()
            mins = daily_minutes.get(cur_str, 0)
            w_total += mins
            w_days.append({"day_of_week": day_labels[d_offset], "date": cur_str, "minutes": mins, "is_future": cur_date > today})
        weeks_data.append({"week_index": w_idx, "month_label": get_vietnamese_month_abbr(w_monday) if w_monday.day <= 7 or w_idx == 0 else "", "days": w_days, "total_minutes": w_total})

    result = {
        "kpis": {
            "total_time_hours": round(total_minutes / 60, 1), "total_time_minutes": total_minutes,
            "total_cups": len(scored_attempts), "total_tests_taken": len(attempts),
            "total_exercises_studied": len(scored_attempts),
        },
        "dashboard_stats": {
            "total_submissions": len(attempts), "avg_band": avg_band,
            "best_band": best_band, "last_activity_date": all_dates[0] if all_dates else "-",
        },
        "recent_submissions": recent_submissions[:5],
        "goals": {
            "input_band": goal["input_band"], "predicted_band": predicted_band,
            "target_band": goal["target_overall"], "progress_percent": prog_pct, "test_date": journey["exam"]["test_date"],
            "goal_set": journey["goal_set"],
        },
        "current_bands": cb, "exam": journey["exam"],
        "radar_data": radar_data, "donut_data": donut_data, "heatmap_weeks": weeks_data,
    }
    set_to_cache(cache_key, result, ttl_seconds=30)
    return result
