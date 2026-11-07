"""
No-op stand-in for the ARQ Redis pool, used when Redis is not reachable at startup.

Without Redis the API still serves requests: every cache read misses and every write is dropped.
Submitting still saves the work, but nothing is graded until Redis and the ARQ workers are running:
grading_runs keeps the pending jobs and the recovery cron enqueues them.
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

    async def incr(self, key):
        return 0

    async def enqueue_job(self, function, *args, **kwargs):
        print(f"⚠️ [Queue] Redis unavailable, {function} left for the recovery cron")
        return None

    async def close(self):
        return None
