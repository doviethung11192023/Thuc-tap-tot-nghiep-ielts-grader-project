"""Unit tests cho Wave 4 (DATA-01..07 normalizers, gates) & Wave 5 (Expert 3-Pillar, Streak & Badges)."""
import asyncio
from datetime import date, datetime, timedelta
from pathlib import Path
import sys

import pytest
from tests.fake_supabase import FakeSupabase

from app.core.domain_errors import DomainError, InvalidRequestError
from app.services.cms import cms_tests
from app.services.expert import dispatcher, expert_penalty_service, expert_policy_config, expert_rps_service
from app.services.learning_profile import adaptive_streak_service, learner_badges_service

_SCRIPTS_DIR = str(Path(__file__).resolve().parents[1] / "scripts")
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

from wave4_passage_normalizer import (  # noqa: E402
    fix_broken_italic_blanks,
    normalize_completion_template,
    normalize_reading_passage,
)


def test_wave4_passage_template_and_explanation_normalizers():
    glued = "KoalasA Koalas are marsupials living in trees. They sleep long hours. B Yet their habitat faces threats today."
    norm = normalize_reading_passage(glued)
    assert norm.startswith("Koalas\n\nA Koalas")
    assert "\n\nB Yet" in norm

    unlettered = "Love stories“Love stories” are often linked with fairy tales. One sentence. Two sentences. Three sentences. Four sentences."
    norm2 = normalize_reading_passage(unlettered)
    assert norm2.startswith("Love stories\n\n“Love stories”")

    tpl = normalize_completion_template("Header - Item one {{1}} - Item two {{2}} - Item three {{3}}")
    assert tpl.count("\n- ") == 3
    tbl = "<table><tr><td>{{1}}</td></tr></table>"
    assert normalize_completion_template(tbl) == tbl

    exp = "_Listen and write ______ or words._\n| row ______ | \"match ______\" |"
    fixed = fix_broken_italic_blanks(exp)
    assert "*Listen and write ______ or words.*" in fixed
    assert '| row ______ | "match ______" |' in fixed


def test_wave4_publish_40_question_gate(monkeypatch):
    from app.services.cms import cms_publish_validation

    qs_39 = [{"id": f"q{i}", "number": i + 1, "question_options": []} for i in range(39)]
    qs_micro = [{"id": "qm1", "number": 1, "question_options": []}]
    fake = FakeSupabase(
        tests=[
            {
                "id": "t_39",
                "skill": "reading",
                "source_type": "original",
                "source_name": "cambridge",
                "license": None,
                "status": "draft",
                "sections": [{"id": "s1", "order_no": 1, "lr_sections": [{"passage": "P", "audio_key": None, "question_groups": [{"id": "g1", "question_type": "completion", "select_count": None, "group_options": [], "questions": qs_39}]}]}],
            },
            {
                "id": "t_micro",
                "skill": "reading",
                "source_type": "original",
                "source_name": "micro_exercise",
                "license": None,
                "status": "draft",
                "sections": [{"id": "s2", "order_no": 1, "lr_sections": [{"passage": "P", "audio_key": None, "question_groups": [{"id": "g2", "question_type": "completion", "select_count": None, "group_options": [], "questions": qs_micro}]}]}],
            },
        ],
        sections=[{"id": "s1", "test_id": "t_39"}, {"id": "s2", "test_id": "t_micro"}],
        question_keys=[{"question_id": q["id"], "accepted_answers": ["ans"]} for q in (qs_39 + qs_micro)],
        audit_logs=[],
    )
    monkeypatch.setattr(cms_tests, "db", lambda: fake)
    monkeypatch.setattr(cms_publish_validation, "db", lambda: fake)
    monkeypatch.setattr("app.services.admin.staff_accounts.db", lambda: fake)

    with pytest.raises(InvalidRequestError):
        cms_tests.set_status("adm1", "t_39", "published")

    res = cms_tests.set_status("adm1", "t_micro", "published")
    assert res["status"] == "published"


