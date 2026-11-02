"""
No-op stand-in for the ARQ Redis pool, used when Redis is not reachable at startup.

Redis is only a cache in this backend (topics list, admin statistics) and Writing
grading runs through FastAPI BackgroundTasks, so local demos can run without Redis:
every cache read misses and every write is silently dropped.
"""


class NullRedisCache:
    async def get(self, key):
        return None

    async def setex(self, key, seconds, value):
        return True

    async def keys(self, pattern):
        return []

    async def delete(self, *keys):
        return 0

    async def close(self):
        return None
