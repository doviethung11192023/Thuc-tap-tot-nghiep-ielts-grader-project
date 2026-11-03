from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from arq import create_pool
from arq.connections import RedisSettings
from app.core.config import settings

import sys

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup ARQ Redis Pool (Redis is only a cache → fall back to a no-op cache when it is down)
    try:
        redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)
        redis_settings.conn_retries = 1
        app.state.redis = await create_pool(redis_settings)
        print("[ARQ] Cau hinh thanh cong ARQ Redis Pool!")
    except Exception as e:
        from app.core.null_redis_cache import NullRedisCache
        app.state.redis = NullRedisCache()
        print(f"[ARQ] Khong ket noi duoc Redis ({e}) -> chay khong cache")
    yield
    # Teardown
    await app.state.redis.close()

app = FastAPI(
    title="IELTS Writing Grader API",
    description="Backend AI for IELTS Writing Evaluation",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

from app.api.api_router import api_router
from app.api.endpoints.student_practice.cache_control import clear_student_caches

_ADMIN_CONTENT_PATHS = ("/tests", "/test-sets", "/sections", "/question-groups", "/questions", "/ingest", "/core/band")


@app.middleware("http")
async def invalidate_student_caches(request, call_next):
    """Admin đổi đề, bộ đề hoặc bảng quy đổi thành công thì xoá cache phía Learner."""
    response = await call_next(request)
    path = request.url.path
    if (request.method in ("POST", "PUT", "PATCH", "DELETE") and response.status_code < 400
            and "/admin/" in path and any(p in path for p in _ADMIN_CONTENT_PATHS)):
        clear_student_caches()
    return response


app.include_router(api_router, prefix="/api/v1")
