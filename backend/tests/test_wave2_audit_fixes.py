"""Unit tests xác minh toàn bộ Wave 2 (SYS-05, SYS-06, SYS-07, SYS-08)."""
import asyncio
from datetime import datetime, timedelta
from pathlib import Path
import sys

import pytest
from tests.fake_supabase import FakeSupabase

from app.core.domain_errors import DomainError
from app.services.expert import admin_review_dispatch_service, dispatcher, sla_cron_service, sla_service
from app.services.learning_profile import overview_aggregator, question_type_aggregator
from app.services.listening_reading.lr_test_content import _options
from app.services.practice import practice_history
from app.services.speaking import speaking_result_views
from app.services.writing import writing_result_views
from tests.test_writing_result_views import _seed_base


def test_sys05_remaining_hours_and_cron_expiry_and_gates(monkeypatch):
    tz = sla_service.TZ_VN
    now = datetime(2026, 11, 18, 10, 0, tzinfo=tz)  # Wednesday
    assert sla_service.remaining_business_hours(now, now + timedelta(hours=5)) == 5.0
    assert sla_service.remaining_business_hours(now, now - timedelta(hours=3)) == -3.0

    fake = FakeSupabase(
        review_requests=[
            {"id": "req1", "attempt_id": "att1", "status": "assigned"},
            {"id": "req2", "attempt_id": "att2", "status": "assigned"},
        ],
        review_assignments=[
            {
                "id": "asgn1", "request_id": "req1", "attempt_id": "att1", "expert_id": "exp1",
                "assigned_at": (now - timedelta(hours=60)).isoformat(),
                "due_at": (datetime.now(tz) - timedelta(hours=2)).isoformat(),
                "ended_at": None, "end_reason": None,
            },
            {
                "id": "asgn_cron", "request_id": "req2", "attempt_id": "att2", "expert_id": "exp3",
                "assigned_at": (now - timedelta(hours=60)).isoformat(),
                "due_at": (datetime.now(tz) - timedelta(hours=3)).isoformat(),
                "ended_at": None, "end_reason": None,
            },
        ],
        audit_logs=[],
        expert_penalties=[],
        expert_profiles=[{"user_id": "exp1", "is_available": True}, {"user_id": "exp3", "is_available": True}],
        profiles=[],
        notifications=[],
        attempts=[{"id": "att1", "skill": "writing", "mode": "mock", "status": "submitted"}],
        evaluations=[],
    )
    monkeypatch.setattr(sla_cron_service, "db", lambda: fake)
    monkeypatch.setattr(dispatcher, "db", lambda: fake)
    monkeypatch.setattr("app.services.expert.review_submit_service.db", lambda: fake)
    monkeypatch.setattr("app.services.expert.penalty_circuit_breaker.db", lambda: fake)
    monkeypatch.setattr("app.services.notifications.notification_service.db", lambda: fake)
    monkeypatch.setattr("app.services.admin.staff_accounts.db", lambda: fake)

    # Submit overdue must raise 409 AND immediately expire asgn1 + log penalty (B5)
    with pytest.raises(DomainError) as exc_due:
        asyncio.run(dispatcher.submit_expert_final_review("asgn1", "exp1", {"overall_band": 6.5, "criterion_scores": [], "feedback": ""}))
    assert exc_due.value.status_code == 409
    assert fake.tables["review_assignments"][0]["end_reason"] == "expired"
    assert len(fake.tables["expert_penalties"]) == 1

    # Cron expires remaining open overdue assignment (asgn_cron) and logs system audit
    assert sla_cron_service.expire_overdue_assignments() == 1
    assert fake.tables["review_assignments"][1]["end_reason"] == "expired"
    assert fake.tables["review_requests"][1]["status"] == "waiting"
    assert fake.tables["audit_logs"][0]["actor_type"] == "system"

    # Completeness gate rejects empty feedback/annotations even when within SLA
    fake.tables["review_assignments"].append({
        "id": "asgn2", "request_id": "req1", "attempt_id": "att1", "expert_id": "exp2",
        "assigned_at": datetime.now(tz).isoformat(),
        "due_at": (datetime.now(tz) + timedelta(hours=24)).isoformat(),
        "ended_at": None, "end_reason": None, "evaluation_id": "ev2",
    })
    with pytest.raises(DomainError) as exc_empty:
        asyncio.run(dispatcher.submit_expert_final_review("asgn2", "exp2", {"overall_band": 7.0, "criterion_scores": [], "feedback": "short"}))
    assert exc_empty.value.status_code == 422


