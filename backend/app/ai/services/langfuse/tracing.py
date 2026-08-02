"""Tracing helpers — wrap function bằng @observe để tự động tạo trace."""

from langfuse import observe  # noqa: F401 — re-exported cho convenience

from .client import get_langfuse_client


def get_trace_id() -> str | None:
    """Lấy trace ID hiện tại. Phải gọi bên trong một hàm đã được @observe."""
    client = get_langfuse_client()
    return client.get_current_trace_id()


def score(trace_id: str, name: str, value: float, comment: str = "") -> None:
    """Gửi một điểm score lên một Langfuse trace."""
    client = get_langfuse_client()
    client.score(
        trace_id=trace_id,
        name=name,
        value=value,
        comment=comment or None,
    )
