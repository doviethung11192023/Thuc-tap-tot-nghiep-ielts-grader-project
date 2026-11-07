"""Lỗi nghiệp vụ của service ra response cùng dạng HTTPException, và admin route xoá cache khi thành công."""
from fastapi import APIRouter, FastAPI
from fastapi.testclient import TestClient

from app.core.domain_errors import ConflictError, DomainError, NotFoundError
from app.core.student_content_cache import StudentContentMutationRoute
from app.main import domain_error_handler


class CountingRedis:
    def __init__(self):
        self.incremented = 0

    async def incr(self, key):
        self.incremented += 1


def _client():
    app = FastAPI()
    app.add_exception_handler(DomainError, domain_error_handler)
    app.state.redis = CountingRedis()
    router = APIRouter(route_class=StudentContentMutationRoute)

    @router.post("/ok")
    async def ok():
        return {"done": True}

    @router.get("/read")
    async def read():
        return {"done": True}

    @router.post("/conflict")
    async def conflict():
        raise ConflictError("Bài thi đã được nộp trước đó")

    @router.get("/missing")
    async def missing():
        raise NotFoundError("Không thấy")

    app.include_router(router, prefix="/admin")
    return TestClient(app), app


def test_domain_error_becomes_response_with_detail():
    client, _ = _client()
    response = client.post("/admin/conflict")
    assert response.status_code == 409 and response.json() == {"detail": "Bài thi đã được nộp trước đó"}
    assert client.get("/admin/missing").status_code == 404


def test_only_successful_mutations_invalidate_student_cache():
    client, app = _client()
    client.get("/admin/read")
    client.post("/admin/conflict")
    assert app.state.redis.incremented == 0
    client.post("/admin/ok")
    assert app.state.redis.incremented == 1
