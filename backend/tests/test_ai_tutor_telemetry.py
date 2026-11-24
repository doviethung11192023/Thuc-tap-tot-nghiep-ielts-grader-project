"""Tests mở rộng cho Universal LLM Token Telemetry, Distinctive Anti-Spoiler & Per-Question Unlock Gate."""
import asyncio
import importlib.util
import sys
import types
from types import SimpleNamespace
from pathlib import Path
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.endpoints.student_practice.tutor import router as tutor_router
from app.core.domain_errors import DomainError
from app.core.security import User, get_current_user
from app.main import domain_error_handler
from app.services.tutor.tutor_config_store import DEFAULT_AI_TUTOR_CONFIG
from app.services.tutor.tutor_telemetry_store import (
    get_llm_telemetry_report,
    record_llm_feedback_telemetry,
    record_llm_turn_telemetry,
)

AI_DIR = Path(__file__).resolve().parents[1] / "app" / "ai"
if str(AI_DIR) not in sys.path:
    sys.path.insert(0, str(AI_DIR))
if "openai" not in sys.modules:
    fake_openai = types.ModuleType("openai")
    fake_openai.AsyncOpenAI = object
    sys.modules["openai"] = fake_openai

from services.tutor_prompts import build_tutor_messages, extract_spoiler_guard_data  # noqa: E402
from services.tutor_stream_telemetry import (  # noqa: E402
    estimate_context_breakdown,
    extract_usage_from_chunk,
    finalize_stream_telemetry,
)

_spec = importlib.util.spec_from_file_location("tutor_streaming_service_tel", AI_DIR / "services" / "tutor_streaming_service.py")
_stream_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_stream_mod)
StreamFilter = _stream_mod._AntiSpoilerStreamFilter


class _MiniRedis:
    def __init__(self):
        self.kv = {}

    async def get(self, k):
        return self.kv.get(k)

    async def setex(self, k, _ttl, v):
        self.kv[k] = v


def test_pt21_distinctive_token_anti_spoiler_scrubs_beta_not_wolf():
    questions = [{
        "number": 1,
        "prompt": "Forefront when making a kill?",
        "options": ["A. the alpha wolf", "B. the beta wolf", "C. the tester wolf", "D. the omega wolf"],
        "accepted_answers": ["the beta wolf"],
    }]
    terms, _ = extract_spoiler_guard_data(questions)
    assert "beta" in [t.lower() for t in terms]
    assert "wolf" not in [t.lower() for t in terms]

    flt = StreamFilter(terms, enabled=True, lang="vi")
    out = "".join(flt.feed(c) for c in ["Thực tế là be", "ta làm việc này trong bầy wolf."]) + flt.flush()
    assert "beta" not in out.lower()
    assert "wolf" in out.lower()
    assert flt.redaction_count == 1


def test_pt22_per_question_unlock_gate_isolates_q1_from_q2():
    app = FastAPI()
    app.add_exception_handler(DomainError, domain_error_handler)
    app.state.redis = None
    app.dependency_overrides[get_current_user] = lambda: User(id="u-iso", role="learner", is_active=True)
    app.include_router(tutor_router, prefix="/test-practice")
    client = TestClient(app)

    ctx = {"test_title": "Test 10", "group_id": "g1", "group_label": "Q1-2", "questions": [{"number": 1}, {"number": 2}], "skill": "reading"}
    history_q1_only = [{"role": "user", "content": "Gợi ý câu 1", "target_question_no": 1}]
    with patch("app.api.endpoints.student_practice.tutor.get_tutor_config_cached", return_value=DEFAULT_AI_TUTOR_CONFIG), \
         patch("app.api.endpoints.student_practice.tutor.verify_practice_attempt", return_value={"id": "a1", "test_id": "t1", "skill": "reading", "mode": "practice"}), \
         patch("app.api.endpoints.student_practice.tutor.load_session_messages", return_value=history_q1_only), \
         patch("app.api.endpoints.student_practice.tutor.build_server_context_payload", return_value=ctx):
        res_other_q = client.post("/test-practice/tutor/stream", json={"attempt_id": "a1", "target_question_no": 2, "unlock_answer": True, "user_answers": {}, "message": "unlock Q2"})
        assert res_other_q.status_code == 400
        res_punct = client.post("/test-practice/tutor/stream", json={"attempt_id": "a1", "target_question_no": 2, "unlock_answer": True, "user_answers": {"2": "?"}, "message": "unlock Q2"})
        assert res_punct.status_code == 400


