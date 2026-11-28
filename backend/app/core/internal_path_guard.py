"""Lớp chặn thứ hai cho /api/v1/internal/*: request đi qua Cloudflare (có header CF-Connecting-IP) bị 404.

Lớp thứ nhất là rule WAF của Cloudflare. Gọi nội bộ từ ai-engine trong mạng Docker không đi qua Cloudflare
nên không có header này và vẫn chạy bình thường.
"""
import logging

from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

logger = logging.getLogger(__name__)

INTERNAL_PREFIX = "/api/v1/internal"
CLOUDFLARE_HEADER = b"cf-connecting-ip"


class BlockInternalFromInternetMiddleware:
    """Pure ASGI middleware; trả đúng dạng 404 mặc định của FastAPI ({"detail": "Not Found"})."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] == "http" and self._is_blocked(scope):
            logger.warning("Chặn %s %s từ Internet (có CF-Connecting-IP)", scope["method"], scope["path"])
            await JSONResponse({"detail": "Not Found"}, status_code=404)(scope, receive, send)
            return
        await self.app(scope, receive, send)

    @staticmethod
    def _is_blocked(scope: Scope) -> bool:
        path: str = scope["path"]
        if path != INTERNAL_PREFIX and not path.startswith(INTERNAL_PREFIX + "/"):
            return False
        return any(name == CLOUDFLARE_HEADER for name, _ in scope["headers"])
