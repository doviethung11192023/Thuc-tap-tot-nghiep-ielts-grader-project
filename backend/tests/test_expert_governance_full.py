"""Tests toàn diện Hệ thống Quản trị Chuyên gia PRD_01 (Wave 1 + Wave 2 + Bugs B1..B6)."""
import asyncio
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
import pytest
from tests.fake_supabase import FakeSupabase

from app.services.expert import expert_profile_service
from app.api.endpoints.student_practice import expert_requests
from app.services.expert import learner_expert_review_service
from app.core.domain_errors import DomainError
from app.core.security import User
from app.schemas.expert import ExpertAvailabilityUpdate, ExpertHelpfulnessRatingRequest
from app.services.expert import (
    dispatcher,
    expert_policy_config,
    expert_tier_evaluation_service,
    penalty_circuit_breaker,
    review_completeness_validator,
    review_submit_service,
    sla_cron_service,
)

TZ_VN = review_completeness_validator.TZ_VN
VALID_NOTIF_TYPES = {
    "grading_pending", "grading_complete", "grading_failed",
    "ai_grading", "ai_complete", "ai_failed",
    "expert_requested", "expert_assigned", "expert_reassigned", "expert_complete",
    "streak_reminder", "streak_freeze_used", "badge_unlocked",
    "expert_sla_warning", "expert_sla_expired", "expert_penalty_notice", "admin_expert_suspended",
}


def _criteria_payload(comment: str = "Lập luận khá mạch lạc, triển khai ví dụ cụ thể cho từng luận điểm.", band: float = 7.0):
    return [{"criterion_id": f"c{i}", "task_no": 1, "skill": "writing", "band": band, "comment": comment} for i in range(4)]


def _patch_all(monkeypatch, fake: FakeSupabase):
    for mod in (
        expert_policy_config, review_completeness_validator, expert_tier_evaluation_service,
        penalty_circuit_breaker, sla_cron_service, dispatcher, review_submit_service, expert_profile_service, learner_expert_review_service,
    ):
        if hasattr(mod, "db"):
            monkeypatch.setattr(mod, "db", lambda: fake)
    monkeypatch.setattr("app.services.notifications.notification_service.db", lambda: fake)
    monkeypatch.setattr("app.services.admin.staff_accounts.db", lambda: fake)
    monkeypatch.setattr("app.services.practice.practice_attempt_lifecycle.db", lambda: fake)


def test_b4_completeness_gate_word_boundary_and_band85_exempt(monkeypatch):
    now = datetime.now(TZ_VN)
    fake = FakeSupabase(
        system_settings=[],
        expert_profiles=[{"user_id": "e1", "is_available": True, "max_active_reviews": 5, "tier": "standard", "consecutive_clean_reviews": 0}],
        review_requests=[{"id": "rq1", "attempt_id": "at1", "status": "assigned"}],
        review_assignments=[{
            "id": "a1", "request_id": "rq1", "attempt_id": "at1", "expert_id": "e1",
            "assigned_at": (now - timedelta(hours=3)).isoformat(), "started_at": (now - timedelta(minutes=10)).isoformat(),
            "due_at": (now + timedelta(hours=20)).isoformat(), "ended_at": None, "evaluation_id": "ev_exp",
        }],
        attempts=[{"id": "at1", "skill": "writing", "learner_id": "u1"}],
        evaluations=[
            {"id": "ev_ai", "attempt_id": "at1", "evaluator_type": "ai", "status": "done", "overall_band": 7.0, "feedback": "AI feedback baseline long enough"},
            {"id": "ev_exp", "attempt_id": "at1", "evaluator_type": "expert", "status": "draft", "overall_band": 7.0, "feedback": ""},
        ],
        criterion_scores=[],
        annotations=[],
        review_assignments_history=[],
        expert_penalties=[],
        expert_helpfulness_ratings=[],
        expert_performance_snapshots=[],
    )
    _patch_all(monkeypatch, fake)

    # 1. Word-boundary catches isolated "null" + increments completeness_reject_count
    with pytest.raises(DomainError) as exc1:
        asyncio.run(dispatcher.submit_expert_final_review("a1", "e1", {
            "overall_band": 7.0,
            "feedback": "Nhận xét tổng quan có chứa null cần loại bỏ trước khi nộp bài.",
            "criterion_scores": _criteria_payload(),
            "annotations": [{"category": "GRA", "original_text": "is go", "explanation": "sai thì"}],
        }))
    assert exc1.value.status_code == 422
    assert fake.tables["review_assignments"][0]["completeness_reject_count"] == 1

    # 2. Gibberish caught
    with pytest.raises(DomainError):
        asyncio.run(dispatcher.submit_expert_final_review("a1", "e1", {
            "overall_band": 7.0,
            "feedback": "aaaaaaaaaaaaabbbbbbbbbbbccccccccccccddddddddddddeeeeeeeeeeee",
            "criterion_scores": _criteria_payload(),
            "annotations": [{"category": "GRA"}],
        }))

    # 3. Deviation >= 1.0 requires change_reason >= 15 chars
    with pytest.raises(DomainError):
        asyncio.run(dispatcher.submit_expert_final_review("a1", "e1", {
            "overall_band": 8.5,
            "feedback": "The candidate decided to annul and nullify weak arguments with mature academic tone.",
            "criterion_scores": _criteria_payload(band=8.5),
            "annotations": [],
            "change_reason": "Too short",
        }))

    # 4. Band 8.5 + "annul/nullify" + 0 annotations PASSES with reason >= 15!
    out = asyncio.run(dispatcher.submit_expert_final_review("a1", "e1", {
        "overall_band": 8.5,
        "feedback": "The essay shows how policies can annul and nullify outdated constraints cleanly.",
        "criterion_scores": _criteria_payload(band=8.5),
        "annotations": [],
        "change_reason": "Bài viết thực tế đạt trình độ Band 8.5 rất tự nhiên và chuẩn xác.",
    }))
    assert out["status"] == "completed"
    assert fake.tables["review_assignments"][0]["completeness_passed"] is True
    assert fake.tables["review_assignments"][0]["rubber_stamp_flag"] is False


