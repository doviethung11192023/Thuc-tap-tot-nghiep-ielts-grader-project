"""Quản lý hạn mức (Quota 40 lượt/giờ), khóa chống spam và thống kê realtime Trợ lý AI trên Redis."""
import json
import threading
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Tuple

from app.services.tutor.tutor_telemetry_store import get_llm_telemetry_report

VN_TZ = timezone(timedelta(hours=7))
_local_lock = threading.Lock()
_local_quota: Dict[str, List[float]] = {}
_local_stats: Dict[str, int] = {}
_local_top_tests: Dict[str, Dict[str, Any]] = {}


def _today_vn() -> str:
    return datetime.now(VN_TZ).strftime("%Y-%m-%d")


def _hour_bucket_utc() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d%H")


async def get_quota_status(redis_client: Any, user_id: str, hourly_limit: int) -> Dict[str, Any]:
    """Trả về số lượt còn lại trong giờ hiện tại cho học viên (Redis + fallback RAM)."""
    key = f"tutor:quota:{user_id}:{_hour_bucket_utc()}"
    used = 0
    try:
        if redis_client is not None:
            raw = await redis_client.get(key)
            used = int(raw or 0)
            return {"limit": hourly_limit, "used": used, "remaining": max(0, hourly_limit - used)}
    except Exception:
        pass
    now = datetime.now(timezone.utc).timestamp()
    with _local_lock:
        recent = [ts for ts in _local_quota.get(user_id, []) if now - ts < 3600]
        _local_quota[user_id] = recent
        used = len(recent)
    return {"limit": hourly_limit, "used": used, "remaining": max(0, hourly_limit - used)}


async def consume_quota(redis_client: Any, user_id: str, hourly_limit: int) -> Tuple[bool, Dict[str, Any]]:
    """Trừ 1 lượt hỏi nếu còn hạn mức; trả (allowed, quota_dict)."""
    key = f"tutor:quota:{user_id}:{_hour_bucket_utc()}"
    try:
        if redis_client is not None:
            used = int(await redis_client.incr(key))
            if used == 1:
                await redis_client.expire(key, 3700)
            if used > hourly_limit:
                await redis_client.decr(key)
                return False, {"limit": hourly_limit, "used": hourly_limit, "remaining": 0}
            return True, {"limit": hourly_limit, "used": used, "remaining": max(0, hourly_limit - used)}
    except Exception:
        pass
    now = datetime.now(timezone.utc).timestamp()
    with _local_lock:
        recent = [ts for ts in _local_quota.get(user_id, []) if now - ts < 3600]
        if len(recent) >= hourly_limit:
            return False, {"limit": hourly_limit, "used": hourly_limit, "remaining": 0}
        recent.append(now)
        _local_quota[user_id] = recent
        return True, {"limit": hourly_limit, "used": len(recent), "remaining": max(0, hourly_limit - len(recent))}


async def acquire_stream_lock(redis_client: Any, user_id: str) -> bool:
    """Chặn học viên gửi nhiều luồng song song gây lãng phí token."""
    key = f"tutor:lock:{user_id}"
    try:
        if redis_client is not None:
            return bool(await redis_client.set(key, "1", ex=35, nx=True))
    except Exception:
        pass
    return True


async def release_stream_lock(redis_client: Any, user_id: str) -> None:
    try:
        if redis_client is not None:
            await redis_client.delete(f"tutor:lock:{user_id}")
    except Exception:
        pass


async def record_tutor_stat(
    redis_client: Any,
    metric: str,
    test_id: str = "",
    test_title: str = "",
    skill: str = "",
) -> None:
    """Ghi nhận KPI realtime (turns, unlocks, cache_hits, errors, failovers) theo ngày VN."""
    day = _today_vn()
    key = f"tutor:stats:{day}:{metric}"
    try:
        if redis_client is not None:
            await redis_client.incr(key)
            await redis_client.expire(key, 172800)
            if metric == "turns" and test_id:
                tkey = f"tutor:top_tests:{day}"
                raw = await redis_client.get(tkey)
                board = json.loads(raw) if raw else {}
                cur = board.get(test_id, {"test_id": test_id, "title": test_title or test_id[:8], "skill": skill, "count": 0})
                cur["count"] = int(cur.get("count", 0)) + 1
                if test_title:
                    cur["title"] = test_title
                board[test_id] = cur
                await redis_client.setex(tkey, 172800, json.dumps(board, ensure_ascii=False))
            return
    except Exception:
        pass
    with _local_lock:
        _local_stats[key] = _local_stats.get(key, 0) + 1
        if metric == "turns" and test_id:
            cur = _local_top_tests.get(test_id, {"test_id": test_id, "title": test_title or test_id[:8], "skill": skill, "count": 0})
            cur["count"] += 1
            _local_top_tests[test_id] = cur


async def get_admin_tutor_stats(redis_client: Any) -> Dict[str, Any]:
    """Đọc 4 thẻ KPI realtime + Top 5 đề thi học viên hỏi AI nhiều nhất hôm nay."""
    day = _today_vn()
    metrics = ("turns", "unlocks", "cache_hits", "errors", "failovers")
    counts: Dict[str, int] = {m: 0 for m in metrics}
    top_tests: List[Dict[str, Any]] = []
    redis_ok = False
    try:
        if redis_client is not None and type(redis_client).__name__ != "NullRedisCache":
            for m in metrics:
                raw = await redis_client.get(f"tutor:stats:{day}:{m}")
                counts[m] = int(raw or 0)
            raw_top = await redis_client.get(f"tutor:top_tests:{day}")
            board = json.loads(raw_top) if raw_top else {}
            top_tests = sorted(board.values(), key=lambda x: -int(x.get("count", 0)))[:5]
            redis_ok = True
    except Exception:
        pass
    if not redis_ok:
        with _local_lock:
            for m in metrics:
                counts[m] = _local_stats.get(f"tutor:stats:{day}:{m}", 0)
            top_tests = sorted(_local_top_tests.values(), key=lambda x: -int(x.get("count", 0)))[:5]
    turns = counts["turns"]
    cache_rate = round((counts["cache_hits"] / turns) * 100, 1) if turns > 0 else 0.0
    return {
        "date": day,
        "redis_connected": redis_ok,
        "turns_today": turns,
        "unlocks_today": counts["unlocks"],
        "cache_hits_today": counts["cache_hits"],
        "cache_hit_rate": cache_rate,
        "errors_today": counts["errors"],
        "failovers_today": counts["failovers"],
        "top_tests": top_tests,
        "telemetry": await get_llm_telemetry_report(redis_client, "tutor"),
    }


async def flush_quick_chip_cache(redis_client: Any) -> int:
    """Xóa sạch cache Quick-Chip trên Redis khi Admin sửa Prompt hoặc Quick Chips."""
    removed = 0
    try:
        if redis_client is not None and hasattr(redis_client, "scan"):
            cursor = 0
            while True:
                cursor, keys = await redis_client.scan(cursor=cursor, match="tutor:cache:*", count=100)
                if keys:
                    removed += int(await redis_client.delete(*keys))
                if cursor == 0:
                    break
    except Exception:
        pass
    return removed
