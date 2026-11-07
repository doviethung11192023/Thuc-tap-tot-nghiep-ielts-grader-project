from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from arq import create_pool
from arq.connections import RedisSettings
from app.core.config import settings
from app.core.domain_errors import DomainError

import sys

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

@asynccontextmanager
async def lifespan(app: FastAPI):
    # ARQ Redis Pool: hàng đợi chấm và cache. Redis sập thì API vẫn chạy, nhưng bài nộp chờ tới khi Redis và worker hoạt động
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


@app.exception_handler(DomainError)
async def domain_error_handler(request: Request, exc: DomainError) -> JSONResponse:
    """Lỗi nghiệp vụ của service → response cùng dạng HTTPException."""
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


app.include_router(api_router, prefix="/api/v1")