def test_b4_ai_agreement_modal_rubber_stamp_and_failed_ai_skip(monkeypatch):
    now = datetime.now(TZ_VN)
    ai_crit = [{"evaluation_id": "ev_ai", "criterion_id": f"c{i}", "task_no": 1, "band": 6.5, "comment": "Bài đạt cấu trúc ổn, từ vựng phù hợp chủ đề."} for i in range(4)]
    ai_ann = [{"evaluation_id": "ev_ai", "category": "GRA", "original_text": "he go", "corrected_text": "he goes", "explanation": "S-V", "essay_id": "es1"}]
    fake = FakeSupabase(
        system_settings=[],
        expert_profiles=[{"user_id": "e1", "is_available": True, "max_active_reviews": 5, "tier": "standard", "consecutive_clean_reviews": 0}],
        review_requests=[{"id": "rq1", "attempt_id": "at1", "status": "assigned"}, {"id": "rq2", "attempt_id": "at2", "status": "assigned"}],
        review_assignments=[
            {
                "id": "a1", "request_id": "rq1", "attempt_id": "at1", "expert_id": "e1",
                "assigned_at": (now - timedelta(hours=1)).isoformat(), "started_at": (now - timedelta(seconds=30)).isoformat(),
                "due_at": (now + timedelta(hours=40)).isoformat(), "ended_at": None, "evaluation_id": "ev_exp1",
            },
            {
                "id": "a2", "request_id": "rq2", "attempt_id": "at2", "expert_id": "e1",
                "assigned_at": (now - timedelta(hours=1)).isoformat(), "started_at": (now - timedelta(minutes=5)).isoformat(),
                "due_at": (now + timedelta(hours=40)).isoformat(), "ended_at": None, "evaluation_id": "ev_exp2",
            },
        ],
        attempts=[{"id": "at1", "skill": "writing", "learner_id": "u1"}, {"id": "at2", "skill": "writing", "learner_id": "u1"}],
        evaluations=[
            {"id": "ev_ai", "attempt_id": "at1", "evaluator_type": "ai", "status": "done", "overall_band": 6.5, "feedback": "AI nhận xét tổng quan rõ ràng, mạch lạc, đúng trọng tâm yêu cầu đề."},
            {"id": "ev_exp1", "attempt_id": "at1", "evaluator_type": "expert", "status": "draft", "overall_band": 6.5},
            {"id": "ev_ai_fail", "attempt_id": "at2", "evaluator_type": "ai", "status": "failed", "overall_band": None, "feedback": ""},
            {"id": "ev_exp2", "attempt_id": "at2", "evaluator_type": "expert", "status": "draft", "overall_band": 6.5},
        ],
        criterion_scores=list(ai_crit),
        annotations=list(ai_ann),
        expert_penalties=[],
        expert_helpfulness_ratings=[],
        expert_performance_snapshots=[],
    )
    _patch_all(monkeypatch, fake)

    # Identical to AI without study_tip -> 422 ai_agreement_required
    base_payload = {
        "overall_band": 6.5,
        "feedback": "AI nhận xét tổng quan rõ ràng, mạch lạc, đúng trọng tâm yêu cầu đề.",
        "criterion_scores": [{"criterion_id": f"c{i}", "task_no": 1, "skill": "writing", "band": 6.5, "comment": "Bài đạt cấu trúc ổn, từ vựng phù hợp chủ đề."} for i in range(4)],
        "annotations": [{"category": "GRA", "original_text": "he go", "corrected_text": "he goes", "explanation": "S-V", "essay_id": "es1"}],
    }
    with pytest.raises(DomainError) as exc:
        asyncio.run(dispatcher.submit_expert_final_review("a1", "e1", base_payload))
    assert exc.value.extra and exc.value.extra["violations"][0]["code"] == "ai_agreement_required"

    # Confirmed + >= 30 chars study tip in < 90s -> passes AND flags rubber_stamp_flag=True
    out1 = asyncio.run(dispatcher.submit_expert_final_review("a1", "e1", {
        **base_payload,
        "ai_agreement_confirmed": True,
        "study_tip_note": "Em nên luyện thêm chia động từ ngôi thứ ba số ít và đa dạng câu phức.",
    }))
    assert out1["status"] == "completed"
    assert fake.tables["review_assignments"][0]["rubber_stamp_flag"] is True

    # Failed AI eval -> skips agreement gate completely
    out2 = asyncio.run(dispatcher.submit_expert_final_review("a2", "e1", base_payload))
    assert out2["status"] == "completed"
    assert fake.tables["review_assignments"][1]["rubber_stamp_flag"] is False


