"""Hệ thống Huy hiệu 3 Tầng x 3 Trụ cột (Streak, Mastery, Breakthrough) chuẩn BR-30 & FR-58."""
from typing import Any

from .gamification_config import get_gamification_config
from .valid_study_day import MASTERY_MIN_QUESTIONS, count_mastered_lr_types


def _badge(
    bid: str,
    pillar: str,
    tier: str,
    title: str,
    description: str,
    current: float,
    target: float,
    unlocked: bool,
) -> dict[str, Any]:
    pct = 100 if unlocked else min(99, max(0, round(current / max(target, 1e-6) * 100)))
    return {
        "id": bid,
        "pillar": pillar,
        "tier": tier,
        "title": title,
        "description": description,
        "current_value": current,
        "target_value": target,
        "progress_pct": pct,
        "unlocked": unlocked,
    }


def _max_skill_pb_delta(scored: list[dict[str, Any]]) -> float:
    """FR-58: Tính mức tăng cao nhất giữa bài mới nhất và trung bình 5 bài trước đó cùng kỹ năng."""
    by_skill: dict[str, list[float]] = {}
    for a in scored:
        if a.get("band") is not None and float(a["band"]) > 0:
            by_skill.setdefault(str(a.get("skill") or "").lower(), []).append(float(a["band"]))
    best_delta = 0.0
    for vals in by_skill.values():
        if len(vals) >= 2:
            latest = vals[0]
            prev = vals[1:6]
            prev_avg = sum(prev) / len(prev)
            best_delta = max(best_delta, round(latest - prev_avg, 2))
    return round(max(0.0, best_delta), 1)


