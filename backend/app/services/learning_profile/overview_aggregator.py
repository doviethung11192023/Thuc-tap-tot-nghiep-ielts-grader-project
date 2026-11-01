from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List
from .common import (
    get_user_attempts,
    get_user_essays,
    get_learner_goal,
    get_vietnamese_month_abbr,
    compute_daily_active_minutes,
    get_from_cache,
    set_to_cache
)

def compute_learning_profile_overview(user_id: str) -> Dict[str, Any]:
    """Tổng hợp toàn bộ dữ liệu thực tế cho Tab Tổng quan (Overview) kèm Dashboard stats và RAM Cache."""
    cache_key = f"overview_{user_id}"
    cached = get_from_cache(cache_key)
    if cached is not None:
        return cached

    attempts = get_user_attempts(user_id)
    essays = get_user_essays(user_id)
    goal = get_learner_goal(user_id)
    daily_minutes = compute_daily_active_minutes(attempts, essays)

    # 1. Tính toán điểm thực tế từ attempts và essays
    scored_attempts = [a for a in attempts if a.get("band") is not None and a.get("status") == "scored"]
    bands_by_skill = {"listening": [], "reading": [], "writing": [], "speaking": []}
    counts_by_skill = {"listening": 0, "reading": 0, "writing": 0, "speaking": 0}
    total_minutes = sum(daily_minutes.values())

    for a in attempts:
        sk = str(a.get("skill", "")).lower()
        if sk in counts_by_skill:
            counts_by_skill[sk] += 1
        if a.get("band") is not None:
            b_val = float(a["band"])
            if sk in bands_by_skill:
                bands_by_skill[sk].append(b_val)

    # Thêm các bài Writing essay đã có kết quả đánh giá
    all_bands = [float(a["band"]) for a in scored_attempts]
    for e in essays:
        evals = e.get("evaluation_results")
        b_val = None
        if isinstance(evals, dict) and evals.get("overall_band") is not None:
            b_val = float(evals["overall_band"])
        elif isinstance(evals, list) and len(evals) > 0 and evals[0].get("overall_band") is not None:
            b_val = float(evals[0]["overall_band"])
        if b_val is not None:
            all_bands.append(b_val)
            bands_by_skill["writing"].append(b_val)

    def avg_s(arr: List[float], default: float) -> float:
        if not arr:
            return default
        non_zero = [b for b in arr if b > 0]
        target = non_zero if non_zero else arr
        return round(sum(target) / len(target), 1)

    base_band = float(goal.get("input_band") or 5.0)
    w_score = avg_s(bands_by_skill["writing"], base_band)
    l_score = avg_s(bands_by_skill["listening"], 0.0) if bands_by_skill["listening"] else base_band
    r_score = avg_s(bands_by_skill["reading"], 0.0) if bands_by_skill["reading"] else base_band
    s_score = avg_s(bands_by_skill["speaking"], base_band)
    calc_overall = round(round(((w_score + l_score + r_score + s_score) / 4) * 2) / 2, 1)

    avg_band = calc_overall if calc_overall > 0 else (round(sum(all_bands) / len(all_bands), 1) if all_bands else 0.0)
    best_band = max(all_bands) if all_bands else 0.0
    predicted_band = avg_band if avg_band > 0 else goal["input_band"]
    
    prog_pct = 0
    if goal["target_overall"] > goal["input_band"]:
        prog_pct = min(100, max(0, round(((predicted_band - goal["input_band"]) / (goal["target_overall"] - goal["input_band"])) * 100)))

    # 2. Dashboard Stats & Recent Submissions
    total_submissions = len(attempts) + len(essays)
    all_dates = [str(a.get("started_at") or "")[:10] for a in attempts if a.get("started_at")]
    all_dates += [str(e.get("submitted_at") or "")[:10] for e in essays if e.get("submitted_at")]
    all_dates.sort(reverse=True)
    last_activity_date = all_dates[0] if all_dates else "-"

    dashboard_stats = {
        "total_submissions": total_submissions,
        "avg_band": avg_band,
        "best_band": best_band,
        "last_activity_date": last_activity_date,
    }

    recent_submissions = []
    for e in essays[:4]:
        evals = e.get("evaluation_results")
        b_val = None
        if isinstance(evals, dict) and evals.get("overall_band") is not None:
            b_val = float(evals["overall_band"])
        elif isinstance(evals, list) and len(evals) > 0 and evals[0].get("overall_band") is not None:
            b_val = float(evals[0]["overall_band"])
        topic_info = e.get("topics") or {}
        topic_title = topic_info.get("title") or "Free Writing"
        recent_submissions.append({
            "id": e["id"],
            "type": "essay",
            "title": topic_title,
            "date": str(e.get("submitted_at", ""))[:10],
            "status": e.get("status") or "completed",
            "band": b_val,
            "link": f"/results/{e['id']}",
        })
    for a in attempts[:4]:
        t_info = a.get("tests") or {}
        b_val = float(a["band"]) if a.get("band") is not None else None
        recent_submissions.append({
            "id": a["id"],
            "type": "test",
            "title": t_info.get("title") or f"IELTS {str(a.get('skill', '')).capitalize()} Practice",
            "date": str(a.get("submitted_at") or a.get("started_at", ""))[:10],
            "status": a.get("status") or "completed",
            "band": b_val,
            "link": f"/results/{a['id']}" if a.get("status") == "scored" else "/history",
        })
    recent_submissions.sort(key=lambda x: x.get("date") or "", reverse=True)
    recent_submissions = recent_submissions[:5]

    # 3. Radar & Donut
    radar_data = [
        {"skill": "Writing", "score": w_score, "count": len(bands_by_skill["writing"])},
        {"skill": "Overview", "score": predicted_band, "count": total_submissions},
        {"skill": "Listening", "score": l_score, "count": len(bands_by_skill["listening"])},
        {"skill": "Reading", "score": r_score, "count": len(bands_by_skill["reading"])},
        {"skill": "Speaking", "score": s_score, "count": len(bands_by_skill["speaking"])},
    ]

    donut_data = [
        {"name": "Listening", "value": counts_by_skill["listening"], "color": "#f59e0b"},
        {"name": "Reading", "value": counts_by_skill["reading"], "color": "#10b981"},
        {"name": "Writing", "value": counts_by_skill["writing"] + len(essays), "color": "#2563eb"},
        {"name": "Speaking", "value": counts_by_skill["speaking"], "color": "#ef4444"},
    ]

    # 4. Tần suất học tập 13 tuần Mon-Sun
    today = datetime.now(timezone.utc).date()
    days_since_monday = today.weekday()
    current_monday = today - timedelta(days=days_since_monday)
    start_monday = current_monday - timedelta(weeks=12)

    date_minutes = daily_minutes

    weeks_data = []
    day_labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    for w_idx in range(13):
        w_monday = start_monday + timedelta(weeks=w_idx)
        w_days = []
        w_total = 0
        m_label = get_vietnamese_month_abbr(w_monday) if w_monday.day <= 7 or w_idx == 0 else ""

        for d_offset in range(7):
            cur_date = w_monday + timedelta(days=d_offset)
            cur_str = cur_date.isoformat()
            mins = date_minutes.get(cur_str, 0)
            w_total += mins
            w_days.append({
                "day_of_week": day_labels[d_offset],
                "date": cur_str,
                "minutes": mins,
                "is_future": cur_date > today
            })

        weeks_data.append({
            "week_index": w_idx,
            "month_label": m_label,
            "days": w_days,
            "total_minutes": w_total
        })

    result = {
        "kpis": {
            "total_time_hours": round(total_minutes / 60, 1),
            "total_time_minutes": total_minutes,
            "total_cups": len(scored_attempts),
            "total_tests_taken": total_submissions,
            "total_exercises_studied": len(scored_attempts),
        },
        "dashboard_stats": dashboard_stats,
        "recent_submissions": recent_submissions,
        "goals": {
            "input_band": goal["input_band"],
            "predicted_band": predicted_band,
            "target_band": goal["target_overall"],
            "progress_percent": prog_pct,
            "test_date": goal["test_date"],
        },
        "radar_data": radar_data,
        "donut_data": donut_data,
        "heatmap_weeks": weeks_data,
    }
    set_to_cache(cache_key, result, ttl_seconds=30)
    return result