def test_b2_availability_lock_and_tier_cap(monkeypatch):
    future = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
    fake = FakeSupabase(
        profiles=[{"id": "e1", "email": "e1@moonlab.vn", "full_name": "E1"}],
        expert_profiles=[{"user_id": "e1", "is_available": False, "max_active_reviews": 2, "tier": "standard", "cooldown_until": future, "is_suspended_by_penalty": False}],
        review_assignments=[],
        expert_penalties=[],
        expert_helpfulness_ratings=[],
        expert_performance_snapshots=[],
    )
    _patch_all(monkeypatch, fake)
    user = User(id="e1", email="e1@moonlab.vn", role="expert")

    with pytest.raises(DomainError) as exc_cd:
        expert_profile_service.update_expert_availability(user.id, ExpertAvailabilityUpdate(is_available=True).dict(exclude_unset=True))
    assert exc_cd.value.status_code == 403

    fake.tables["expert_profiles"][0].update({"cooldown_until": None, "is_suspended_by_penalty": True})
    with pytest.raises(DomainError) as exc_susp:
        expert_profile_service.update_expert_availability(user.id, ExpertAvailabilityUpdate(is_available=True).dict(exclude_unset=True))
    assert exc_susp.value.status_code == 403

    fake.tables["expert_profiles"][0].update({"is_suspended_by_penalty": False, "tier": "standard"})
    with pytest.raises(DomainError) as exc_cap:
        expert_profile_service.update_expert_availability(user.id, ExpertAvailabilityUpdate(max_active_reviews=8).dict(exclude_unset=True))
    assert exc_cap.value.status_code == 400


