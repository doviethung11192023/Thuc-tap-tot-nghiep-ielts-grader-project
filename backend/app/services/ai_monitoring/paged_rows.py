"""Đọc hết các dòng của một truy vấn PostgREST (mỗi lần tối đa 1000 dòng)."""
from typing import Any, Callable

PAGE_SIZE = 1000


def fetch_all(build_query: Callable[[], Any]) -> list[dict[str, Any]]:
    """build_query() trả query mới mỗi lần gọi (đã có select + lọc, chưa execute/range)."""
    rows: list[dict[str, Any]] = []
    offset = 0
    while True:
        page = build_query().range(offset, offset + PAGE_SIZE - 1).execute().data or []
        rows += page
        if len(page) < PAGE_SIZE:
            return rows
        offset += PAGE_SIZE


def chunks(items: list[Any], size: int = 100) -> list[list[Any]]:
    """Chia danh sách id để mỗi lệnh `in` không làm URL quá dài."""
    return [items[i:i + size] for i in range(0, len(items), size)]
