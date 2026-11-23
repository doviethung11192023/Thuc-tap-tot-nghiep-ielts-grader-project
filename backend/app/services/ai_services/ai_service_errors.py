"""Lỗi nghiệp vụ của quản lý Service AI: main.py đổi thành response {"detail": ...} theo status_code."""
from app.core.domain_errors import DomainError


class UnprocessableError(DomainError):
    """Dữ liệu sai khoảng giá trị hoặc gọi thử thất bại (422)."""
    status_code = 422


class BadGatewayError(DomainError):
    """Không kết nối được AI engine hoặc Langfuse (502)."""
    status_code = 502
