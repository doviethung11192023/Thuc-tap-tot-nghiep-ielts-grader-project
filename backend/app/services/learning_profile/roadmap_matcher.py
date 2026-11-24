"""Giải thuật Multi-Factor Utility Scoring (EWMA + ZPD + Spaced Repetition + Exam Phase)."""
import math
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

DIFF_TO_BAND = {"easy": 4.5, "medium": 6.0, "hard": 7.5}


def _parse_iso_days_ago(raw_ts: Optional[str], now: datetime) -> Optional[float]:
    if not raw_ts:
        return None
    try:
        dt = datetime.fromisoformat(str(raw_ts).replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return max(0.0, (now - dt).total_seconds() / 86400.0)
    except Exception:
        return None


def resolve_exam_phase(days_remaining: int) -> str:
    if days_remaining > 45:
        return "foundation"
    if days_remaining >= 15:
        return "acceleration"
    return "sprint"


def score_candidate_tests(
    priority_skill: str,
    current_band: float,
    target_band: float,
    weakest_key: str,
    is_diagnostic: bool,
    days_remaining: int,
    attempts: List[Dict[str, Any]],
    published_tests: List[Dict[str, Any]],
    cfg: Dict[str, int],
) -> List[Dict[str, Any]]:
    """Chấm điểm 4 thành phần Utility (45/25/20/10) cho tất cả đề ứng viên của kỹ năng ưu tiên."""
    now = datetime.now(timezone.utc)
    exclude_days = cfg.get("recent_exclude_days", 14)
    limit = cfg.get("recommended_count", 3)
    candidates = [t for t in published_tests if str(t.get("skill", "")).lower() == priority_skill]
    if not candidates:
        return []

    last_by_test: Dict[str, Dict[str, Any]] = {}
    for a in attempts:
        tid = a.get("test_id")
        if tid and tid not in last_by_test:
            last_by_test[tid] = {
                "days_ago": _parse_iso_days_ago(a.get("submitted_at") or a.get("started_at"), now),
                "band": a.get("band") or 0.0,
            }

    ideal_band = min(8.5, max(4.0, current_band + 0.5))
    phase = resolve_exam_phase(days_remaining)
    scored: List[Dict[str, Any]] = []

    for t in candidates:
        tid = t["id"]
        prev = last_by_test.get(tid)
        days_ago = prev["days_ago"] if prev else None
        recently_done = days_ago is not None and days_ago < exclude_days

        t_qtypes = t.get("question_types") or []
        t_tasks = [str(x).lower() for x in (t.get("task_types") or [])]
        if priority_skill == "writing":
            if weakest_key == "TA":
                has_weak_qtype = any("task1" in x or x == "1" for x in t_tasks)
                weakness_cov = 0.7 if is_diagnostic else (1.0 if has_weak_qtype else 0.45)
            elif weakest_key == "TR":
                has_weak_qtype = any("task2" in x or x == "2" for x in t_tasks)
                weakness_cov = 0.7 if is_diagnostic else (1.0 if has_weak_qtype else 0.45)
            else:
                has_weak_qtype = not is_diagnostic
                weakness_cov = 0.7 if is_diagnostic else 0.85
        elif priority_skill == "speaking":
            has_weak_qtype = not is_diagnostic
            weakness_cov = 0.7 if is_diagnostic else 0.85
        else:
            has_weak_qtype = weakest_key in t_qtypes
            weakness_cov = 0.7 if is_diagnostic else (1.0 if has_weak_qtype else 0.35)
        diff_band = DIFF_TO_BAND.get(str(t.get("difficulty") or "medium").lower(), 6.0)
        zpd_fit = math.exp(-((diff_band - ideal_band) ** 2) / 2.2)

        if prev is None:
            spaced_rep = 1.0
        elif recently_done:
            spaced_rep = 0.05
        elif float(prev["band"] or 0.0) < target_band:
            spaced_rep = 0.88
        else:
            spaced_rep = 0.6

        is_micro = str(t.get("source_name") or "").lower() == "micro_exercise"
        if phase == "foundation":
            format_fit = 1.0 if is_micro else 0.75
        elif phase == "sprint":
            format_fit = 1.0 if not is_micro else 0.65
        else:
            format_fit = 0.9

        match_score = min(99, max(35, round((0.45 * weakness_cov + 0.25 * zpd_fit + 0.20 * spaced_rep + 0.10 * format_fit) * 100)))
        scored.append(
            {
                "test": t,
                "score": match_score,
                "weakness_cov": round(weakness_cov * 45, 1),
                "zpd_fit": round(zpd_fit * 25, 1),
                "spaced_rep": round(spaced_rep * 20, 1),
                "format_fit": round(format_fit * 10, 1),
                "recently_done": recently_done,
                "is_redemption": bool(prev and not recently_done and float(prev["band"] or 0.0) < target_band),
                "has_weak_qtype": has_weak_qtype,
                "is_micro": is_micro,
                "days_ago": round(days_ago, 1) if days_ago is not None else None,
            }
        )

    fresh = [s for s in scored if not s["recently_done"]]
    pool = fresh if len(fresh) >= limit else sorted(scored, key=lambda x: (x["recently_done"], -x["score"], -(x["days_ago"] or 9999.0)))
    pool.sort(key=lambda x: (-x["score"], -(x["days_ago"] or 9999.0)))
    return pool


def select_smart_practice_trio(
    priority_skill: str,
    current_band: float,
    target_band: float,
    weakest_key: str,
    weakest_label: str,
    is_diagnostic: bool,
    days_remaining: int,
    attempts: List[Dict[str, Any]],
    published_tests: List[Dict[str, Any]],
    cfg: Dict[str, int],
) -> List[Dict[str, Any]]:
    pool = score_candidate_tests(priority_skill, current_band, target_band, weakest_key, is_diagnostic, days_remaining, attempts, published_tests, cfg)
    if not pool:
        return []
    limit = cfg.get("recommended_count", 3)
    exclude_days = cfg.get("recent_exclude_days", 14)
    ideal_band = min(8.5, max(4.0, current_band + 0.5))
    selected = pool[:limit]
    slot_meta = [
        ("Bước 1 • Chữa điểm nghẽn", "practice"),
        ("Bước 2 • Rèn sức bền", "practice"),
        ("Bước 3 • Kiểm chứng Thi thử", "exam"),
    ]
    out: List[Dict[str, Any]] = []
    for idx, item in enumerate(selected):
        t = item["test"]
        allowed = t.get("allowed_mode") or "both"
        slot_label, default_mode = slot_meta[idx] if idx < len(slot_meta) else ("Đề xuất thêm", "practice")
        mode = default_mode if allowed in ("both", default_mode.replace("exam", "mock")) else ("practice" if allowed == "practice" else "exam")
        if idx == 0 and item["has_weak_qtype"]:
            reason = f"Đánh thẳng vào dạng {weakest_label} đang yếu • Độ khó khớp mục tiêu {ideal_band:.1f}"
        elif item["is_redemption"]:
            reason = f"Phục thù lỗi sai cũ (> {exclude_days} ngày trước) để kiểm chứng tiến bộ"
        elif is_diagnostic:
            reason = f"Bài chẩn đoán {priority_skill.capitalize()} để chốt trình độ chuẩn BR-12"
        else:
            reason = f"Phù hợp giai đoạn ôn tập ({t.get('difficulty', 'medium').upper()})"
        out.append(
            {
                "id": t["id"], "title": t["title"], "skill": priority_skill,
                "duration_min": t.get("duration_min") or (15 if item["is_micro"] else 45),
                "difficulty": t.get("difficulty") or "medium", "is_micro": item["is_micro"],
                "recommended_mode": mode, "slot_label": slot_label, "match_score": item["score"],
                "reason": reason, "link": f"/test-practice/{priority_skill}/{t['id']}?mode={mode}",
            }
        )
    return out
