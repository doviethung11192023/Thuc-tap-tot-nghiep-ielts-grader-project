from fastapi import APIRouter
from app.api.endpoints import essays, topics, users, admin

api_router = APIRouter()
api_router.include_router(essays.router, prefix="/essays", tags=["Essays"])
api_router.include_router(topics.router, prefix="/topics", tags=["Topics"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
