"""Kho cấu hình động 6 nhóm cho Trợ lý AI Luyện tập (lưu trong system_settings, 0 bảng DB mới)."""
import ipaddress
from typing import Any, Dict
from urllib.parse import urlparse

from app.core.domain_errors import InvalidRequestError
from app.db.supabase import db
from app.services.learning_profile.common import get_from_cache, set_to_cache
from app.services.tutor.tutor_secrets_store import VALID_PROVIDERS

PROVIDER_BASE_URLS: Dict[str, str] = {
    "qwen": "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    "groq": "https://api.groq.com/openai/v1",
    "gemini": "https://generativelanguage.googleapis.com/v1beta/openai/",
    "openai_compatible": "https://api.openai.com/v1",
}
TUTOR_CONFIG_CACHE_KEY = "ai_tutor_config_v1"

DEFAULT_AI_TUTOR_CONFIG: Dict[str, Any] = {
    "enabled": True,
    "enabled_skills": ["listening", "reading"],
    "hourly_quota": 40,
    "max_history_turns": 8,
    "max_input_chars": 500,
    "quick_chip_cache_ttl_sec": 3600,
    "primary_provider": "qwen",
    "primary_model": "qwen-flash",
    "primary_base_url": PROVIDER_BASE_URLS["qwen"],
    "enable_thinking": False,
    "failover_enabled": True,
    "failover_provider": "groq",
    "failover_model": "llama-3.3-70b-versatile",
    "failover_base_url": PROVIDER_BASE_URLS["groq"],
    "temperature": 0.3,
    "max_output_tokens": 420,
    "timeout_seconds": 30,
    "anti_spoiler_mode": "strict",
    "allow_answer_unlock": True,
    "min_attempts_before_unlock": 1,
    "default_hint_tier": 1,
    "max_response_words": 140,
    "enable_reading_highlight": True,
    "enable_band_adaptive_tone": True,
    "bot_name": "MoonBot AI",
    "default_language": "vi",
    "welcome_message_vi": "Xin chào! Mình là MoonBot AI — trợ lý luyện tập IELTS theo đúng đề bài trên màn hình. Hãy chọn nhóm câu hỏi bên dưới để nhận gợi ý chiến thuật và phân tích bẫy nhé!",
    "welcome_message_en": "Hi! I'm MoonBot AI — your on-screen IELTS practice tutor. Pick a question group below for step-by-step hints, keyword mapping, and distractor analysis!",
    "mascot_animation_enabled": True,
    "mascot_speed": 0.85,
    "quick_chips_listening_vi": [
        "Tôi không biết bắt đầu dạng bài này thế nào",
        "Gợi ý từ khóa & loại từ cần nghe cho nhóm này",
        "Chỉ giúp mình các bẫy dễ nhầm (distractors)",
        "Kiểm tra giúp mình đáp án đang điền",
    ],
    "quick_chips_listening_en": [
        "How should I approach this question type?",
        "What keywords and word types should I listen for?",
        "Point out likely distractor traps here",
        "Check my draft answer without spoiling it",
    ],
    "quick_chips_reading_vi": [
        "Hướng dẫn chiến thuật làm nhóm câu hỏi này",
        "Gợi ý từ khóa & đoạn văn nên đọc kỹ",
        "Phân tích bẫy paraphrase / False vs Not Given",
        "Kiểm tra giúp mình đáp án đang chọn",
    ],
    "quick_chips_reading_en": [
        "Suggest a step-by-step strategy for this group",
        "Which paragraph and keywords should I scan?",
        "Explain paraphrase traps (False vs Not Given)",
        "Check my current draft answer",
    ],
    "custom_system_instructions": "",
}


_BLOCKED_INTERNAL_SUFFIXES = (".internal", ".local", ".localhost", ".nip.io", ".sslip.io", ".xip.io")
_BLOCKED_LOCAL_PORTS = {8000, 8001, 3000, 6379}