def test_pt23_stream_telemetry_usage_and_context_breakdown():
    req = {"skill": "reading", "context_text": "Wolves live in well organised packs.", "questions": [{"number": 1, "prompt": "Pack role?"}], "message": "Gợi ý câu 1"}
    msgs = build_tutor_messages(req)
    bd = estimate_context_breakdown(msgs, req)
    assert bd["estimated_prompt_tokens"] > 0 and bd["system_tokens"] > 0 and bd["passage_tokens"] > 0

    chunk = SimpleNamespace(usage=SimpleNamespace(prompt_tokens=320, completion_tokens=90, total_tokens=410, prompt_tokens_details=SimpleNamespace(cached_tokens=64)))
    u = extract_usage_from_chunk(chunk)
    assert u == {"prompt_tokens": 320, "completion_tokens": 90, "total_tokens": 410, "cached_tokens": 64}

    res_real = finalize_stream_telemetry(0.0, 220.0, u, "Gợi ý đọc [Đoạn B]", bd, "stop", 1)
    assert res_real["token_source"] == "provider_usage" and res_real["total_tokens"] == 410 and res_real["redaction_count"] == 1

    res_est = finalize_stream_telemetry(0.0, None, None, "Text " * 20, bd, "length", 0)
    assert res_est["token_source"] == "estimated" and res_est["finish_reason"] == "length" and res_est["total_tokens"] > bd["estimated_prompt_tokens"]


def test_pt24_reusable_telemetry_store_finops_and_csat():
    async def _run():
        r = _MiniRedis()
        await record_llm_turn_telemetry(r, namespace="tutor_test", data={
            "message_id": "m-1", "skill": "reading", "test_id": "t10", "test_title": "Test 10",
            "section_no": 1, "target_question_no": 1, "hint_tier": 2, "unlocked": False, "cached": False,
            "provider": "qwen", "model": "qwen-flash", "prompt_tokens": 1000, "completion_tokens": 200,
            "total_tokens": 1200, "token_source": "provider_usage", "ttft_ms": 210, "elapsed_ms": 1210,
            "tokens_per_sec": 200.0, "finish_reason": "stop", "redacted": True, "redaction_count": 2,
            "context_breakdown": {"system_tokens": 300, "passage_tokens": 500, "questions_tokens": 150, "history_tokens": 30, "query_tokens": 20},
            "question_preview": "Gợi ý câu 1", "answer_preview": "Hãy đọc đoạn B...",
        })
        await record_llm_turn_telemetry(r, namespace="tutor_test", data={
            "message_id": "m-2", "skill": "listening", "test_id": "t11", "test_title": "Test 11",
            "hint_tier": 1, "cached": True, "provider": "qwen", "model": "qwen-flash", "cached_tokens_saved": 900,
            "question_preview": "Chip 1", "answer_preview": "Cached reply",
        })
        await record_llm_turn_telemetry(r, namespace="writing_test", data={
            "message_id": "w-1", "skill": "writing", "test_title": "Task 2", "provider": "qwen", "model": "qwen-flash",
            "prompt_tokens": 500, "completion_tokens": 300, "total_tokens": 800, "elapsed_ms": 900, "ttft_ms": 300,
        })
        await record_llm_feedback_telemetry(r, message_id="m-1", rating="down", namespace="tutor_test")
        await record_llm_feedback_telemetry(r, message_id="m-1", rating="up", namespace="tutor_test")

        rep = await get_llm_telemetry_report(r, "tutor_test")
        assert rep["total_tokens_today"] == 1200 and rep["cached_tokens_saved_today"] == 900
        assert rep["estimated_cost_usd_today"] > 0 and rep["cost_saved_usd_today"] > 0
        assert rep["redactions_today"] == 2 and rep["thumbs_up_today"] == 1 and rep["thumbs_down_today"] == 0 and rep["csat_pct"] == 100.0
        assert len(rep["models_breakdown"]) == 1 and rep["recent_traces"][1]["feedback"] == "up"

        w_rep = await get_llm_telemetry_report(r, "writing_test")
        assert w_rep["namespace"] == "writing_test" and w_rep["total_tokens_today"] == 800

    asyncio.run(_run())
