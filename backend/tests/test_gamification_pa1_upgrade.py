"""Unit & Pentest suite for PA1 Lean Hybrid Gamification Upgrade (BR-27..BR-32, FR-53..FR-60)."""
from datetime import date, datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

from app.services.learning_profile.adaptive_streak_service import compute_adaptive_streak
from app.services.learning_profile.common import TZ_VN
from app.services.learning_profile.learner_badges_service import compute_learner_badges
from app.services.learning_profile.streak_nudge_cron import run_daily_streak_nudge
from app.services.learning_profile.valid_study_day import count_mastered_lr_types, is_valid_study_attempt

_CFG = {
    "normal_daily_minutes": 15,
    "sprint_daily_minutes": 30,
    "sprint_days_before_exam": 60,
    "freeze_per_streak_days": 7,
    "max_freezes_per_month": 2,
    "grace_recovery_max_gap_days": 2,
    "streak_tiers": {"bronze": 3, "silver": 14, "gold": 30},
    "mastery_gold_accuracy_pct": 80,
    "mastery_gold_min_types": 1,
    "mastery_gold_min_scored": 20,
    "breakthrough_bronze_delta": 0.5,
    "breakthrough_silver_band": 6.5,
}


def test_pa1_01_br28_blocks_blank_lr_short_writing_and_no_speech():
    """PA1-01: BR-28 Anti-Streak-Creep blocks blank L/R (<5 answers), Writing <100 words, and Speaking no_speech."""
    blank_r = {"id": "a1", "skill": "reading", "status": "scored", "raw_score": 0, "band": 0.0, "submitted_at": "2026-11-23T08:00:00+07:00"}
    short_w = {"id": "a2", "skill": "writing", "status": "scored", "band": 4.0, "submitted_at": "2026-11-23T08:10:00+07:00"}
    silent_s = {"id": "a3", "skill": "speaking", "status": "no_speech", "submitted_at": "2026-11-23T08:20:00+07:00"}
    qmap = {"a1": {"answered_non_empty": 0}, "a2": {"word_count": 42}}

    assert is_valid_study_attempt(blank_r, qmap) is False
    assert is_valid_study_attempt(short_w, qmap) is False
    assert is_valid_study_attempt(silent_s, qmap) is False

    st = compute_adaptive_streak(
        [blank_r, short_w, silent_s],
        {"2026-11-23": 20},
        {"test_date": "2027-05-01"},
        today_vn=date(2026, 11, 23),
        cfg=_CFG,
        quality_map=qmap,
    )
    assert st["today_met"] is False
    assert st["current_streak"] == 0


def test_pa1_02_br28_accepts_valid_lr_writing_and_speaking():
    """PA1-02: BR-28 accepts L/R >= 5 answers, Writing >= 100 words, Speaking scored."""
    ok_r = {"id": "r1", "skill": "reading", "status": "scored", "submitted_at": "2026-11-23T08:00:00+07:00"}
    ok_w = {"id": "w1", "skill": "writing", "status": "waiting_expert", "submitted_at": "2026-11-22T09:00:00+07:00"}
    ok_s = {"id": "s1", "skill": "speaking", "status": "scored", "submitted_at": "2026-11-21T10:00:00+07:00"}
    qmap = {"r1": {"answered_non_empty": 6}, "w1": {"word_count": 165}}

    st = compute_adaptive_streak(
        [ok_r, ok_w, ok_s],
        {"2026-11-23": 10, "2026-11-22": 20, "2026-11-21": 12},
        {"test_date": "2027-05-01"},
        today_vn=date(2026, 11, 23),
        cfg=_CFG,
        quality_map=qmap,
    )
    assert st["today_met"] is True
    assert st["current_streak"] == 3


def test_pa1_03_heatmap_frozen_dates_exposed_without_inflation():
    """PA1-03: Monthly Freeze bridges missed day, exposes frozen_dates for Heatmap, and does not inflate streak."""
    today = date(2026, 11, 23)
    # 7 consecutive days (Nov 15..21) -> earns 1 Freeze; missed Nov 22 -> bridged; studied Nov 23 -> streak = 8
    studied = [today - timedelta(days=d) for d in (8, 7, 6, 5, 4, 3, 2, 0)]
    attempts = [
        {"id": f"a-{i}", "skill": "reading", "status": "scored", "answered_non_empty": 10, "submitted_at": f"{d.isoformat()}T10:00:00+07:00"}
        for i, d in enumerate(studied)
    ]
    st = compute_adaptive_streak(attempts, {}, {"test_date": "2027-05-01"}, today_vn=today, cfg=_CFG)
    assert st["current_streak"] == 8
    assert st["frozen_dates"] == ["2026-11-22"]
    assert st["freezes_used"] == 1


