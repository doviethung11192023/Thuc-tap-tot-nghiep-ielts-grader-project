from fastapi import APIRouter
from app.api.endpoints.student_practice.catalog import router as catalog_router
from app.api.endpoints.student_practice.attempts import router as attempts_router
from app.api.endpoints.student_practice.grading import router as grading_router
from app.api.endpoints.student_practice.submissions_ai import router as submissions_ai_router
from app.api.endpoints.student_practice.results import router as results_router
from app.api.endpoints.student_practice.analytics import router as analytics_router

student_practice_router = APIRouter()

student_practice_router.include_router(catalog_router, prefix="/test-practice", tags=["Student Practice Catalog"])
student_practice_router.include_router(attempts_router, prefix="/test-practice", tags=["Student Exam Attempts"])
student_practice_router.include_router(grading_router, prefix="/test-practice", tags=["Student Auto Grading"])
student_practice_router.include_router(submissions_ai_router, prefix="/test-practice", tags=["Student AI Submissions"])
student_practice_router.include_router(results_router, prefix="/test-practice", tags=["Student Exam Results"])
student_practice_router.include_router(analytics_router, prefix="/student", tags=["Student Analytics"])