def test_wave5_expert_3pillar_completeness_rps_and_penalty(monkeypatch):
    now = datetime(2026, 11, 21, 10, 0, tzinfo=expert_penalty_service.TZ_VN)
    fake = FakeSupabase(
        system_settings=[],
        expert_profiles=[
            {"user_id": "exp_gold", "is_available": True, "max_active_reviews": 5},
            {"user_id": "exp_bad", "is_available": True, "max_active_reviews": 4},
        ],
        profiles=[{"id": "adm1", "role": "admin", "is_active": True}],
        notifications=[],
        audit_logs=[],
        review_assignments=[
            {"id": "a1", "expert_id": "exp_gold", "evaluation_id": "ev1", "assigned_at": (now - timedelta(days=2)).isoformat(), "due_at": (now - timedelta(hours=12)).isoformat(), "ended_at": (now - timedelta(days=1)).isoformat(), "end_reason": "completed", "note": None},
            {"id": "a2", "expert_id": "exp_bad", "evaluation_id": None, "assigned_at": (now - timedelta(days=5)).isoformat(), "due_at": (now - timedelta(days=3)).isoformat(), "ended_at": (now - timedelta(days=2)).isoformat(), "end_reason": "expired", "note": "EXPIRED"},
            {"id": "a3", "expert_id": "exp_bad", "evaluation_id": None, "assigned_at": (now - timedelta(days=1)).isoformat(), "due_at": (now + timedelta(hours=24)).isoformat(), "ended_at": None, "end_reason": None, "note": None},
        ],
        evaluations=[{"id": "ev1", "feedback": "X" * 90, "agrees_with_ai": True}],
        criterion_scores=[{"evaluation_id": "ev1", "comment": "Y" * 45} for _ in range(4)],
        annotations=[{"evaluation_id": "ev1"} for _ in range(3)],
        attempts=[{"id": "att1", "skill": "writing"}],
    )
    monkeypatch.setattr(expert_policy_config, "db", lambda: fake)
    monkeypatch.setattr(expert_rps_service, "db", lambda: fake)
    monkeypatch.setattr(expert_penalty_service, "db", lambda: fake)
    monkeypatch.setattr(dispatcher, "db", lambda: fake)
    monkeypatch.setattr("app.services.notifications.notification_service.db", lambda: fake)
    monkeypatch.setattr("app.services.admin.staff_accounts.db", lambda: fake)

    rps = expert_rps_service.compute_expert_rps_map(["exp_gold", "exp_bad"], now_utc=now.astimezone(expert_rps_service.timezone.utc))
    assert rps["exp_gold"]["rps_tier"] == "gold" and rps["exp_gold"]["rps_score"] >= 90.0
    assert rps["exp_bad"]["rps_score"] < rps["exp_gold"]["rps_score"]

    # Strike 1 warning, then Strike 2 halves capacity -> Strike 3 suspends availability
    assert expert_penalty_service.apply_overdue_penalty("exp_bad", "a2", now)["strike"] == 1
    fake.tables["review_assignments"].append({"id": "a4", "expert_id": "exp_bad", "end_reason": "expired", "ended_at": now.isoformat()})
    assert expert_penalty_service.apply_overdue_penalty("exp_bad", "a4", now)["new_max"] == 2
    fake.tables["review_assignments"].append({"id": "a5", "expert_id": "exp_bad", "end_reason": "expired", "ended_at": now.isoformat()})
    assert expert_penalty_service.apply_overdue_penalty("exp_bad", "a5", now)["action"] == "suspend_availability"
    assert fake.tables["expert_profiles"][1]["is_available"] is False

    # Dynamic completeness blocks <3 writing annotations
    live_now = datetime.now(expert_penalty_service.TZ_VN)
    fake.tables["review_assignments"].append({"id": "a_live", "request_id": "rq1", "attempt_id": "att1", "expert_id": "exp_gold", "assigned_at": live_now.isoformat(), "due_at": (live_now + timedelta(hours=20)).isoformat(), "ended_at": None, "evaluation_id": "ev_live"})
    with pytest.raises(DomainError) as exc:
        asyncio.run(dispatcher.submit_expert_final_review("a_live", "exp_gold", {
            "overall_band": 7.0,
            "feedback": "Z" * 90,
            "criterion_scores": [{"criterion_id": f"c{i}", "band": 7.0, "comment": "C" * 45} for i in range(4)],
            "annotations": [{"category": "GRA"}],
        }))
    assert exc.value.status_code == 422


def test_wave5_adaptive_streak_and_3tier_badges():
    today = date(2026, 11, 21)
    # 8 consecutive days before a 1-day skip -> earns 1 Freeze & bridges gap -> streak == 9
    dates = [today - timedelta(days=i) for i in range(1, 10) if i != 2]
    daily_mins = {d.isoformat(): 35 for d in dates}
    attempts = [
        {"id": f"at{i}", "skill": sk, "mode": "mock", "status": "scored", "band": 6.5, "started_at": f"{d.isoformat()}T08:00:00+07:00"}
        for i, (d, sk) in enumerate(zip(dates[:4], ["listening", "reading", "writing", "speaking"]))
    ]
    goal = {"input_band": 4.5, "target_overall": 6.5, "test_date": (today + timedelta(days=30)).isoformat()}
    cfg = {
        "normal_daily_minutes": 15, "sprint_daily_minutes": 30, "sprint_days_before_exam": 60,
        "freeze_per_streak_days": 7, "max_freezes_per_month": 2, "grace_recovery_max_gap_days": 2,
        "streak_tiers": {"bronze": 3, "silver": 14, "gold": 30},
        "mastery_gold_accuracy_pct": 80, "mastery_gold_min_types": 3, "mastery_gold_min_scored": 20,
        "breakthrough_bronze_delta": 0.5, "breakthrough_silver_band": 6.5,
    }
    streak = adaptive_streak_service.compute_adaptive_streak(attempts, daily_mins, goal, today_vn=today, cfg=cfg)
    assert streak["mode"] == "sprint"
    assert streak["daily_target_minutes"] == 30
    assert streak["freezes_earned"] == 1 and streak["freezes_used"] == 1
    assert streak["current_streak"] >= 8

    badges = learner_badges_service.compute_learner_badges(attempts, streak, goal, predicted_band=6.5, question_type_stats=[], cfg=cfg)
    unlocked_ids = {b["id"] for b in badges["badges"] if b["unlocked"]}
    assert {"streak_bronze", "mastery_bronze", "mastery_silver", "breakthrough_bronze", "breakthrough_silver", "breakthrough_gold"} <= unlocked_ids
