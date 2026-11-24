"""Adaptive Streak, Freeze, Persistent Streak Repair 48h & Weekly Plan theo GMT+7 (BR-27..BR-29)."""
from datetime import date, datetime, timedelta, timezone
from typing import Any

from .common import TZ_VN
from .gamification_config import get_gamification_config
from .valid_study_day import is_valid_study_attempt

REPAIR_MIN_BROKEN_STREAK = 5
REPAIR_COOLDOWN_DAYS = 30
REPAIR_REQUIRED_UNITS = 2
REPAIR_REQUIRED_LR_ANSWERS = 15


def _to_vn_date(val: Any) -> str | None:
    if not val:
        return None
    try:
        dt = datetime.fromisoformat(str(val).replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(TZ_VN).date().isoformat()
    except Exception:
        return None


def _parse_date(raw: Any) -> date | None:
    if not raw:
        return None
    try:
        return date.fromisoformat(str(raw)[:10])
    except Exception:
        return None


def _parse_utc_dt(raw: Any) -> datetime | None:
    if not raw:
        return None
    try:
        dt = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except Exception:
        return None


def _attempt_meets_grace_rule(att: dict[str, Any]) -> bool:
    if att.get("status") not in ("scored", "waiting_expert", "grading"):
        return False
    sk = str(att.get("skill") or "").lower()
    if sk in ("writing", "speaking"):
        return True
    raw, qcnt = att.get("raw_score"), att.get("question_count")
    if raw is not None and qcnt and float(qcnt) > 0:
        return (float(raw) / float(qcnt)) >= 0.60
    band = att.get("band")
    return band is not None and float(band) >= 5.5


def _prior_run_length(anchor: date, active_dates: set[str], repaired_set: set[str]) -> int:
    run, c = 0, anchor
    while c.isoformat() in active_dates or c.isoformat() in repaired_set:
        if c.isoformat() in active_dates:
            run += 1
        c -= timedelta(days=1)
    return run


def compute_adaptive_streak(
    attempts: list[dict[str, Any]],
    daily_minutes: dict[str, int],
    goal: dict[str, Any],
    today_vn: date | None = None,
    cfg: dict[str, Any] | None = None,
    state: dict[str, Any] | None = None,
    quality_map: dict[str, dict[str, int]] | None = None,
    now_vn_dt: datetime | None = None,
) -> dict[str, Any]:
    """Tính chuỗi học chuẩn BR-27..BR-29: Valid Study Day, Freeze (xuất frozen_dates), Repair 48h bền vững & Kế hoạch tuần."""
    conf = cfg or get_gamification_config()
    st = state or {}
    now_vn = now_vn_dt or datetime.now(TZ_VN)
    today = today_vn or now_vn.date()
    today_iso = today.isoformat()
    exam_date = _parse_date(goal.get("test_date"))
    days_until_exam = (exam_date - today).days if exam_date else None

    sprint_days = int(conf.get("sprint_days_before_exam", 60))
    is_sprint = days_until_exam is not None and 0 <= days_until_exam <= sprint_days
    target_min = int(conf.get("sprint_daily_minutes", 30) if is_sprint else conf.get("normal_daily_minutes", 15))
    freeze_step = max(1, int(conf.get("freeze_per_streak_days", 7)))
    max_freezes = max(0, int(conf.get("max_freezes_per_month", 2)))
    grace_gap = max(1, int(conf.get("grace_recovery_max_gap_days", 2)))
    repaired_set = {str(d)[:10] for d in (st.get("repaired_dates") or [])}

    daily_valid_units: dict[str, int] = {}
    daily_valid_ws: dict[str, int] = {}
    daily_lr_answers: dict[str, int] = {}
    attempt_dates_seen: set[str] = set()
    today_grace_qualified = False
    for att in attempts:
        raw_ds = _to_vn_date(att.get("submitted_at") or att.get("started_at"))
        if raw_ds:
            attempt_dates_seen.add(raw_ds)
        if not is_valid_study_attempt(att, quality_map):
            continue
        ds = raw_ds
        if not ds:
            continue
        daily_valid_units[ds] = daily_valid_units.get(ds, 0) + 1
        sk = str(att.get("skill") or "").lower()
        if sk in ("writing", "speaking"):
            daily_valid_ws[ds] = daily_valid_ws.get(ds, 0) + 1
        else:
            qinfo = (quality_map or {}).get(str(att.get("id") or ""))
            ans_cnt = int(att.get("answered_non_empty") if att.get("answered_non_empty") is not None else (qinfo or {}).get("answered_non_empty", 5))
            daily_lr_answers[ds] = daily_lr_answers.get(ds, 0) + ans_cnt
        if ds == today_iso and _attempt_meets_grace_rule(att):
            today_grace_qualified = True

    # BR-28: Ngày có bài nộp bắt buộc đạt >= 1 bài hợp lệ (chặn nộp trắng dù có phút); ngày chỉ có daily_minutes phải >= target_min
    active_dates = {
        ds for ds in (set(daily_minutes.keys()) | set(daily_valid_units.keys()))
        if daily_valid_units.get(ds, 0) >= 1 or (ds not in attempt_dates_seen and daily_minutes.get(ds, 0) >= target_min)
    }

    longest_streak = 0
    if active_dates:
        ordered = sorted(date.fromisoformat(d) for d in active_dates)
        run, longest_streak = 1, 1
        for prev_d, cur_d in zip(ordered, ordered[1:]):
            gap = (cur_d - prev_d).days
            bridged = gap > 1 and all((prev_d + timedelta(days=k)).isoformat() in repaired_set for k in range(1, gap))
            run = run + 1 if (gap == 1 or bridged) else 1
            longest_streak = max(longest_streak, run)

    freezes_earned = min(max_freezes, longest_streak // freeze_step)
    today_mins = daily_minutes.get(today_iso, 0)
    today_done = daily_valid_units.get(today_iso, 0)
    today_met = today_iso in active_dates

    # Walk backward with Repaired bridges + Monthly Freeze bridges (Freeze KHÔNG cộng +1 ngày nghỉ)
    cursor = today if today_met else today - timedelta(days=1)
    current_streak, freezes_used = 0, 0
    freezes_by_month: dict[str, int] = {}
    frozen_dates: list[str] = []
    for _ in range(365):
        iso = cursor.isoformat()
        if iso in active_dates:
            current_streak += 1
            cursor -= timedelta(days=1)
        elif iso in repaired_set:
            cursor -= timedelta(days=1)
        else:
            ym = iso[:7]
            prev_iso = (cursor - timedelta(days=1)).isoformat()
            if freezes_used < freezes_earned and freezes_by_month.get(ym, 0) < max_freezes and (prev_iso in active_dates or prev_iso in repaired_set):
                freezes_used += 1
                freezes_by_month[ym] = freezes_by_month.get(ym, 0) + 1
                frozen_dates.append(iso)
                cursor -= timedelta(days=1)
            else:
                break

    # Weekly progress (từ thứ Hai 00:00 GMT+7)
    week_monday = today - timedelta(days=today.weekday())
    weekly_completed_days = sum(1 for d_off in range(7) if (week_monday + timedelta(days=d_off)).isoformat() in active_dates)
    weekly_goal_days = int(st.get("weekly_goal_days") or 5)

    # Grace Recovery + Persistent Streak Repair 48h (BR-29)
    grace_eligible, grace_recovered_today, recoverable_streak = False, False, 0
    can_repair, broken_backup, repair_deadline_iso = False, 0, None
    repair_gap_dates: list[str] = []
    repair_completed_units = 0

    past_active = [date.fromisoformat(d) for d in active_dates if date.fromisoformat(d) < today]
    last_active_iso = max(active_dates) if active_dates else None
    last_repaired_dt = _parse_utc_dt(st.get("last_repaired_at"))
    cooldown_ok = last_repaired_dt is None or (now_vn.astimezone(timezone.utc) - last_repaired_dt).days >= REPAIR_COOLDOWN_DAYS

    if past_active:
        latest_prev = max(past_active)
        gap_days = (today - latest_prev).days - 1
        if 1 <= gap_days <= grace_gap:
            prior_run = _prior_run_length(latest_prev, active_dates, repaired_set)
            if prior_run >= 2:
                rec = max(1, prior_run // 2)
                if current_streak == 0 and not today_met:
                    grace_eligible, recoverable_streak = True, rec
                elif today_met and current_streak == 1 and today_grace_qualified:
                    current_streak = 1 + rec
                    grace_recovered_today, recoverable_streak = True, rec
            if prior_run >= REPAIR_MIN_BROKEN_STREAK and cooldown_ok and (current_streak == 0 or (today_met and current_streak <= 1 + max(1, prior_run // 2))):
                gap_list = [(latest_prev + timedelta(days=k)).isoformat() for k in range(1, gap_days + 1)]
                if any(g not in repaired_set for g in gap_list):
                    can_repair = True
                    broken_backup = prior_run
                    repair_gap_dates = gap_list
                    break_day = latest_prev + timedelta(days=2)
                    deadline_dt = datetime(break_day.year, break_day.month, break_day.day, 0, 5, tzinfo=TZ_VN) + timedelta(hours=48)
                    repair_deadline_iso = deadline_dt.isoformat()
                    win_days = [today_iso, (today - timedelta(days=1)).isoformat()]
                    ws_units = sum(daily_valid_ws.get(d, 0) for d in win_days)
                    lr_ans = sum(daily_lr_answers.get(d, 0) for d in win_days)
                    units_done = sum(daily_valid_units.get(d, 0) for d in win_days)
                    repair_completed_units = REPAIR_REQUIRED_UNITS if (ws_units >= 1 or (units_done >= REPAIR_REQUIRED_UNITS and lr_ans >= REPAIR_REQUIRED_LR_ANSWERS)) else min(1, units_done)

    midnight_vn = datetime(today.year, today.month, today.day, 0, 0, tzinfo=TZ_VN) + timedelta(days=1)
    hours_left = round(max(0.0, (midnight_vn - now_vn).total_seconds() / 3600.0), 1)

    return {
        "current_streak": current_streak,
        "longest_streak": max(longest_streak, current_streak),
        "mode": "sprint" if is_sprint else "standard",
        "daily_target_minutes": target_min,
        "days_until_exam": days_until_exam,
        "last_active_date": last_active_iso,
        "today_minutes": today_mins,
        "today_completed": today_done,
        "today_met": today_met,
        "today_progress_pct": 100 if today_met else min(100, round(today_mins / max(target_min, 1) * 100)),
        "freezes_earned": freezes_earned,
        "freezes_used": freezes_used,
        "freezes_remaining": max(0, freezes_earned - freezes_used),
        "max_freezes_per_month": max_freezes,
        "frozen_dates": sorted(frozen_dates),
        "weekly_goal_days": weekly_goal_days,
        "weekly_completed_days": weekly_completed_days,
        "reminder_enabled": bool(st.get("reminder_enabled", True)),
        "hours_until_midnight_vn": hours_left,
        "can_repair": can_repair,
        "broken_streak_backup": broken_backup,
        "repair_deadline_at": repair_deadline_iso,
        "repair_gap_dates": repair_gap_dates,
        "repair_progress": {"completed": repair_completed_units, "required": REPAIR_REQUIRED_UNITS},
        "grace_recovery": {
            "eligible": grace_eligible,
            "recovered_today": grace_recovered_today,
            "recoverable_streak": recoverable_streak,
            "requirement": (
                f"Hoàn thành 1 bài đạt >= 60% (>= 5 câu) hoặc 1 bài Writing/Speaking trong hôm nay để khôi phục {recoverable_streak} ngày chuỗi."
                if grace_eligible
                else (f"Đã khôi phục thành công +{recoverable_streak} ngày chuỗi nhờ hoàn thành bài đạt chuẩn hôm nay!" if grace_recovered_today else None)
            ),
        },
    }
