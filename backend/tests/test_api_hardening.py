"""Khoá các sửa về hiệu năng của Core API (đợt kiểm thử 2026-11-24).

- Handler `async def` không có `await` chạy thẳng trên event loop: lời gọi Supabase đồng bộ bên trong chặn mọi
  request khác (đo được 6 request song song bị xếp hàng 0,4 → 2,0 s). Handler như vậy phải là `def`.
"""
import ast
import pathlib


API_DIR = pathlib.Path(__file__).resolve().parents[1] / "app" / "api"


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
