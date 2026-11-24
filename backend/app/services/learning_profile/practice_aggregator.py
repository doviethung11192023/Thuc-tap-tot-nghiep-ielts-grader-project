from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List
from .common import (
    TZ_VN,
    compute_daily_active_minutes,
    get_from_cache,
    get_learner_goal,
    get_user_attempts,
    round_to_ielts_band,
    set_to_cache,
    to_vn_date_str,
)
from .monthly_aggregator import compute_criterion_mastery, compute_monthly_progression
from .question_type_aggregator import compute_question_type_accuracy


def compute_learning_profile_test_practice(user_id: str) -> Dict[str, Any]:
    """Tổng hợp số liệu chi tiết cho Tab Test Practice, Criterion Mastery & Tiến độ Tháng."""
    cache_key = f"practice_{user_id}"
    cached = get_from_cache(cache_key)
    if cached is not None:
        return cached

    attempts = get_user_attempts(user_id)
    goal = get_learner_goal(user_id)
    daily_minutes = compute_daily_active_minutes(attempts)
    scored = [a for a in attempts if a.get("band") is not None and a.get("status") == "scored"]
    now_vn = datetime.now(TZ_VN).date()
    one_week_ago_iso = (now_vn - timedelta(days=7)).isoformat()
    two_weeks_ago_iso = (now_vn - timedelta(days=14)).isoformat()

    skill_stats: Dict[str, Any] = {}
    for sk in ["listening", "reading", "writing", "speaking"]:
        sk_attempts = [a for a in scored if str(a.get("skill", "")).lower() == sk]
        valid_bands = [float(a["band"]) for a in sk_attempts if float(a["band"]) > 0]
        avg_overall = round_to_ielts_band(sum(valid_bands) / len(valid_bands)) if valid_bands else (0.0 if sk_attempts else None)

        recent_week = [float(a["band"]) for a in sk_attempts if float(a["band"]) > 0 and (to_vn_date_str(a.get("submitted_at") or a.get("started_at")) or "") >= one_week_ago_iso]
        prev_week = [float(a["band"]) for a in sk_attempts if float(a["band"]) > 0 and two_weeks_ago_iso <= (to_vn_date_str(a.get("submitted_at") or a.get("started_at")) or "") < one_week_ago_iso]
        delta = round((sum(recent_week) / len(recent_week)) - (sum(prev_week) / len(prev_week)), 1) if (recent_week and prev_week) else None
        skill_stats[sk.capitalize()] = {"average": avg_overall, "completed_tests": len(sk_attempts), "delta": delta}

    scored_valid = [a for a in scored if float(a["band"]) > 0 or a.get("mode") in ("mock", "exam")] or scored
    score_tracking = []
    for idx, a in enumerate(reversed(scored_valid[:30])):
        sk = str(a.get("skill", "")).lower()
        band = round_to_ielts_band(float(a["band"]))
        t_info = a.get("tests") or {}
        score_tracking.append({
            "id": a["id"], "testNumber": idx + 1, "mode": a.get("mode") or "practice",
            "score": band, "skill": sk.capitalize(),
            "title": t_info.get("title") or f"IELTS {sk.capitalize()}",
            "date": str(a.get("submitted_at") or a.get("started_at") or "")[:10], sk: band,
        })

    qtype_data = compute_question_type_accuracy(user_id, scored)
    criterion_mastery = compute_criterion_mastery(user_id, attempts, goal)
    monthly_bundle = compute_monthly_progression(user_id, attempts, daily_minutes, goal)

    # Nhận xét sư phạm dựa trên số liệu dạng bài / tiêu chí thật (thay cho mẫu câu chung chung)
    def build_data_note(sk_key: str, sk_label: str) -> str:
        st = skill_stats[sk_label]
        if st["completed_tests"] == 0:
            return f"Bạn chưa có bài {sk_label} chấm điểm. Hãy làm 2 bài chẩn đoán để kích hoạt phân tích lộ trình."
        if sk_key in ("listening", "reading"):
            sk_rows = [r for r in qtype_data["report"] if str(r.get("skill", "")).lower() == sk_key]
            if sk_rows:
                weak_r = min(sk_rows, key=lambda x: x["accuracy"])
                return f"Band trung bình {sk_label}: {st['average']}. Dạng cần ưu tiên nhất: {weak_r['type_name']} ({weak_r['accuracy']}% chính xác qua {weak_r['total_questions']} câu)."
        else:
            crit_rows = [c for c in criterion_mastery.get(sk_key, []) if c["sample_count"] > 0]
            if crit_rows:
                weak_c = min(crit_rows, key=lambda x: x["average_band"])
                return f"Band trung bình {sk_label}: {st['average']}. Tiêu chí đang kéo điểm là {weak_c['name']} (Band {weak_c['average_band']:.1f}/{weak_c['target_band']:.1f})."
        return f"Điểm trung bình {sk_label} đang ở Band {st['average']} qua {st['completed_tests']} bài hoàn thành."

    ai_feedback = {
        "listening": build_data_note("listening", "Listening"),
        "reading": build_data_note("reading", "Reading"),
        "writing": build_data_note("writing", "Writing"),
        "speaking": build_data_note("speaking", "Speaking"),
    }

    recent_history = []
    for a in attempts[:10]:
        t_info = a.get("tests") or {}
        raw_band = a.get("band") if a.get("band") is not None else a.get("preliminary_band")
        b_val = round_to_ielts_band(float(raw_band)) if raw_band is not None else 0.0
        sk_str = str(a.get("skill", "")).capitalize()
        recent_history.append({
            "id": a["id"], "test_id": a.get("test_id"), "mode": a.get("mode") or "practice",
            "testName": t_info.get("title") or f"IELTS {sk_str} Practice Test",
            "type_badge": "Luyện theo dạng bài" if a.get("mode") == "practice" else "Thi thử cả đề",
            "band": b_val, "status": a.get("status") or "in_progress",
            "score_percent": min(100, int((b_val / 9.0) * 100)),
            "skill": sk_str, "submittedAt": a.get("submitted_at") or a.get("started_at"),
        })

    result = {
        "skill_averages": skill_stats, "score_tracking": score_tracking,
        "ai_feedback": ai_feedback, "highlights": qtype_data["highlights"],
        "question_type_report": qtype_data["report"], "recent_history": recent_history,
        "criterion_mastery": criterion_mastery,
        "monthly_progression": monthly_bundle["monthly_progression"],
        "monthly_scorecard": monthly_bundle["monthly_scorecard"],
    }
    set_to_cache(cache_key, result, ttl_seconds=180)
    return result
