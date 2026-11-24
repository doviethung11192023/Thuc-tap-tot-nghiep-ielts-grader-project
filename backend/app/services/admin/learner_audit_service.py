"""Bảng Hội Tụ Thống Kê Học Viên cho Admin (3-Query Bulk Vectorization + RAM Cache)."""
import threading
from datetime import datetime, timedelta, timezone
from time import perf_counter
from typing import Any, Dict, List, Optional
from app.db.supabase import db
from app.services.learning_profile.common import (
    compute_daily_active_minutes,
    get_all_published_tests,
    get_from_cache,
    get_roadmap_config_cached,
    round_to_ielts_band,
    set_to_cache,
)

VN_TZ = timezone(timedelta(hours=7))
SKILLS = ("listening", "reading", "writing", "speaking")


def _warm_published_tests_bg() -> None:
    try:
        get_all_published_tests()
    except Exception:
        pass


def _summarize_one_learner(
    profile: Dict[str, Any],
    goal_row: Dict[str, Any],
    attempts: List[Dict[str, Any]],
    cfg: Dict[str, int],
    cur_month: str,
) -> Dict[str, Any]:
    input_band = round_to_ielts_band(float(goal_row.get("input_band") or 4.0))
    target_overall = round_to_ielts_band(float(goal_row.get("target_overall") or 6.5))
    test_date = str(goal_row.get("test_date") or "2026-12-31")

    skill_bands: Dict[str, float] = {}
    ranked = []
    high_cnt, low_cnt = 0, 0

    for sk in SKILLS:
        sk_all = [a for a in attempts if str(a.get("skill", "")).lower() == sk]
        scored = [a for a in sk_all if a.get("status") == "scored" and a.get("band") is not None and float(a["band"]) > 0]
        mocks = [a for a in scored if a.get("mode") in ("mock", "exam") and (sk in ("writing", "speaking") or (a.get("question_count") or 40) >= 30)]
        if mocks:
            cur = round_to_ielts_band(sum(float(a["band"]) for a in mocks[: cfg["mock_window"]]) / len(mocks[: cfg["mock_window"]]))
            conf = "high"
            high_cnt += 1
        elif len(scored) >= cfg["min_attempts_confidence"]:
            cur = round_to_ielts_band(sum(float(a["band"]) for a in scored[: cfg["practice_window"]]) / len(scored[: cfg["practice_window"]]))
            conf = "low"
            low_cnt += 1
        else:
            cur = input_band
            conf = "insufficient"
        t_sk = round_to_ielts_band(float(goal_row.get(f"target_{sk}") or target_overall))
        gap = round(max(0.0, t_sk - cur), 1)
        skill_bands[sk] = cur
        ranked.append((1 if conf == "insufficient" else 0, gap, -cur, sk))

    ranked.sort(reverse=True)
    priority_skill = ranked[0][3]
    predicted_band = round_to_ielts_band(sum(skill_bands.values()) / 4.0)
    conf_label = "Chuẩn Mock" if high_cnt >= 2 else ("Ước lượng Practice" if (high_cnt + low_cnt) > 0 else "Chờ chẩn đoán")

    daily_mins = compute_daily_active_minutes(attempts)
    month_hours = round(sum(m for d, m in daily_mins.items() if d.startswith(cur_month)) / 60.0, 1)
    month_tests = 0
    month_mocks = 0
    for a in attempts:
        ts = a.get("submitted_at") or a.get("started_at")
        if not ts:
            continue
        try:
            dt = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
            ym = (dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt).astimezone(VN_TZ).strftime("%Y-%m")
            if ym == cur_month:
                month_tests += 1
                if a.get("mode") in ("mock", "exam"):
                    month_mocks += 1
        except Exception:
            pass

    return {
        "id": profile["id"],
        "full_name": profile.get("full_name") or "Chưa đặt tên",
        "email": profile.get("email") or "",
        "is_active": bool(profile.get("is_active", True)),
        "input_band": input_band,
        "predicted_band": predicted_band,
        "target_band": target_overall,
        "confidence_label": conf_label,
        "priority_skill": priority_skill,
        "skill_bands": skill_bands,
        "total_attempts": len(attempts),
        "scored_attempts": sum(1 for a in attempts if a.get("status") == "scored"),
        "waiting_expert_count": sum(1 for a in attempts if a.get("status") == "waiting_expert"),
        "month_tests": month_tests,
        "month_mocks": month_mocks,
        "month_study_hours": month_hours,
        "test_date": test_date,
    }


def list_learners_analytics(page: int = 1, limit: int = 10, search: Optional[str] = None) -> Dict[str, Any]:
    """Lấy danh sách + thống kê tổng hợp mọi học viên chỉ bằng đúng 3 Batch Queries."""
    t0 = perf_counter()
    cache_key = f"admin_learners_analytics:{page}:{limit}:{(search or '').strip().lower()}"
    cached = get_from_cache(cache_key)
    if cached is not None:
        return {**cached, "cache_hit": True, "elapsed_ms": round((perf_counter() - t0) * 1000, 1)}

    q = db().table("profiles").select("id, email, full_name, is_active, created_at", count="exact").eq("role", "learner").not_.like("email", "pentest_arch_%")
    if search and search.strip():
        s = search.strip()
        q = q.or_(f"email.ilike.%{s}%,full_name.ilike.%{s}%")
    offset = (page - 1) * limit
    res = q.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    profiles = res.data or []
    total = res.count if getattr(res, "count", None) is not None else len(profiles)

    uids = [p["id"] for p in profiles]
    goals_map: Dict[str, Dict[str, Any]] = {}
    attempts_map: Dict[str, List[Dict[str, Any]]] = {uid: [] for uid in uids}

    if uids:
        g_rows = db().table("learner_profiles").select(
            "user_id, input_band, target_overall, target_listening, target_reading, target_writing, target_speaking, test_date"
        ).in_("user_id", uids).execute().data or []
        goals_map = {g["user_id"]: g for g in g_rows}

        a_rows = db().table("attempt_results").select(
            "attempt_id, learner_id, skill, mode, status, started_at, submitted_at, raw_score, question_count, band, preliminary_band"
        ).in_("learner_id", uids).neq("status", "abandoned").order("started_at", desc=True).execute().data or []
        for r in a_rows:
            attempts_map.setdefault(r["learner_id"], []).append({**r, "id": r["attempt_id"]})

    cfg = get_roadmap_config_cached()
    cur_month = datetime.now(VN_TZ).strftime("%Y-%m")
    items = [
        _summarize_one_learner(p, goals_map.get(p["id"], {}), attempts_map.get(p["id"], []), cfg, cur_month)
        for p in profiles
    ]

    # Silently warm 300s global published_tests cache before Admin opens a White-Box modal
    if get_from_cache("published_tests") is None:
        threading.Thread(target=_warm_published_tests_bg, daemon=True).start()

    payload = {"items": items, "total": total, "query_count": 3 if uids else 1, "current_month": cur_month}
    set_to_cache(cache_key, payload, ttl_seconds=30)
    return {**payload, "cache_hit": False, "elapsed_ms": round((perf_counter() - t0) * 1000, 1)}
