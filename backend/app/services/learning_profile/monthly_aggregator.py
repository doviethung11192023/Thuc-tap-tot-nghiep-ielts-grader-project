"""Bộ tổng hợp Tiến độ Hàng tháng (Monthly Band Evolution UTC+7) & Bảng Tiêu chí W/S."""
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from .common import get_roadmap_config_cached, get_user_answers_cached, get_user_criteria_cached, round_to_ielts_band

VN_TZ = timezone(timedelta(hours=7))
CRITERIA_CATALOG = {
    "writing": [("TA", "Task Achievement (T1)"), ("TR", "Task Response (T2)"), ("CC", "Coherence & Cohesion"), ("LR", "Lexical Resource"), ("GRA", "Grammatical Range")],
    "speaking": [("FC", "Fluency & Coherence"), ("LR", "Lexical Resource"), ("GRA", "Grammatical Range"), ("P", "Pronunciation")],
}


def _to_vn_month(ts_str: Optional[str]) -> Optional[str]:
    if not ts_str:
        return None
    try:
        dt = datetime.fromisoformat(str(ts_str).replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(VN_TZ).strftime("%Y-%m")
    except Exception:
        return str(ts_str)[:7] if len(str(ts_str)) >= 7 else None


def _avg_band(vals: List[float]) -> Optional[float]:
    valid = [v for v in vals if v > 0]
    return round_to_ielts_band(sum(valid) / len(valid)) if valid else None


def compute_monthly_progression(
    user_id: str,
    attempts: List[Dict[str, Any]],
    daily_minutes: Dict[str, int],
    goal: Dict[str, Any],
) -> Dict[str, Any]:
    cfg = get_roadmap_config_cached()
    min_conf = cfg.get("min_attempts_confidence", 2)
    cur_month = datetime.now(VN_TZ).strftime("%Y-%m")

    by_month: Dict[str, List[Dict[str, Any]]] = {}
    for a in attempts:
        ym = _to_vn_month(a.get("submitted_at") or a.get("started_at"))
        if ym:
            by_month.setdefault(ym, []).append(a)
    by_month.setdefault(cur_month, [])

    hours_by_month: Dict[str, float] = {}
    for ds, mins in daily_minutes.items():
        hours_by_month[ds[:7]] = hours_by_month.get(ds[:7], 0.0) + mins / 60.0

    att_ids = [a["id"] for a in attempts if a.get("status") == "scored"]
    ans_by_att: Dict[str, List[bool]] = {}
    for ans in get_user_answers_cached(user_id, att_ids):
        ans_by_att.setdefault(ans["attempt_id"], []).append(bool(ans.get("is_correct")))

    months_sorted = sorted(by_month.keys())[-12:]
    series: List[Dict[str, Any]] = []
    prev_overall: Optional[float] = None
    prev_skills: Dict[str, Optional[float]] = {}

    for ym in months_sorted:
        rows = [r for r in by_month[ym] if r.get("status") in ("scored", "waiting_expert", "grading") or r.get("submitted_at")]
        scored = [r for r in rows if r.get("status") == "scored" and r.get("band") is not None and float(r["band"]) > 0]
        sk_bands: Dict[str, Optional[float]] = {}
        for sk in ("listening", "reading", "writing", "speaking"):
            sk_bands[sk] = _avg_band([float(r["band"]) for r in scored if str(r.get("skill", "")).lower() == sk])

        practiced = [v for v in sk_bands.values() if v is not None]
        overall = round_to_ielts_band(sum(practiced) / len(practiced)) if practiced else None
        mock_band = _avg_band([float(r["band"]) for r in scored if r.get("mode") in ("mock", "exam")])
        practice_band = _avg_band([float(r["band"]) for r in scored if r.get("mode") == "practice"])
        mock_cnt = sum(1 for r in rows if r.get("mode") in ("mock", "exam"))
        prac_cnt = len(rows) - mock_cnt

        q_total, q_ok = 0, 0
        for r in scored:
            if r["id"] in ans_by_att:
                vals = ans_by_att[r["id"]]
                q_total += len(vals)
                q_ok += sum(1 for v in vals if v)
        lr_acc = round((q_ok / q_total) * 100) if q_total > 0 else None

        delta = round(overall - prev_overall, 1) if (overall is not None and prev_overall is not None) else None
        best_skill, best_gain = None, 0.0
        for sk, val in sk_bands.items():
            if val is not None and prev_skills.get(sk) is not None and (val - prev_skills[sk]) > best_gain:
                best_gain = round(val - prev_skills[sk], 1)
                best_skill = f"{sk.capitalize()} (+{best_gain})"

        is_provisional = len(scored) < min_conf
        if len(scored) == 0:
            insight = f"Tháng {ym[5:]}/{ym[:4]} chưa có bài chấm điểm — hãy hoàn thành ít nhất {min_conf} bài để theo dõi xu hướng."
        elif is_provisional:
            insight = f"Dữ liệu tạm tính ({len(scored)}/{min_conf} bài tối thiểu). Làm thêm bài để xác nhận xu hướng thật."
        elif delta is not None and delta < 0 and mock_cnt > prac_cnt:
            insight = f"Điểm giảm nhẹ ({delta:+.1f}) do tăng tỷ trọng bài Thi thử Mock áp lực phòng thi ({mock_cnt} Mock / {prac_cnt} Practice)."
        elif delta is not None and delta > 0:
            insight = f"Tăng trưởng tích cực {delta:+.1f} band so với tháng trước" + (f", nổi bật ở {best_skill}." if best_skill else ".")
        else:
            insight = f"Phong độ ổn định ở Band {overall:.1f} qua {len(scored)} bài chấm điểm trong tháng."

        y, m = ym.split("-")
        series.append(
            {
                "month": ym, "label": f"T{int(m)}/{y[2:]}", "overall_band": overall,
                "mock_band": mock_band, "practice_band": practice_band, **sk_bands,
                "month_over_month_delta": delta, "total_tests": len(rows), "scored_tests": len(scored),
                "mock_count": mock_cnt, "practice_count": prac_cnt,
                "study_hours": round(hours_by_month.get(ym, 0.0), 1),
                "lr_accuracy_percent": lr_acc, "is_provisional": is_provisional,
                "best_improved_skill": best_skill, "monthly_insight": insight,
            }
        )
        if overall is not None:
            prev_overall = overall
        for sk, val in sk_bands.items():
            if val is not None:
                prev_skills[sk] = val

    latest = series[-1]
    prev_entry = next((p for p in reversed(series[:-1]) if p["overall_band"] is not None), None)
    scorecard = {
        "current_month": latest["month"], "current_label": latest["label"],
        "overall_band": latest["overall_band"] or 0.0,
        "band_delta": latest["month_over_month_delta"],
        "lr_accuracy": latest["lr_accuracy_percent"],
        "accuracy_delta": (latest["lr_accuracy_percent"] - prev_entry["lr_accuracy_percent"]) if (latest["lr_accuracy_percent"] is not None and prev_entry and prev_entry["lr_accuracy_percent"] is not None) else None,
        "total_tests": latest["total_tests"],
        "tests_delta": (latest["total_tests"] - prev_entry["total_tests"]) if prev_entry else None,
        "study_hours": latest["study_hours"],
        "best_skill": latest["best_improved_skill"] or "-",
        "is_provisional": latest["is_provisional"],
        "insight": latest["monthly_insight"],
        "target_band": float(goal["target_overall"]),
    }
    return {"monthly_progression": series, "monthly_scorecard": scorecard}


def compute_criterion_mastery(user_id: str, attempts: List[Dict[str, Any]], goal: Dict[str, Any]) -> Dict[str, List[Dict[str, Any]]]:
    att_ids = [a["id"] for a in attempts if str(a.get("skill", "")).lower() in ("writing", "speaking") and a.get("status") in ("scored", "waiting_expert")]
    att_rank = {aid: i for i, aid in enumerate(att_ids)}
    rows = get_user_criteria_cached(user_id, att_ids)
    grouped: Dict[tuple, List[tuple]] = {}
    for r in rows:
        key = (str(r.get("skill") or "").lower(), r["code"])
        grouped.setdefault(key, []).append((att_rank.get(r["attempt_id"], 99), float(r["band"])))

    out: Dict[str, List[Dict[str, Any]]] = {"writing": [], "speaking": []}
    for sk in ("writing", "speaking"):
        t_band = float(goal.get(f"target_{sk}") or goal["target_overall"])
        for code, label in CRITERIA_CATALOG[sk]:
            items = sorted(grouped.get((sk, code), []), key=lambda x: x[0])  # mới -> cũ
            bands = [b for _, b in items]
            avg = round_to_ielts_band(sum(bands[:5]) / len(bands[:5])) if bands else 0.0
            delta = None
            if len(bands) >= 2:
                mid = max(1, len(bands) // 2)
                delta = round((sum(bands[:mid]) / mid) - (sum(bands[mid:]) / len(bands[mid:])), 1)
            status = "strong" if avg >= t_band and avg > 0 else ("improving" if (delta or 0) > 0 else "needs_work")
            out[sk].append({"code": code, "name": label, "average_band": avg, "target_band": t_band, "delta": delta, "sample_count": len(bands), "status": status})
    return out