def test_b1_b5_progressive_penalties_pool_guard_reminders_and_waive(monkeypatch):
    now = datetime.now(TZ_VN)
    fake = FakeSupabase(
        system_settings=[{"key": "expert_cooldown_min_active_pool", "value": {"value": 3}}],
        profiles=[
            {"id": "adm1", "role": "admin", "is_active": True},
            {"id": "e_bad", "role": "expert", "is_active": True},
            {"id": "e2", "role": "expert", "is_active": True},
            {"id": "e3", "role": "expert", "is_active": True},
            {"id": "e4", "role": "expert", "is_active": True},
        ],
        expert_profiles=[
            {"user_id": "e_bad", "is_available": True, "max_active_reviews": 5, "tier": "standard", "consecutive_clean_reviews": 2, "is_suspended_by_penalty": False},
            {"user_id": "e2", "is_available": True, "max_active_reviews": 5, "tier": "standard"},
            {"user_id": "e3", "is_available": True, "max_active_reviews": 5, "tier": "standard"},
            {"user_id": "e4", "is_available": True, "max_active_reviews": 5, "tier": "standard"},
        ],
        review_assignments=[
            {"id": "rem1", "attempt_id": "at1", "expert_id": "e2", "due_at": (now + timedelta(hours=5)).isoformat(), "ended_at": None, "reminder_stage": 0},
        ],
        expert_penalties=[],
        expert_helpfulness_ratings=[],
        expert_performance_snapshots=[],
        notifications=[],
        audit_logs=[],
    )
    _patch_all(monkeypatch, fake)

    # SLA <= 6h reminder moves 0 -> 2 and doesn't repeat
    assert sla_cron_service.send_sla_deadline_warnings() == 1
    assert fake.tables["review_assignments"][0]["reminder_stage"] == 2
    assert sla_cron_service.send_sla_deadline_warnings() == 0

    # Strike 1 warning, idempotent duplicate ignored, Strike 2 probation throttle, Strike 3 cooldown (pool=3 >= 3)
    p1 = penalty_circuit_breaker.record_expert_penalty("e_bad", "sla_expired", "asg1", now_vn=now)
    assert p1["severity"] == "warning"
    assert penalty_circuit_breaker.record_expert_penalty("e_bad", "sla_expired", "asg1", now_vn=now).get("duplicate") is True
    p2 = penalty_circuit_breaker.record_expert_penalty("e_bad", "sla_expired", "asg2", now_vn=now)
    assert p2["severity"] == "throttle" and fake.tables["expert_profiles"][0]["tier"] == "probation"
    p3 = penalty_circuit_breaker.record_expert_penalty("e_bad", "sla_expired", "asg3", now_vn=now)
    assert p3["severity"] == "cooldown" and fake.tables["expert_profiles"][0]["is_available"] is False

    # Every inserted notification uses valid DB type (B1)
    assert all(n["type"] in VALID_NOTIF_TYPES for n in fake.tables["notifications"])

    # Admin waive lifts cooldown & writes audit log
    waived = penalty_circuit_breaker.waive_penalty(p3["id"], "adm1", "Sự cố mạng toàn trường được Admin xác nhận")
    assert waived["remaining_sla_strikes_30d"] == 2
    assert fake.tables["expert_profiles"][0]["is_available"] is True
    assert any(a["action"] == "expert_penalty_waived" for a in fake.tables["audit_logs"])

    # Small-team BR-26 guard blocks cooldown when active pool < 3
    fake.tables["expert_profiles"].pop()  # pool now e2 + e3 = 2 < 3
    p3_guarded = penalty_circuit_breaker.record_expert_penalty("e_bad", "sla_expired", "asg4", now_vn=now)
    assert p3_guarded["severity"] == "throttle"
    assert fake.tables["expert_profiles"][0]["is_available"] is True