def test_sys05_admin_reassign_records_audit_and_reassigned_by(monkeypatch):
    fake = FakeSupabase(
        review_requests=[{"id": "req1", "attempt_id": "att1", "status": "assigned"}],
        expert_profiles=[{"user_id": "exp2", "is_available": True, "max_active_reviews": 5}],
        profiles=[{"id": "exp2", "email": "exp2@moonlab.vn", "full_name": "Exp Two", "is_active": True}],
        review_assignments=[{"id": "asgn_old", "request_id": "req1", "attempt_id": "att1", "expert_id": "exp1", "ended_at": None}],
        system_settings=[],
        audit_logs=[],
    )
    monkeypatch.setattr(admin_review_dispatch_service, "db", lambda: fake)
    monkeypatch.setattr("app.services.admin.staff_accounts.db", lambda: fake)
    monkeypatch.setattr(sla_service, "_sla_cache", None)
    monkeypatch.setattr(admin_review_dispatch_service, "notify_expert_assigned", lambda **_k: None)

    out = admin_review_dispatch_service.admin_assign_review_request("req1", "exp2", "admin-uuid-1234", "Load balance")
    assert out["reassigned"] is True
    assert fake.tables["review_assignments"][0]["reassigned_by"] == "admin-uuid-1234"
    assert fake.tables["review_assignments"][0]["admin_role"] == "admin"
    assert fake.tables["audit_logs"][0]["action"] == "reassign_review"


def test_sys06_br08_dual_eval_and_speaking_summary_sanitize(monkeypatch):
    tables = _seed_base()
    tables["evaluations"][0]["is_official"] = False
    tables["evaluations"].append({
        "id": "ev_exp", "attempt_id": "a1", "skill": "writing", "evaluator_type": "expert",
        "status": "done", "overall_band": 7.5, "feedback": "Strong coherence.", "is_official": True,
        "created_at": "2026-11-11T10:00:00+00:00",
    })
    tables["criterion_scores"].extend([
        {"evaluation_id": "ev_exp", "task_no": 1, "band": 7.5, "comment": "Good.", "criteria": {"code": "TA"}},
        {"evaluation_id": "ev_exp", "task_no": 1, "band": 7.5, "comment": "Good.", "criteria": {"code": "CC"}},
        {"evaluation_id": "ev_exp", "task_no": 1, "band": 7.0, "comment": "Good.", "criteria": {"code": "LR"}},
        {"evaluation_id": "ev_exp", "task_no": 1, "band": 7.5, "comment": "Good.", "criteria": {"code": "GRA"}},
    ])
    fake = FakeSupabase(**tables)
    monkeypatch.setattr(writing_result_views, "db", lambda: fake)

    summary = writing_result_views.build_attempt_summary(fake.tables["attempts"][0])
    assert summary["ai_evaluation"]["overall_band"] == 6.5
    assert summary["expert_review"]["overall_band"] == 7.5
    res = writing_result_views.build_essay_result("e1", "u1", is_admin=False)
    assert res is not None and res["result"]["expert_review"] is not None and res["result"]["ai_evaluation"] is not None

    # Speaking BR-08 dual evaluations
    spk_fake = FakeSupabase(
        tests=[{"id": "ts1", "title": "Speaking Test"}],
        attempts=[{"id": "as1", "test_id": "ts1", "skill": "speaking", "mode": "mock", "status": "scored", "started_at": "2026-11-10T10:00:00Z"}],
        evaluations=[
            {"id": "sev_exp", "attempt_id": "as1", "evaluator_type": "expert", "status": "done", "overall_band": 7.0, "is_official": True, "feedback": "Fluent", "created_at": "2026-11-11"},
            {"id": "sev_ai", "attempt_id": "as1", "evaluator_type": "ai", "status": "done", "overall_band": 6.0, "is_official": False, "feedback": "AI note", "created_at": "2026-11-10"},
        ],
        criterion_scores=[], grading_runs=[], sections=[], review_requests=[], review_assignments=[],
    )
    monkeypatch.setattr(speaking_result_views, "db", lambda: spk_fake)
    spk_sum = speaking_result_views.build_speaking_summary(spk_fake.tables["attempts"][0])
    assert spk_sum["ai_evaluation"]["overall_band"] == 6.0
    assert spk_sum["expert_review"]["overall_band"] == 7.0

    # Speaking AI prose sanitizer (stubbing optional openai/ai deps inside backend test runner)
    from types import ModuleType
    ai_root = Path(__file__).resolve().parents[2] / "ai-engine"  # AI engine dời khỏi backend/app/ai (2026-11-23)
    for mod_name in ("openai", "services", "services.llm.llm_client", "services.llm.prompt_builder", "settings", "settings.config",
                     "services.langfuse", "services.langfuse.usage_meter"):
        stub = ModuleType(mod_name)
        if mod_name == "services":
            stub.__path__ = [str(ai_root / "services")]
        stub.AsyncOpenAI = stub.OpenAI = stub.get_async_llm_client = stub.llm_extra_body = stub.strip_markdown_fence = lambda *a, **k: None
        stub.trace_options = lambda *a, **k: {}  # llm_client có thêm trace_options (spec 008)
        stub.record_usage = lambda *a, **k: None  # usage_meter cần thư viện langfuse, backend không cài
        stub.CompiledPrompt = stub.get_prompt_manager = stub.get_settings = lambda *a, **k: None
        monkeypatch.setitem(sys.modules, mod_name, stub)
    monkeypatch.syspath_prepend(str(ai_root))
    from services.speaking.speaking_feedback import sanitize_overall_summary

    fixed = sanitize_overall_summary("Your overall band score is 3.5, showing limited control.", 2.5)
    assert fixed == "Your overall band score is 2.5, showing limited control."


