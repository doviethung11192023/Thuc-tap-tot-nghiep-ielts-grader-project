"""Dựng envelope phản hồi thành công của Core API: {"meta": {...}, "data": ...}.

Một chỗ duy nhất định nghĩa dạng envelope để đổi một lần là đủ, và để route không còn tự viết dict.
Frontend đọc `meta.code`, `meta.message`, `meta.cached` và `data`; khoá nào không có thì KHÔNG được thêm
(vd. response xoá không có `data`, response không cache không có `cached`), nên hàm chỉ ghi khoá được truyền vào.
"""
from typing import Any

# Phân biệt "không truyền data" (response không có khoá data) với data=None (có khoá, giá trị null)
_MISSING: Any = object()


def ok(data: Any = _MISSING, *, message: str | None = None, code: int = 200, cached: bool = False, **meta: Any) -> dict[str, Any]:
    """Envelope thành công. `message`, `cached` và các meta khác chỉ xuất hiện khi được truyền."""
    meta_body: dict[str, Any] = {"code": code}
    if message is not None:
        meta_body["message"] = message
    if cached:
        meta_body["cached"] = True   # chỉ có khoá này khi dữ liệu lấy từ cache; không cache thì không có khoá
    meta_body.update(meta)
    body: dict[str, Any] = {"meta": meta_body}
    if data is not _MISSING:
        body["data"] = data
    return body


def created(data: Any = _MISSING, *, message: str | None = None, **meta: Any) -> dict[str, Any]:
    """Envelope cho response 201 (tạo mới)."""
    return ok(data, message=message, code=201, **meta)