def test_b3_b6_new_expert_tier_probation_recovery_snapshots_and_rating(monkeypatch):
    now = datetime.now(timezone.utc)
    fake = FakeSupabase(
        expert_profiles=[
            {"user_id": "e_new", "is_available": True, "max_active_reviews": 5, "tier": "standard"},
            {"user_id": "e_prob", "is_available": True, "max_active_reviews": 2, "tier": "probation", "consecutive_clean_reviews": 3, "is_suspended_by_penalty": False},
        ],
        review_assignments=[
            {"id": "c1", "attempt_id": "att1", "expert_id": "e_prob", "assigned_at": (now - timedelta(days=3)).isoformat(), "due_at": (now - timedelta(days=1)).isoformat(), "ended_at": (now - timedelta(days=2)).isoformat(), "end_reason": "completed", "completeness_reject_count": 0},
        ],
        expert_penalties=[],
        expert_helpfulness_ratings=[
            {"id": f"r{i}", "attempt_id": f"x{i}", "learner_id": "u1", "expert_id": "e_prob", "is_helpful": True, "tags": [], "created_at": now.isoformat()}
            for i in range(4)
        ],
        expert_performance_snapshots=[],
        attempts=[{"id": "att1", "learner_id": "u1", "skill": "writing"}],
        notifications=[],
        audit_logs=[],
    )
    _patch_all(monkeypatch, fake)

    m_map = expert_tier_evaluation_service.compute_expert_performance_metrics(["e_new", "e_prob"], "30d", now)
    assert m_map["e_new"]["tier"] == "standard"  # B6 new expert never starts as Top/Gold
    assert m_map["e_prob"]["helpfulness_rate"] is None  # < 5 ratings hidden per FR-52

    fake.tables["expert_helpfulness_ratings"].append({"id": "r5", "attempt_id": "x5", "learner_id": "u1", "expert_id": "e_prob", "is_helpful": False, "tags": ["too_brief"], "created_at": now.isoformat()})
    m_map2 = expert_tier_evaluation_service.compute_expert_performance_metrics(["e_prob"], "30d", now)
    assert m_map2["e_prob"]["helpfulness_rate"] == 80.0

    # Probation auto-recovers when consecutive_clean_reviews >= 3 (B3) + closes monthly snapshots
    assert expert_tier_evaluation_service.evaluate_all_expert_tiers(now, close_previous_month=True) == 2
    assert fake.tables["expert_profiles"][1]["tier"] == "standard"
    assert fake.tables["expert_profiles"][1]["max_active_reviews"] == 5
    assert len(fake.tables["expert_performance_snapshots"]) == 2

    # Learner rating API saves once and rejects duplicate with 409
    learner = User(id="u1", email="u1@test.com", role="learner")
    # Handler là hàm thường (chạy trong threadpool), gọi trực tiếp
    saved = expert_requests.submit_expert_helpfulness_rating(
        "att1", ExpertHelpfulnessRatingRequest(is_helpful=True, tags=["clear_actionable"]), current_user=learner
    )
    assert saved["status"] == "saved"
    with pytest.raises(DomainError) as exc_dup:
        expert_requests.submit_expert_helpfulness_rating(
            "att1", ExpertHelpfulnessRatingRequest(is_helpful=False, tags=["too_brief"]), current_user=learner
        )
    assert exc_dup.value.status_code == 409


def test_admin_settings_expert_governance_validation(monkeypatch):
    from types import SimpleNamespace
    from app.api.endpoints.admin.content import core as admin_core
    from app.schemas.system_settings import SystemSettingUpdate

    assert {"expert_completeness_rules", "expert_cooldown_min_active_pool"} <= admin_core.ALLOWED_UPSERT_SETTINGS

    fake = FakeSupabase(
        system_settings=[{"key": "expert_cooldown_min_active_pool", "value": {"value": 3}}],
        audit_logs=[],
    )
    monkeypatch.setattr("app.services.admin.system_settings_service.db", lambda: fake)
    monkeypatch.setattr("app.services.admin.staff_accounts.db", lambda: fake)

    admin_user = User(id="adm-1", email="admin@ieltsgrader.edu.vn", role="admin")
    fake_req = SimpleNamespace(app=SimpleNamespace(state=SimpleNamespace(redis=None)))

    res_rules = asyncio.run(
        admin_core.update_system_setting(
            "expert_completeness_rules",
            SystemSettingUpdate(value={"min_overall_feedback_chars": 65, "exempt_annotation_band": 8.0}),
            request=fake_req,
            current_user=admin_user,
        )
    )
    assert res_rules["data"]["value"]["min_overall_feedback_chars"] == 65
    assert res_rules["data"]["value"]["exempt_annotation_band"] == 8.0

    res_pool = asyncio.run(
        admin_core.update_system_setting(
            "expert_cooldown_min_active_pool",
            SystemSettingUpdate(value=4),
            request=fake_req,
            current_user=admin_user,
        )
    )
    assert res_pool["data"]["value"] == {"value": 4}
    assert any(a["action"] == "update_expert_completeness_rules" for a in fake.tables["audit_logs"])

    with pytest.raises(DomainError) as bad_band:
        asyncio.run(
            admin_core.update_system_setting(
                "expert_completeness_rules",
                SystemSettingUpdate(value={"exempt_annotation_band": 8.3}),
                request=fake_req,
                current_user=admin_user,
            )
        )
    assert bad_band.value.status_code == 400

    with pytest.raises(DomainError) as bad_pool:
        asyncio.run(
            admin_core.update_system_setting(
                "expert_cooldown_min_active_pool",
                SystemSettingUpdate(value={"value": 0}),
                request=fake_req,
                current_user=admin_user,
            )
        )
    assert bad_pool.value.status_code == 400