def test_sys07_roman_vs_latin_alphabet_i_sorting():
    alpha_opts = _options([{"label": c, "text": f"Word {c}"} for c in ["K", "I", "A", "H", "J", "B"]])
    assert [o["key"] for o in alpha_opts] == ["A", "B", "H", "I", "J", "K"]
    roman_opts = _options([{"label": r, "text": f"Heading {r}"} for r in ["ix", "i", "iv"]])
    assert [o["key"] for o in roman_opts] == ["i", "iv", "ix"]


def test_sys08_history_order_highlights_and_donut_scored_only(monkeypatch):
    fake = FakeSupabase(
        attempts=[
            {"id": "att_old_sub", "test_id": "t1", "learner_id": "u1", "skill": "reading", "mode": "practice",
             "status": "scored", "started_at": "2026-11-10T08:00:00Z", "submitted_at": "2026-11-12T09:00:00Z", "tests": {"title": "T1"}},
            {"id": "att_new_sub", "test_id": "t2", "learner_id": "u1", "skill": "listening", "mode": "practice",
             "status": "scored", "started_at": "2026-11-08T08:00:00Z", "submitted_at": "2026-11-16T09:00:00Z", "tests": {"title": "T2"}},
        ],
        attempt_results=[],
    )
    monkeypatch.setattr(practice_history, "db", lambda: fake)
    hist = practice_history.list_history("u1", page=1, limit=10, skill=None, status=None)
    assert [i["id"] for i in hist["items"]] == ["att_new_sub", "att_old_sub"]

    scored = [
        {"id": "s1", "skill": "speaking", "mode": "practice", "status": "scored", "band": 6.0, "started_at": "2026-11-15"},
        {"id": "w1", "skill": "writing", "mode": "mock", "status": "scored", "band": 6.5, "started_at": "2026-11-16"},
    ]
    monkeypatch.setattr(question_type_aggregator, "get_user_answers_cached", lambda _u, _i: [])
    qt = question_type_aggregator.compute_question_type_accuracy("u1", scored)
    assert qt["highlights"]["most_practiced"]["type_name"] == "Speaking (Luyện tập)"
    assert "(Speaking)" not in qt["highlights"]["most_practiced"]["type_name"]
    assert qt["highlights"]["most_practiced"]["metric_type"] == "band"

    monkeypatch.setattr(overview_aggregator, "get_user_attempts", lambda _u: [
        {"id": "a1", "skill": "reading", "status": "scored", "band": 6.5, "started_at": "2026-11-15T10:00:00Z"},
        {"id": "a2", "skill": "reading", "status": "in_progress", "band": None, "started_at": "2026-11-16T10:00:00Z"},
    ])
    monkeypatch.setattr(overview_aggregator, "get_learner_goal", lambda _u: {
        "input_band": 4.5, "target_overall": 6.5, "target_listening": 6.5, "target_reading": 6.5,
        "target_writing": 6.0, "target_speaking": 6.0, "test_date": "",
    })
    monkeypatch.setattr(
        "app.services.learner_journey.journey_data_readers.goal_row",
        lambda _u: {
            "target_overall": 6.5,
            "target_listening": 6.5,
            "target_reading": 6.5,
            "target_writing": 6.0,
            "target_speaking": 6.0,
            "test_date": None,
        },
    )
    overview_aggregator.set_to_cache("overview_v2_u_donut", None, ttl_seconds=0)
    ov = overview_aggregator.compute_learning_profile_overview("u_donut")
    donut_map = {d["name"]: d["value"] for d in ov["donut_data"]}
    assert donut_map["Reading"] == 1
