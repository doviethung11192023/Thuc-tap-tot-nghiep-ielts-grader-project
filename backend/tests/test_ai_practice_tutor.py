"""Unit tests cho AI Practice Tutor: SSRF, Secret Encryption, Mock Guard, Quota, Anti-Spoiler."""
import asyncio
import importlib.util
import sys
from pathlib import Path
from unittest.mock import patch

import pytest

from app.api.endpoints.admin.content.core import ALLOWED_UPSERT_SETTINGS, HIDDEN_SECRET_SETTINGS
from app.core.domain_errors import ForbiddenError, InvalidRequestError, NotFoundError
from app.services.tutor.tutor_config_store import (
    DEFAULT_AI_TUTOR_CONFIG,
    extract_public_ui_config,
    validate_base_url,
    validate_tutor_config,
)
from app.services.tutor.tutor_context_builder import verify_practice_attempt
from app.services.tutor.tutor_quota_and_stats import consume_quota, get_quota_status
from app.services.tutor.tutor_secrets_store import decrypt_secret, encrypt_secret, mask_secret


def _load_anti_spoiler_filter():
    import types
    ai_dir = Path(__file__).resolve().parents[2] / "ai-engine"  # AI engine dời khỏi backend/app/ai (2026-11-23)
    if str(ai_dir) not in sys.path:
        sys.path.insert(0, str(ai_dir))
    if "openai" not in sys.modules:
        fake_openai = types.ModuleType("openai")
        fake_openai.AsyncOpenAI = object
        sys.modules["openai"] = fake_openai
    spec = importlib.util.spec_from_file_location("tutor_streaming_service", ai_dir / "services" / "tutor_streaming_service.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod._AntiSpoilerStreamFilter


def test_ssrf_base_url_validation():
    assert validate_base_url("https://dashscope-intl.aliyuncs.com/compatible-mode/v1", "primary_base_url").startswith("https://")
    assert validate_base_url("http://localhost:11434/v1", "primary_base_url") == "http://localhost:11434/v1"
    for bad in ("http://example.com/v1", "https://169.254.169.254/latest", "https://10.0.0.5/v1", "https://192.168.1.1/v1", ""):
        with pytest.raises(InvalidRequestError):
            validate_base_url(bad, "primary_base_url")


def test_validate_tutor_config_and_public_projection():
    cfg = validate_tutor_config({
        "hourly_quota": 999,
        "temperature": 2.5,
        "anti_spoiler_mode": "unknown",
        "custom_system_instructions": "TOP SECRET PROMPT",
        "quick_chips_reading_vi": ["A", "B", "C", "D", "E"],
    })
    assert cfg["hourly_quota"] == 200
    assert cfg["temperature"] == 1.0
    assert cfg["anti_spoiler_mode"] == "strict"
    assert len(cfg["quick_chips_reading_vi"]) == 4

    pub = extract_public_ui_config(cfg, "reading")
    assert "custom_system_instructions" not in pub
    assert "primary_model" not in pub
    assert "primary_base_url" not in pub
    assert pub["enable_reading_highlight"] is True

    with pytest.raises(InvalidRequestError):
        validate_tutor_config({"primary_provider": "invalid_vendor"})


def test_secret_encryption_and_hidden_settings():
    raw = "sk-live-super-secret-987654"
    enc = encrypt_secret(raw)
    assert enc.startswith("v1:")
    assert raw not in enc
    assert decrypt_secret(enc) == raw
    assert decrypt_secret(enc[:-2] + "XX") == ""
    assert mask_secret(raw) == "sk-l****7654"
    assert "ai_tutor_secrets" in HIDDEN_SECRET_SETTINGS
    assert "ai_tutor_config" in ALLOWED_UPSERT_SETTINGS


def test_verify_practice_attempt_blocks_mock_and_disabled():
    cfg = dict(DEFAULT_AI_TUTOR_CONFIG)
    with patch("app.services.tutor.tutor_context_builder.get_owned_attempt", return_value=None):
        with pytest.raises(NotFoundError):
            verify_practice_attempt("att-1", "u-1", cfg)

    with patch("app.services.tutor.tutor_context_builder.get_owned_attempt", return_value={"id": "a", "skill": "reading", "mode": "mock"}):
        with pytest.raises(ForbiddenError):
            verify_practice_attempt("a", "u-1", cfg)

    with patch("app.services.tutor.tutor_context_builder.get_owned_attempt", return_value={"id": "a", "skill": "writing", "mode": "practice"}):
        with pytest.raises(ForbiddenError):
            verify_practice_attempt("a", "u-1", cfg)

    with patch("app.services.tutor.tutor_context_builder.get_owned_attempt", return_value={"id": "a", "skill": "listening", "mode": "practice"}):
        assert verify_practice_attempt("a", "u-1", cfg)["mode"] == "practice"
        with pytest.raises(ForbiddenError):
            verify_practice_attempt("a", "u-1", {**cfg, "enabled": False})
        with pytest.raises(ForbiddenError):
            verify_practice_attempt("a", "u-1", {**cfg, "enabled_skills": ["reading"]})


def test_quota_limit_enforced_in_memory():
    async def _run():
        uid = "tutor-test-quota-user"
        for i in range(2):
            ok, q = await consume_quota(None, uid, 2)
            assert ok is True
            assert q["used"] == i + 1
        ok3, q3 = await consume_quota(None, uid, 2)
        assert ok3 is False
        assert q3["remaining"] == 0
        st = await get_quota_status(None, uid, 2)
        assert st["remaining"] == 0

    asyncio.run(_run())


def test_anti_spoiler_stream_filter_redacts_across_chunks():
    FilterCls = _load_anti_spoiler_filter()
    flt = FilterCls(["Whitaker", "museum"], enabled=True, lang="vi")
    chunks = ["Đáp án là ông Whi", "taker làm việc ở mus", "eum cổ."]
    out = "".join(flt.feed(c) for c in chunks) + flt.flush()
    assert "Whitaker" not in out
    assert "museum" not in out
    assert "[từ cần tìm]" in out
    assert flt.redacted is True

    off = FilterCls(["Whitaker"], enabled=False, lang="vi")
    assert off.feed("Đáp án là Whitaker.") + off.flush() == "Đáp án là Whitaker."


def test_matching_option_anti_spoiler_and_vi_language_guard():
    FilterCls = _load_anti_spoiler_filter()
    from services.tutor_prompts import build_tutor_messages, extract_spoiler_guard_data

    questions = [{
        "number": 1,
        "prompt": "It is at the forefront of the pack when it makes a kill.",
        "options": ["A. the alpha wolf", "B. the beta wolf", "C. the tester wolf"],
        "accepted_answers": ["B"],
    }]
    terms, letters = extract_spoiler_guard_data(questions)
    assert "the beta wolf" in terms
    assert "beta wolf" in terms
    assert "B" in letters

    flt = FilterCls(terms, enabled=True, lang="vi", option_letters=letters)
    sample = "Hãy xem [Đoạn B]. Thực ra beta wolf đảm nhận vai trò này nên đáp án là B."
    redacted = flt.feed(sample) + flt.flush()
    assert "[Đoạn B]" in redacted
    assert "beta wolf" not in redacted.lower()
    assert "đáp án là B" not in redacted

    msgs = build_tutor_messages({
        "skill": "reading",
        "language": "vi",
        "anti_spoiler_mode": "strict",
        "questions": questions,
        "history": [{"role": "assistant", "content": "Tier 1 Hint: Scan Paragraph A..."}],
        "message": "Hướng dẫn mình tìm đáp án câu 1",
    })
    assert "TIẾNG VIỆT" in msgs[0]["content"]
    assert "TIẾNG VIỆT" in msgs[-2]["content"]
    assert msgs[-2]["role"] == "system"