def test_pa1_04_persistent_streak_repair_survives_next_day_and_enforces_30d_cooldown():
    """PA1-04: BR-29 Streak Repair restores streak >= 5 permanently across future days and enforces 30d cooldown."""
    # Studied 5 days Nov 16..20 (streak=5, <7 so 0 freezes earned), missed Nov 21, studied 2 valid units Nov 22
    studied = [date(2026, 11, d) for d in (16, 17, 18, 19, 20)]
    attempts = [
        {"id": f"old-{i}", "skill": "reading", "status": "scored", "answered_non_empty": 10, "submitted_at": f"{d.isoformat()}T10:00:00+07:00"}
        for i, d in enumerate(studied)
    ]
    attempts.append({"id": "rep-1", "skill": "reading", "status": "scored", "answered_non_empty": 10, "submitted_at": "2026-11-22T10:00:00+07:00"})
    attempts.append({"id": "rep-2", "skill": "reading", "status": "scored", "answered_non_empty": 10, "submitted_at": "2026-11-22T11:00:00+07:00"})

    # Before repair on Nov 22: eligible for 48h repair with 2/2 progress
    before = compute_adaptive_streak(
        attempts, {}, {"test_date": "2027-05-01"}, today_vn=date(2026, 11, 22), cfg=_CFG, state={"repaired_dates": [], "last_repaired_at": None}
    )
    assert before["can_repair"] is True
    assert before["broken_streak_backup"] == 5
    assert before["repair_progress"] == {"completed": 2, "required": 2}
    assert before["repair_gap_dates"] == ["2026-11-21"]

    # After persisting repair + studying on Nov 23: rescued streak stays 7 (5 + Nov 22 + Nov 23)!
    attempts.append({"id": "next-day", "skill": "reading", "status": "scored", "answered_non_empty": 10, "submitted_at": "2026-11-23T09:00:00+07:00"})
    repaired_state = {"repaired_dates": ["2026-11-21"], "last_repaired_at": "2026-11-22T12:00:00+00:00"}
    after = compute_adaptive_streak(
        attempts, {}, {"test_date": "2027-05-01"}, today_vn=date(2026, 11, 23), cfg=_CFG, state=repaired_state
    )
    assert after["current_streak"] == 7
    assert after["can_repair"] is False


def test_pa1_05_br30_mastery_anti_farming_blocks_same_test_within_24h():
    """PA1-05: BR-30 rejects repeating the same test_id within 24h to farm Mastery >= 20 questions."""
    # 3 repeats of the SAME test_id within 2 hours (10 questions each = 30 raw, but only 10 valid!)
    same_day_attempts = [
        {"id": f"att-{i}", "test_id": "test-short-1", "skill": "reading", "status": "scored", "submitted_at": f"2026-11-23T0{i + 1}:00:00+00:00"}
        for i in range(3)
    ]
    answers = [
        {"attempt_id": f"att-{i}", "question_type": "true_false_not_given", "is_correct": True}
        for i in range(3) for _ in range(10)
    ]
    cnt_farmed, _ = count_mastered_lr_types(same_day_attempts, answers, min_accuracy_pct=80.0, min_questions=20)
    assert cnt_farmed == 0

    # Different tests OR >= 24h apart (10 + 10 = 20 valid questions at 90% accuracy) -> mastered!
    legit_attempts = [
        {"id": "att-a", "test_id": "test-1", "skill": "reading", "status": "scored", "submitted_at": "2026-11-21T08:00:00+00:00"},
        {"id": "att-b", "test_id": "test-1", "skill": "reading", "status": "scored", "submitted_at": "2026-11-23T09:00:00+00:00"},
    ]
    legit_answers = [
        {"attempt_id": aid, "question_type": "true_false_not_given", "is_correct": idx < 9}
        for aid in ("att-a", "att-b") for idx in range(10)
    ]
    cnt_legit, _ = count_mastered_lr_types(legit_attempts, legit_answers, min_accuracy_pct=80.0, min_questions=20)
    assert cnt_legit == 1


def test_pa1_06_fr58_personal_best_plus_05_unlocks_breakthrough_bronze():
    """PA1-06: FR-58 beating previous 5-attempt skill avg by >= +0.5 unlocks breakthrough_bronze even if predicted == input."""
    attempts = [
        {"id": "new", "skill": "reading", "status": "scored", "band": 6.0},
        {"id": "p1", "skill": "reading", "status": "scored", "band": 5.5},
        {"id": "p2", "skill": "reading", "status": "scored", "band": 5.0},
    ]
    res = compute_learner_badges(attempts, {"current_streak": 1, "longest_streak": 1}, {"input_band": 6.0, "target_overall": 7.0}, predicted_band=6.0, cfg=_CFG)
    bb = next(b for b in res["badges"] if b["id"] == "breakthrough_bronze")
    assert bb["unlocked"] is True
    assert bb["current_value"] >= 0.5


def test_pa1_07_br32_nudge_cron_respects_vn_hour_20():
    """PA1-07: BR-32 Smart Nudge skips non-20:00 GMT+7 hours so UTC cloud servers never nudge at 3 AM VN."""
    morning_vn = datetime(2026, 11, 23, 9, 0, tzinfo=TZ_VN)
    res = run_daily_streak_nudge(force_hour_check=True, now_vn=morning_vn)
    assert res["skipped_hour"] == 9
    assert res["reminders_sent"] == 0
