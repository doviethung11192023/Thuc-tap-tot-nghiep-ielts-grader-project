from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List
from .common import get_user_attempts, get_from_cache, set_to_cache, round_to_ielts_band
from .question_type_aggregator import compute_question_type_accuracy

def compute_learning_profile_test_practice(user_id: str) -> Dict[str, Any]:
    """Tổng hợp số liệu chi tiết cho Tab Test Practice chuẩn IELTS."""
    cache_key = f"practice_{user_id}"
    cached = get_from_cache(cache_key)
    if cached is not None:
        return cached

    attempts = get_user_attempts(user_id)
    scored = [a for a in attempts if a.get("band") is not None and a.get("status") == "scored"]
    now = datetime.now(timezone.utc)
    one_week_ago = now - timedelta(days=7)
    two_weeks_ago = now - timedelta(days=14)

    # 1. Điểm trung bình hàng tuần & Delta chuẩn IELTS
    skill_stats = {}
    for sk in ["listening", "reading", "writing", "speaking"]:
        sk_attempts = [a for a in scored if str(a.get("skill", "")).lower() == sk]
        avg_overall = round_to_ielts_band(sum(float(a["band"]) for a in sk_attempts) / len(sk_attempts)) if sk_attempts else None

        recent_week = [float(a["band"]) for a in sk_attempts if a.get("started_at") and str(a["started_at"]) >= one_week_ago.isoformat()[:10]]
        prev_week = [float(a["band"]) for a in sk_attempts if a.get("started_at") and two_weeks_ago.isoformat()[:10] <= str(a["started_at"]) < one_week_ago.isoformat()[:10]]

        delta = None
        if recent_week and prev_week:
            delta = round((sum(recent_week) / len(recent_week)) - (sum(prev_week) / len(prev_week)), 1)
        elif recent_week and not prev_week:
            delta = 0.5

        skill_stats[sk.capitalize()] = {
            "average": avg_overall,
            "completed_tests": len(sk_attempts),
            "delta": delta
        }

    # 2. Line Chart: 30 bài test gần nhất
    chronological = list(reversed(scored[:30]))
    score_tracking = []
    for idx, a in enumerate(chronological):
        sk = str(a.get("skill", "")).lower()
        band = round_to_ielts_band(float(a["band"]))
        score_tracking.append({
            "id": a["id"],
            "testNumber": idx + 1,
            "mode": a.get("mode") or "practice",
            "score": band,
            "skill": sk.capitalize(),
            sk: band,
        })

    # 3. Hộp Nhận xét AI Sư phạm
    def make_note(sk_name: str, avg: Any, count: int) -> str:
        if count == 0:
            return f"Bạn chưa làm bài test {sk_name} nào. Hãy bắt đầu luyện tập để nhận đánh giá chi tiết."
        if avg is not None and avg >= 7.0:
            return f"Kỹ năng {sk_name} của bạn đang duy trì phong độ xuất sắc (Band {avg}). Hãy tiếp tục làm các bài thi khó để đạt band 8.0+."
        if avg is not None and avg >= 5.5:
            return f"Điểm số {sk_name} đang có đà tiến bộ ổn định (Band {avg}). Cần củng cố thêm từ vựng chuyên sâu và chiến thuật phân bổ thời gian."
        return f"Điểm số {sk_name} có lúc tăng nhưng chưa ổn định. Hãy ôn kỹ các dạng câu hỏi hay nhầm lẫn để bứt phá band điểm nhé!"

    ai_feedback = {
        "listening": make_note("Listening", skill_stats["Listening"]["average"], skill_stats["Listening"]["completed_tests"]),
        "reading": make_note("Reading", skill_stats["Reading"]["average"], skill_stats["Reading"]["completed_tests"]),
        "writing": make_note("Writing", skill_stats["Writing"]["average"], skill_stats["Writing"]["completed_tests"]),
        "speaking": make_note("Speaking", skill_stats["Speaking"]["average"], skill_stats["Speaking"]["completed_tests"]),
    }

    # 4 & 5. Phân tích dạng bài thực tế (Question Types & Highlights)
    qtype_data = compute_question_type_accuracy(user_id, scored)

    # 6. Timeline Lịch sử làm bài
    recent_history = []
    for a in attempts[:10]:
        t_info = a.get("tests") or {}
        b_val = round_to_ielts_band(float(a["band"])) if a.get("band") is not None else 0.0
        sk_str = str(a.get("skill", "")).capitalize()
        recent_history.append({
            "id": a["id"],
            "test_id": a.get("test_id"),
            "testName": t_info.get("title") or f"IELTS {sk_str} Practice Test",
            "type_badge": "Luyện theo dạng bài" if a.get("mode") == "practice" else "Thi thử cả đề",
            "band": b_val,
            "status": a.get("status") or "in_progress",
            "score_percent": min(100, int((b_val / 9.0) * 100)),
            "skill": sk_str,
            "submittedAt": a.get("submitted_at") or a.get("started_at"),
        })

    result = {
        "skill_averages": skill_stats,
        "score_tracking": score_tracking,
        "ai_feedback": ai_feedback,
        "highlights": qtype_data["highlights"],
        "question_type_report": qtype_data["report"],
        "recent_history": recent_history,
    }
    set_to_cache(cache_key, result, ttl_seconds=30)
    return result
