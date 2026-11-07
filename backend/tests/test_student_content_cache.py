"""Cache Learner trên Redis: dùng chung nhiều tiến trình, Redis lỗi thì đọc DB, Admin đổi đề thì mất hiệu lực."""
import asyncio

from app.core.null_redis_cache import NullRedisCache
from app.core.student_content_cache import get_or_load, invalidate_student_content


class MemoryRedis:
    def __init__(self):
        self.values = {}

    async def get(self, key):
        return self.values.get(key)

    async def setex(self, key, seconds, value):
        self.values[key] = value.encode()

    async def incr(self, key):
        self.values[key] = str(int(self.values.get(key, b"0")) + 1).encode()


class BrokenRedis:
    async def get(self, key):
        raise ConnectionError("down")

    async def setex(self, key, seconds, value):
        raise ConnectionError("down")

    async def incr(self, key):
        raise ConnectionError("down")


def _load(redis, loader):
    return asyncio.run(get_or_load(redis, "catalog", "k", 60, loader))


def test_second_read_comes_from_cache_even_on_another_process():
    redis, calls = MemoryRedis(), []
    assert _load(redis, lambda: calls.append(1) or {"a": 1}) == ({"a": 1}, False)
    assert _load(redis, lambda: calls.append(1) or {"a": 2}) == ({"a": 1}, True)
    assert len(calls) == 1


def test_invalidate_hides_every_old_entry():
    redis = MemoryRedis()
    _load(redis, lambda: {"a": 1})
    asyncio.run(invalidate_student_content(redis))
    assert _load(redis, lambda: {"a": 2}) == ({"a": 2}, False)


def test_missing_content_is_not_cached():
    redis, calls = MemoryRedis(), []
    _load(redis, lambda: calls.append(1))
    _load(redis, lambda: calls.append(1))
    assert len(calls) == 2


def test_redis_outage_falls_back_to_the_database():
    for redis in (BrokenRedis(), NullRedisCache()):
        assert _load(redis, lambda: {"a": 1}) == ({"a": 1}, False)
        asyncio.run(invalidate_student_content(redis))