def validate_base_url(url: str, field_name: str) -> str:
    """Chống SSRF đa lớp: chặn metadata, internal DNS/wildcard, loopback qua https hoặc cổng dịch vụ nội bộ."""
    u = (url or "").strip()
    if not u:
        raise InvalidRequestError(f"{field_name} không được để trống")
    parsed = urlparse(u)
    host = (parsed.hostname or "").lower().rstrip(".")
    if not host:
        raise InvalidRequestError(f"{field_name} không hợp lệ")
    if parsed.scheme == "http" and host in ("localhost", "127.0.0.1"):
        if parsed.port in _BLOCKED_LOCAL_PORTS:
            raise InvalidRequestError(f"{field_name} không được trỏ vào cổng dịch vụ nội bộ ({parsed.port})")
        return u
    if parsed.scheme != "https":
        raise InvalidRequestError(f"{field_name} bắt buộc dùng https:// (hoặc http://localhost cho model nội bộ)")
    if host in ("localhost", "metadata", "metadata.google.internal") or host.endswith(_BLOCKED_INTERNAL_SUFFIXES):
        raise InvalidRequestError(f"{field_name} không được trỏ vào tên miền nội bộ hoặc metadata")
    try:
        ip = ipaddress.ip_address(host)
        if ip.is_private or ip.is_link_local or ip.is_loopback or ip.is_reserved or ip.is_multicast:
            raise InvalidRequestError(f"{field_name} không được trỏ vào dải IP nội bộ")
    except ValueError:
        pass
    return u


def _clean_chips(raw: Any, fallback: list[str]) -> list[str]:
    if not isinstance(raw, list):
        return list(fallback)
    cleaned = [str(x).strip()[:120] for x in raw if str(x).strip()]
    return cleaned[:4] if cleaned else list(fallback)


