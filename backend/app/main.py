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
    # Setup ARQ Redis Pool
    app.state.redis = await create_pool(RedisSettings.from_dsn(settings.REDIS_URL))
    print("[ARQ] Cau hinh thanh cong ARQ Redis Pool!")
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

app.include_router(api_router, prefix="/api/v1")
