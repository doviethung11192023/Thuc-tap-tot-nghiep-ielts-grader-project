"""Proxy SSE streaming từ Core API (:8000) sang AI Engine (:8001) kèm Quick-Chip Cache & KPI."""
import json
from typing import Any, AsyncIterator, Dict

import httpx

from app.core.config import settings
from app.services.tutor.tutor_quota_and_stats import record_tutor_stat, release_stream_lock
from app.services.tutor.tutor_secrets_store import get_tutor_secret_overrides
from app.services.tutor.tutor_telemetry_store import record_llm_turn_telemetry
from app.services.tutor.tutor_session_store import (
    append_turn,
    get_cached_chip_reply,
    set_cached_chip_reply,
)


def ai_engine_base_url() -> str:
    base = (settings.AI_ENGINE_URL or "http://localhost:8001/grade").rstrip("/")
    return base[:-6] if base.endswith("/grade") else base


def ai_engine_headers() -> Dict[str, str]:
    sec = (settings.AI_ENGINE_SECRET or "").strip()
    return {"X-AI-Engine-Secret": sec} if sec else {}


def _build_engine_payload(
    cfg: Dict[str, Any],
    ctx: Dict[str, Any],
    history_raw: list[Dict[str, Any]],
    body: Any,
    msg_clean: str,
    lang: str,
) -> Dict[str, Any]:
    overrides = get_tutor_secret_overrides()
    max_hist = int(cfg["max_history_turns"]) * 2
    return {
        **ctx,
        "user_answers": body.user_answers,
        "history": [{"role": m["role"], "content": m["content"]} for m in history_raw[-max_hist:] if m.get("role") in ("user", "assistant")],
        "message": msg_clean, "language": lang, "hint_tier": body.hint_tier,
        "unlock_answer": body.unlock_answer, "target_question_no": body.target_question_no,
        "bot_name": cfg["bot_name"], "anti_spoiler_mode": cfg["anti_spoiler_mode"],
        "max_response_words": cfg["max_response_words"], "enable_reading_highlight": cfg["enable_reading_highlight"],
        "custom_system_instructions": cfg["custom_system_instructions"],
        "primary_provider": cfg["primary_provider"], "primary_model": cfg["primary_model"],
        "primary_base_url": cfg["primary_base_url"], "primary_api_key": overrides.get(cfg["primary_provider"]),
        "enable_thinking": cfg["enable_thinking"], "failover_enabled": cfg["failover_enabled"],
        "failover_provider": cfg["failover_provider"], "failover_model": cfg["failover_model"],
        "failover_base_url": cfg["failover_base_url"], "failover_api_key": overrides.get(cfg["failover_provider"]),
        "temperature": cfg["temperature"], "max_output_tokens": cfg["max_output_tokens"], "timeout_seconds": cfg["timeout_seconds"],
    }


