from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from arq import create_pool
from arq.connections import RedisSettings
from app.core.config import settings
from app.core.domain_errors import DomainError
from postgrest.exceptions import APIError

import logging
import sys

logger = logging.getLogger("app.main")

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

_docs = settings.ENABLE_API_DOCS
app = FastAPI(
    title="IELTS Writing Grader API",
    description="Backend AI for IELTS Writing Evaluation",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if _docs else None,
    redoc_url="/redoc" if _docs else None,
    openapi_url="/openapi.json" if _docs else None,
)


@app.middleware("http")
async def catch_unhandled_errors(request: Request, call_next):
    """Lỗi không lường trước → 500 gọn, không lộ chi tiết nội bộ (traceback chỉ ghi log).
    Đăng ký TRƯỚC CORSMiddleware nên nằm bên trong nó: response 500 vẫn có header CORS,
    trình duyệt đọc được thông báo thay vì báo "Failed to fetch"."""
    try:
        return await call_next(request)
    except APIError as exc:
        if exc.code == "22P02":  # Postgres: sai định dạng (vd. id không phải UUID) → lỗi của người gọi
            return JSONResponse(status_code=400, content={"detail": "Tham số không hợp lệ"})
        logger.exception("Lỗi Supabase chưa xử lý ở %s %s", request.method, request.url.path)
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})
    except Exception:
        logger.exception("Lỗi chưa xử lý ở %s %s", request.method, request.url.path)
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# CORS: chỉ origin frontend đã khai báo. Không dùng "*" kèm allow_credentials (Starlette sẽ phản chiếu mọi origin)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
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
