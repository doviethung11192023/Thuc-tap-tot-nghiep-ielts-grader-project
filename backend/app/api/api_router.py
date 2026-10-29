from fastapi import APIRouter
from app.api.endpoints import essays, topics, users, admin, auth, expert
from app.api.endpoints.admin_content import (
    tests as admin_tests,
    sections as admin_sections,
    questions as admin_questions,
    media as admin_media,
    core as admin_core,
    ingest as admin_ingest
)
from app.api.endpoints.student_practice import student_practice_router

api_router = APIRouter()
api_router.include_router(essays.router, prefix="/essays", tags=["Essays"])
api_router.include_router(topics.router, prefix="/topics", tags=["Topics"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(admin.router, prefix="/admin", tags=["Admin"])
api_router.include_router(admin_tests.router, prefix="/admin", tags=["Admin Tests"])
api_router.include_router(admin_sections.router, prefix="/admin", tags=["Admin Sections"])
api_router.include_router(admin_questions.router, prefix="/admin", tags=["Admin Questions"])
api_router.include_router(admin_media.router, prefix="/admin", tags=["Admin Media"])
api_router.include_router(admin_core.router, prefix="/admin", tags=["Admin Core"])
api_router.include_router(admin_ingest.router, prefix="/admin", tags=["Admin Ingestion"])
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(expert.router, prefix="/expert", tags=["Expert"])
api_router.include_router(student_practice_router, tags=["Student Practice"])