def compute_learner_badges(
    attempts: list[dict[str, Any]],
    streak_data: dict[str, Any],
    goal: dict[str, Any],
    predicted_band: float,
    question_type_stats: list[dict[str, Any]] | None = None,
    cfg: dict[str, Any] | None = None,
    answers: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Đánh giá 9 huy hiệu Đồng/Bạc/Vàng đọc ngưỡng từ learner_gamification_config + chống cày Mastery (BR-30)."""
    conf = cfg or get_gamification_config()
    st_tiers = conf.get("streak_tiers") or {"bronze": 3, "silver": 14, "gold": 30}
    b_days = int(st_tiers.get("bronze", 3))
    s_days = int(st_tiers.get("silver", 14))
    g_days = int(st_tiers.get("gold", 30))

    best_streak = max(int(streak_data.get("current_streak") or 0), int(streak_data.get("longest_streak") or 0))
    scored = [a for a in attempts if a.get("status") == "scored"]
    finished = [a for a in attempts if a.get("status") in ("scored", "waiting_expert")]

    skills_practiced = {str(a.get("skill") or "").lower() for a in finished} & {"listening", "reading", "writing", "speaking"}
    mock_skills = {str(a.get("skill") or "").lower() for a in finished if a.get("mode") in ("mock", "exam")} & {
        "listening", "reading", "writing", "speaking"
    }

    min_acc = float(conf.get("mastery_gold_accuracy_pct", 80))
    if answers is not None:
        lr_high_cnt, _ = count_mastered_lr_types(scored, answers, min_accuracy_pct=min_acc, min_questions=MASTERY_MIN_QUESTIONS)
    else:
        lr_types_high = [
            q for q in (question_type_stats or [])
            if str(q.get("skill") or "").lower() in ("listening", "reading")
            and float(q.get("accuracy") or 0) >= min_acc
            and ("total_questions" not in q or int(q.get("total_questions") or 0) >= MASTERY_MIN_QUESTIONS)
        ]
        lr_high_cnt = len(lr_types_high)

    min_types = int(conf.get("mastery_gold_min_types", 3))
    min_scored = int(conf.get("mastery_gold_min_scored", 20))
    mastery_gold_ok = len(scored) >= min_scored or lr_high_cnt >= min_types
    ratio_types = lr_high_cnt / max(min_types, 1)
    ratio_scored = len(scored) / max(min_scored, 1)
    mg_cur, mg_tgt = (lr_high_cnt, min_types) if ratio_types >= ratio_scored else (len(scored), min_scored)

    input_band = float(goal.get("input_band") or 4.0)
    target_overall = float(goal.get("target_overall") or 6.5)
    overall_delta = round(max(0.0, float(predicted_band) - input_band), 1) if scored else 0.0
    pb_delta = _max_skill_pb_delta(scored)
    delta_band = max(overall_delta, pb_delta)

    skill_avgs: dict[str, list[float]] = {}
    for a in scored:
        if a.get("band") is not None and float(a["band"]) > 0:
            skill_avgs.setdefault(str(a.get("skill") or "").lower(), []).append(float(a["band"]))
    best_skill_band = max((max(vals) for vals in skill_avgs.values()), default=0.0)

    req_delta = float(conf.get("breakthrough_bronze_delta", 0.5))
    req_silver_band = float(conf.get("breakthrough_silver_band", 6.5))

    badges = [
        _badge("streak_bronze", "streak", "bronze", "Khởi động Bền bỉ", f"Duy trì chuỗi học {b_days} ngày liên tiếp", best_streak, b_days, best_streak >= b_days),
        _badge("streak_silver", "streak", "silver", "Chiến binh Kỷ luật", f"Duy trì chuỗi học {s_days} ngày liên tiếp", best_streak, s_days, best_streak >= s_days),
        _badge("streak_gold", "streak", "gold", "Bậc thầy Thói quen", f"Duy trì chuỗi học {g_days} ngày liên tiếp", best_streak, g_days, best_streak >= g_days),
        _badge("mastery_bronze", "mastery", "bronze", "Toàn diện 4 Kỹ năng", "Hoàn thành ít nhất 1 bài ở cả 4 kỹ năng L/R/W/S", len(skills_practiced), 4, len(skills_practiced) >= 4),
        _badge("mastery_silver", "mastery", "silver", "Chinh phục Full Mock", "Hoàn thành bài Thi thử (Mock) đủ cả 4 kỹ năng", len(mock_skills), 4, len(mock_skills) >= 4),
        _badge("mastery_gold", "mastery", "gold", "Thạo dạng Chuyên sâu", f"Đạt >= {int(min_acc)}% (>= 20 câu/dạng, cách 24h) ở >= {min_types} dạng L/R hoặc >= {min_scored} bài", mg_cur, mg_tgt, mastery_gold_ok),
        _badge("breakthrough_bronze", "breakthrough", "bronze", "Bước nhảy Đầu tiên", f"Tăng >= +{req_delta} Band so với đầu vào hoặc trung bình 5 bài trước", delta_band, req_delta, len(scored) > 0 and delta_band >= req_delta),
        _badge("breakthrough_silver", "breakthrough", "silver", "Chạm ngưỡng Bứt phá", f"Đạt từ Band {req_silver_band} trở lên ở ít nhất 1 kỹ năng", best_skill_band, req_silver_band, best_skill_band >= req_silver_band),
        _badge("breakthrough_gold", "breakthrough", "gold", "Cán đích Mục tiêu", f"Điểm dự báo chạm/vượt mục tiêu Band {target_overall:.1f}", round(float(predicted_band), 1) if scored else 0.0, target_overall, len(scored) > 0 and float(predicted_band) >= target_overall),
    ]

    return {
        "summary": {
            "unlocked_count": sum(1 for b in badges if b["unlocked"]),
            "total_count": len(badges),
            "gold_count": sum(1 for b in badges if b["unlocked"] and b["tier"] == "gold"),
            "silver_count": sum(1 for b in badges if b["unlocked"] and b["tier"] == "silver"),
            "bronze_count": sum(1 for b in badges if b["unlocked"] and b["tier"] == "bronze"),
        },
        "badges": badges,
    }