def validate_tutor_config(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Chuẩn hóa và kiểm duyệt toàn bộ 6 nhóm cấu hình Trợ lý AI từ Admin."""
    cfg = {**DEFAULT_AI_TUTOR_CONFIG, **(raw or {})}
    p_prov = str(cfg.get("primary_provider") or "qwen").lower()
    f_prov = str(cfg.get("failover_provider") or "groq").lower()
    if p_prov not in VALID_PROVIDERS or f_prov not in VALID_PROVIDERS:
        raise InvalidRequestError("Provider không hợp lệ (qwen, groq, gemini, openai_compatible)")
    skills = [s for s in (cfg.get("enabled_skills") or []) if s in ("listening", "reading")]
    anti = str(cfg.get("anti_spoiler_mode") or "strict").lower()
    if anti not in ("strict", "balanced", "off"):
        anti = "strict"
    lang = "en" if str(cfg.get("default_language") or "vi").lower() == "en" else "vi"
    return {
        "enabled": bool(cfg.get("enabled", True)),
        "enabled_skills": skills,
        "hourly_quota": max(5, min(200, int(cfg.get("hourly_quota") or 40))),
        "max_history_turns": max(2, min(20, int(cfg.get("max_history_turns") or 8))),
        "max_input_chars": max(100, min(1000, int(cfg.get("max_input_chars") or 500))),
        "quick_chip_cache_ttl_sec": max(0, min(86400, int(cfg.get("quick_chip_cache_ttl_sec") if cfg.get("quick_chip_cache_ttl_sec") is not None else 3600))),
        "primary_provider": p_prov,
        "primary_model": str(cfg.get("primary_model") or "qwen-flash").strip()[:100],
        "primary_base_url": validate_base_url(str(cfg.get("primary_base_url") or PROVIDER_BASE_URLS[p_prov]), "primary_base_url"),
        "enable_thinking": bool(cfg.get("enable_thinking", False)),
        "failover_enabled": bool(cfg.get("failover_enabled", True)),
        "failover_provider": f_prov,
        "failover_model": str(cfg.get("failover_model") or "llama-3.3-70b-versatile").strip()[:100],
        "failover_base_url": validate_base_url(str(cfg.get("failover_base_url") or PROVIDER_BASE_URLS[f_prov]), "failover_base_url"),
        "temperature": round(max(0.0, min(1.0, float(cfg.get("temperature") if cfg.get("temperature") is not None else 0.3))), 2),
        "max_output_tokens": max(150, min(1200, int(cfg.get("max_output_tokens") or 420))),
        "timeout_seconds": max(10, min(90, int(cfg.get("timeout_seconds") or 30))),
        "anti_spoiler_mode": anti,
        "allow_answer_unlock": bool(cfg.get("allow_answer_unlock", True)),
        "min_attempts_before_unlock": max(0, min(3, int(cfg.get("min_attempts_before_unlock") if cfg.get("min_attempts_before_unlock") is not None else 1))),
        "default_hint_tier": max(1, min(3, int(cfg.get("default_hint_tier") or 1))),
        "max_response_words": max(60, min(300, int(cfg.get("max_response_words") or 140))),
        "enable_reading_highlight": bool(cfg.get("enable_reading_highlight", True)),
        "enable_band_adaptive_tone": bool(cfg.get("enable_band_adaptive_tone", True)),
        "bot_name": (str(cfg.get("bot_name") or "MoonBot AI").strip() or "MoonBot AI")[:40],
        "default_language": lang,
        "welcome_message_vi": str(cfg.get("welcome_message_vi") or DEFAULT_AI_TUTOR_CONFIG["welcome_message_vi"]).strip()[:400],
        "welcome_message_en": str(cfg.get("welcome_message_en") or DEFAULT_AI_TUTOR_CONFIG["welcome_message_en"]).strip()[:400],
        "mascot_animation_enabled": bool(cfg.get("mascot_animation_enabled", True)),
        "mascot_speed": round(max(0.5, min(2.0, float(cfg.get("mascot_speed") or 0.85))), 2),
        "quick_chips_listening_vi": _clean_chips(cfg.get("quick_chips_listening_vi"), DEFAULT_AI_TUTOR_CONFIG["quick_chips_listening_vi"]),
        "quick_chips_listening_en": _clean_chips(cfg.get("quick_chips_listening_en"), DEFAULT_AI_TUTOR_CONFIG["quick_chips_listening_en"]),
        "quick_chips_reading_vi": _clean_chips(cfg.get("quick_chips_reading_vi"), DEFAULT_AI_TUTOR_CONFIG["quick_chips_reading_vi"]),
        "quick_chips_reading_en": _clean_chips(cfg.get("quick_chips_reading_en"), DEFAULT_AI_TUTOR_CONFIG["quick_chips_reading_en"]),
        "custom_system_instructions": str(cfg.get("custom_system_instructions") or "").strip()[:1200],
    }


def get_tutor_config_cached() -> Dict[str, Any]:
    cached = get_from_cache(TUTOR_CONFIG_CACHE_KEY)
    if cached is not None:
        return dict(cached)
    rows = db().table("system_settings").select("value").eq("key", "ai_tutor_config").execute().data or []
    val = validate_tutor_config(rows[0]["value"]) if rows and isinstance(rows[0].get("value"), dict) else dict(DEFAULT_AI_TUTOR_CONFIG)
    set_to_cache(TUTOR_CONFIG_CACHE_KEY, val, ttl_seconds=30)
    return dict(val)


def invalidate_tutor_config_cache() -> None:
    set_to_cache(TUTOR_CONFIG_CACHE_KEY, None, ttl_seconds=0)


def extract_public_ui_config(cfg: Dict[str, Any], skill: str) -> Dict[str, Any]:
    """Chỉ trích xuất cấu hình hiển thị an toàn cho phía Học viên (không lộ prompt hay cấu hình model)."""
    is_reading = skill == "reading"
    return {
        "enabled": bool(cfg["enabled"] and skill in cfg["enabled_skills"]),
        "bot_name": cfg["bot_name"],
        "default_language": cfg["default_language"],
        "welcome_message_vi": cfg["welcome_message_vi"],
        "welcome_message_en": cfg["welcome_message_en"],
        "mascot_animation_enabled": cfg["mascot_animation_enabled"],
        "mascot_speed": cfg["mascot_speed"],
        "allow_answer_unlock": cfg["allow_answer_unlock"],
        "min_attempts_before_unlock": cfg["min_attempts_before_unlock"],
        "default_hint_tier": cfg["default_hint_tier"],
        "max_input_chars": cfg["max_input_chars"],
        "enable_reading_highlight": cfg["enable_reading_highlight"] if is_reading else False,
        "anti_spoiler_mode": cfg["anti_spoiler_mode"],
        "quick_chips_vi": cfg["quick_chips_reading_vi"] if is_reading else cfg["quick_chips_listening_vi"],
        "quick_chips_en": cfg["quick_chips_reading_en"] if is_reading else cfg["quick_chips_listening_en"],
    }