async def proxy_tutor_sse(
    redis: Any,
    uid: str,
    attempt: Dict[str, Any],
    cfg: Dict[str, Any],
    ctx: Dict[str, Any],
    history_raw: list[Dict[str, Any]],
    body: Any,
    msg_clean: str,
    lang: str,
    quota: Dict[str, Any],
    cache_key: str,
) -> AsyncIterator[str]:
    full_parts: list[str] = []
    meta = {"provider": cfg["primary_provider"], "model": cfg["primary_model"], "failover_used": False, "cached": False}
    try:
        if cache_key:
            cached_text = await get_cached_chip_reply(redis, cache_key)
            if cached_text:
                meta["cached"] = True
                yield f"event: delta\ndata: {json.dumps({'text': cached_text}, ensure_ascii=False)}\n\n"
                saved = await append_turn(redis, uid, body.attempt_id, msg_clean, cached_text, {**meta, "group_label": ctx["group_label"], "target_question_no": body.target_question_no, "unlocked": False})
                await record_tutor_stat(redis, "turns", attempt["test_id"], ctx["test_title"], attempt["skill"])
                await record_tutor_stat(redis, "cache_hits")
                est_saved = max(750, len(str(ctx.get("context_text") or "")) // 4 + len(cached_text) // 4 + 280)
                await record_llm_turn_telemetry(redis, namespace="tutor", data={
                    **meta, "message_id": saved["id"], "skill": attempt["skill"], "test_id": attempt["test_id"],
                    "test_title": ctx["test_title"], "section_no": body.section_no, "target_question_no": body.target_question_no,
                    "hint_tier": body.hint_tier, "unlocked": False, "cached": True, "cached_tokens_saved": est_saved,
                    "question_preview": msg_clean[:100], "answer_preview": cached_text[:160],
                })
                yield f"event: done\ndata: {json.dumps({'message_id': saved['id'], 'quota': quota, **meta, 'unlocked': False}, ensure_ascii=False)}\n\n"
                return

        payload = _build_engine_payload(cfg, ctx, history_raw, body, msg_clean, lang)
        done_telemetry: Dict[str, Any] = {}
        timeout = httpx.Timeout(connect=10.0, read=float(cfg["timeout_seconds"]) + 15.0, write=15.0, pool=10.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream("POST", f"{ai_engine_base_url()}/tutor/stream", json=payload, headers=ai_engine_headers()) as resp:
                if resp.status_code != 200:
                    await record_tutor_stat(redis, "errors")
                    yield f"event: error\ndata: {json.dumps({'detail': 'AI Engine đang bận, vui lòng thử lại'}, ensure_ascii=False)}\n\n"
                    return
                cur_event = "message"
                async for line in resp.aiter_lines():
                    if line.startswith("event:"):
                        cur_event = line[6:].strip()
                    elif line.startswith("data:"):
                        data = json.loads(line[5:].strip())
                        ev_type = data.get("type") or cur_event
                        if ev_type in ("token", "delta"):
                            chunk_txt = data.get("content") or data.get("text") or ""
                            if chunk_txt:
                                full_parts.append(chunk_txt)
                                yield f"event: delta\ndata: {json.dumps({'text': chunk_txt}, ensure_ascii=False)}\n\n"
                        elif ev_type == "meta":
                            meta["provider"] = data.get("provider", meta["provider"])
                            meta["model"] = data.get("model", meta["model"])
                            meta["failover_used"] = bool(data.get("failover", data.get("failover_used", False)))
                        elif ev_type == "done":
                            meta["provider"] = data.get("provider", meta["provider"])
                            meta["model"] = data.get("model", meta["model"])
                            meta["failover_used"] = bool(data.get("failover", data.get("failover_used", meta["failover_used"])))
                            done_telemetry = data
                        elif ev_type == "error":
                            await record_tutor_stat(redis, "errors")
                            yield f"event: error\ndata: {json.dumps({'detail': data.get('detail', 'AI Engine gặp lỗi')}, ensure_ascii=False)}\n\n"
                            return
        reply_text = "".join(full_parts).strip()
        if reply_text:
            saved = await append_turn(redis, uid, body.attempt_id, msg_clean, reply_text, {**meta, "group_label": ctx["group_label"], "target_question_no": body.target_question_no, "unlocked": body.unlock_answer})
            if cache_key:
                await set_cached_chip_reply(redis, cache_key, reply_text, int(cfg["quick_chip_cache_ttl_sec"]))
            await record_tutor_stat(redis, "turns", attempt["test_id"], ctx["test_title"], attempt["skill"])
            if body.unlock_answer:
                await record_tutor_stat(redis, "unlocks")
            if meta.get("failover_used"):
                await record_tutor_stat(redis, "failovers")
            await record_llm_turn_telemetry(redis, namespace="tutor", data={
                **done_telemetry, **meta, "message_id": saved["id"], "skill": attempt["skill"],
                "test_id": attempt["test_id"], "test_title": ctx["test_title"], "section_no": body.section_no,
                "target_question_no": body.target_question_no, "hint_tier": body.hint_tier,
                "unlocked": body.unlock_answer, "cached": False,
                "question_preview": msg_clean[:100], "answer_preview": reply_text[:160],
            })
            yield f"event: done\ndata: {json.dumps({'message_id': saved['id'], 'quota': quota, **meta, 'unlocked': body.unlock_answer}, ensure_ascii=False)}\n\n"
        else:
            await record_tutor_stat(redis, "errors")
            yield f"event: error\ndata: {json.dumps({'detail': 'Trợ lý AI không nhận được phản hồi, vui lòng thử lại'}, ensure_ascii=False)}\n\n"
    except Exception:
        await record_tutor_stat(redis, "errors")
        yield f"event: error\ndata: {json.dumps({'detail': 'Kết nối Trợ lý AI bị gián đoạn, vui lòng thử lại'}, ensure_ascii=False)}\n\n"
    finally:
        await release_stream_lock(redis, uid)
