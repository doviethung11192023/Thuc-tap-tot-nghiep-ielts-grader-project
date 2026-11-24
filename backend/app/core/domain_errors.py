"""
Lỗi nghiệp vụ của tầng service.

Service không biết HTTP: nó có thể chạy trong request, trong ARQ worker hoặc script. Tầng API đổi các
lỗi này thành response qua handler đăng ký ở app.main, với cùng dạng {"detail": ...} như HTTPException.
"""
from typing import Any


class DomainError(Exception):
    status_code = 400

    def __init__(self, detail: str, status_code: int | None = None, extra: dict[str, Any] | None = None):
        super().__init__(detail)
        self.detail = detail
        self.extra = extra
        if status_code is not None:
            self.status_code = status_code


class InvalidRequestError(DomainError):
    status_code = 400


class AuthenticationRequiredError(DomainError):
    status_code = 401


class ForbiddenError(DomainError):
    status_code = 403


class NotFoundError(DomainError):
    status_code = 404


class ConflictError(DomainError):
    status_code = 409


class InternalFailureError(DomainError):
    status_code = 500


class ServiceUnavailableError(DomainError):
    status_code = 503
