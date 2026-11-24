"""Quản lý lịch sử phiên chat (TTL 24h), phản hồi Thumbs Up/Down và cache Quick-Chip trên Redis."""
import hashlib
import json
import threading
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

SESSION_TTL_SECONDS = 86400
MAX_STORED_MESSAGES = 30

_mem_lock = threading.Lock()
_mem_sessions: Dict[str, List[Dict[str, Any]]] = {}
_mem_chip_cache: Dict[str, str] = {}


def _session_key(user_id: str, attempt_id: str) -> str:
    return f"tutor:session:{user_id}:{attempt_id}"


async def load_session_messages(redis_client: Any, user_id: str, attempt_id: str) -> List[Dict[str, Any]]:
    key = _session_key(user_id, attempt_id)
    try:
        if redis_client is not None:
            raw = await redis_client.get(key)
            if raw:
                data = json.loads(raw)
                if isinstance(data, list):
                    return data
    except Exception:
        pass
    with _mem_lock:
        return list(_mem_sessions.get(key, []))


async def save_session_messages(redis_client: Any, user_id: str, attempt_id: str, messages: List[Dict[str, Any]]) -> None:
    key = _session_key(user_id, attempt_id)
    trimmed = messages[-MAX_STORED_MESSAGES:]
    try:
        if redis_client is not None:
            await redis_client.setex(key, SESSION_TTL_SECONDS, json.dumps(trimmed, ensure_ascii=False))
            return
    except Exception:
        pass
    with _mem_lock:
        _mem_sessions[key] = trimmed


async def append_turn(
    redis_client: Any,
    user_id: str,
    attempt_id: str,
    user_msg: str,
    assistant_msg: str,
    meta: Dict[str, Any],
) -> Dict[str, Any]:
    msgs = await load_session_messages(redis_client, user_id, attempt_id)
    now_iso = datetime.now(timezone.utc).isoformat()
    u_entry = {
        "id": str(uuid.uuid4())[:12],
        "role": "user",
        "content": user_msg,
        "group_label": meta.get("group_label", ""),
        "target_question_no": meta.get("target_question_no"),
        "created_at": now_iso,
    }
    a_entry = {
        "id": str(uuid.uuid4())[:12],
        "role": "assistant",
        "content": assistant_msg,
        "group_label": meta.get("group_label", ""),
        "target_question_no": meta.get("target_question_no"),
        "unlocked": bool(meta.get("unlocked", False)),
        "provider": meta.get("provider", ""),
        "model": meta.get("model", ""),
        "cached": bool(meta.get("cached", False)),
        "feedback": None,
        "created_at": now_iso,
    }
    msgs.extend([u_entry, a_entry])
    await save_session_messages(redis_client, user_id, attempt_id, msgs)
    return a_entry


async def clear_session(redis_client: Any, user_id: str, attempt_id: str) -> None:
    key = _session_key(user_id, attempt_id)
    try:
        if redis_client is not None:
            await redis_client.delete(key)
    except Exception:
        pass
    with _mem_lock:
        _mem_sessions.pop(key, None)


async def set_message_feedback(redis_client: Any, user_id: str, attempt_id: str, message_id: str, rating: str) -> bool:
    msgs = await load_session_messages(redis_client, user_id, attempt_id)
    found = False
    for m in msgs:
        if m.get("id") == message_id and m.get("role") == "assistant":
            m["feedback"] = rating
            found = True
            break
    if found:
        await save_session_messages(redis_client, user_id, attempt_id, msgs)
    return found


def make_chip_cache_key(
    test_id: str,
    group_id: str,
    lang: str,
    prompt: str,
    anti_mode: str,
    model: str,
    target_q: Optional[int] = None,
    hint_tier: int = 1,
) -> str:
    raw_sig = f"{prompt.strip().lower()}|{anti_mode}|{model}|q={target_q or 0}|t={hint_tier}"
    digest = hashlib.sha256(raw_sig.encode("utf-8")).hexdigest()[:16]
    return f"tutor:cache:{test_id}:{group_id}:{lang}:{digest}"


async def get_cached_chip_reply(redis_client: Any, cache_key: str) -> Optional[str]:
    try:
        if redis_client is not None:
            raw = await redis_client.get(cache_key)
            if raw:
                return raw.decode("utf-8") if isinstance(raw, bytes) else str(raw)
    except Exception:
        pass
    with _mem_lock:
        return _mem_chip_cache.get(cache_key)


async def set_cached_chip_reply(redis_client: Any, cache_key: str, text: str, ttl_sec: int) -> None:
    if ttl_sec <= 0 or not text.strip():
        return
    try:
        if redis_client is not None:
            await redis_client.setex(cache_key, ttl_sec, text)
            return
    except Exception:
        pass
    with _mem_lock:
        _mem_chip_cache[cache_key] = text
