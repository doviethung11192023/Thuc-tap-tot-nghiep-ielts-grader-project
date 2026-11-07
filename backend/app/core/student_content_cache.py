"""
Cache nội dung phía Learner trên Redis (danh mục, nội dung đề, bài tập theo dạng).

Dùng chung cho mọi tiến trình uvicorn. Xoá cache bằng cách tăng số phiên bản nằm trong khoá: không cần
quét khoá, các khoá cũ tự hết hạn theo TTL. Redis lỗi thì coi như cache miss, API vẫn đọc từ DB.
"""
import json
from typing import Any, Awaitable, Callable, Tuple

from fastapi import Request, Response
from fastapi.routing import APIRoute

VERSION_KEY = "student-content:version"
_MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


async def _versioned_key(redis: Any, namespace: str, key: str) -> str:
    version = await redis.get(VERSION_KEY)
    version = version.decode() if isinstance(version, bytes) else (version or "0")
    return f"student-content:{version}:{namespace}:{key}"


async def get_or_load(redis: Any, namespace: str, key: str, ttl_seconds: int,
                      load: Callable[[], Any]) -> Tuple[Any, bool]:
    """Trả (dữ liệu, có_từ_cache). `load` trả None nghĩa là không có dữ liệu, kết quả đó không được cache."""
    cache_key = None
    try:
        cache_key = await _versioned_key(redis, namespace, key)
        cached = await redis.get(cache_key)
        if cached is not None:
            return json.loads(cached), True
    except Exception as e:
        print(f"⚠️ [Cache] không đọc được {namespace}: {e}")

    data = load()
    if data is not None and cache_key:
        try:
            await redis.setex(cache_key, ttl_seconds, json.dumps(data))
        except Exception as e:
            print(f"⚠️ [Cache] không ghi được {namespace}: {e}")
    return data, False


async def invalidate_student_content(redis: Any) -> None:
    try:
        await redis.incr(VERSION_KEY)
    except Exception as e:
        print(f"⚠️ [Cache] không xoá được cache Learner: {e}")


class StudentContentMutationRoute(APIRoute):
    """Route đổi đề, bộ đề hoặc bảng quy đổi: thành công thì xoá cache Learner, để publish có hiệu lực ngay."""

    def get_route_handler(self) -> Callable[[Request], Awaitable[Response]]:
        handler = super().get_route_handler()

        async def invalidate_after_success(request: Request) -> Response:
            response = await handler(request)
            if request.method in _MUTATING_METHODS and response.status_code < 400:
                await invalidate_student_content(getattr(request.app.state, "redis", None))
            return response

        return invalidate_after_success
