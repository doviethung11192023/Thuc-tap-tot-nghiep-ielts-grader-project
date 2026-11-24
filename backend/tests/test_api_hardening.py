"""Khoá các sửa về hiệu năng và bảo mật của Core API (đợt kiểm thử 2026-11-24).

- Handler `async def` không có `await` chạy thẳng trên event loop: lời gọi Supabase đồng bộ bên trong chặn mọi
  request khác (đo được 6 request song song bị xếp hàng 0,4 → 2,0 s). Handler như vậy phải là `def`.
- CORS chỉ nhận origin đã khai báo, không phản chiếu origin lạ.
- Lỗi chưa xử lý trả 500 gọn (không lộ chi tiết) và vẫn có header CORS; id sai định dạng trả 400.
"""
import ast
import pathlib

from fastapi.testclient import TestClient
from postgrest.exceptions import APIError

from app.main import app

API_DIR = pathlib.Path(__file__).resolve().parents[1] / "app" / "api"
ALLOWED_ORIGIN = "http://localhost:3000"


def _route_decorated(fn: ast.AsyncFunctionDef) -> bool:
    return any(isinstance(d, ast.Call) and getattr(d.func, "attr", "") in ("get", "post", "put", "patch", "delete")
               for d in fn.decorator_list)


def test_no_async_endpoint_without_await():
    offenders = []
    for f in API_DIR.rglob("*.py"):
        for node in ast.walk(ast.parse(f.read_text(encoding="utf-8"))):
            if isinstance(node, ast.AsyncFunctionDef) and _route_decorated(node):
                if not any(isinstance(x, (ast.Await, ast.AsyncFor, ast.AsyncWith)) for x in ast.walk(node)):
                    offenders.append(f"{f.relative_to(API_DIR)}:{node.lineno} {node.name}")
    assert offenders == [], "Đổi sang `def` để FastAPI chạy trong threadpool: " + ", ".join(offenders)


# Route chỉ dùng trong test, gắn một lần vào app để thử middleware bắt lỗi
@app.get("/__test__/boom")
def _boom():
    raise RuntimeError("secret internal detail")


@app.get("/__test__/bad-uuid")
def _bad_uuid():
    raise APIError({"message": 'invalid input syntax for type uuid: "x"', "code": "22P02", "hint": None, "details": None})


client = TestClient(app, raise_server_exceptions=False)  # không vào lifespan: không cần Redis


def test_cors_rejects_unknown_origin():
    r = client.options("/health", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"})
    assert r.headers.get("access-control-allow-origin") is None


def test_cors_allows_frontend_origin():
    r = client.options("/health", headers={"Origin": ALLOWED_ORIGIN, "Access-Control-Request-Method": "GET"})
    assert r.headers.get("access-control-allow-origin") == ALLOWED_ORIGIN


def test_unhandled_error_hides_detail_and_keeps_cors():
    r = client.get("/__test__/boom", headers={"Origin": ALLOWED_ORIGIN})
    assert r.status_code == 500
    assert "secret" not in r.text
    assert r.headers.get("access-control-allow-origin") == ALLOWED_ORIGIN


def test_malformed_id_is_400_not_500():
    r = client.get("/__test__/bad-uuid", headers={"Origin": ALLOWED_ORIGIN})
    assert r.status_code == 400
    assert r.headers.get("access-control-allow-origin") == ALLOWED_ORIGIN
