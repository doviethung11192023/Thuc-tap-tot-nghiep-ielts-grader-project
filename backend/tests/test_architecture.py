"""Test kiến trúc: chặn tái phát các lỗi cấu trúc đã dọn ở đợt tái cấu trúc Core.

Vì sao cần: các quy ước này nằm trong docs/codebase-summary.md nhưng không có gì ép buộc; sau vài lần
nhóm thêm code là file rời, truy vấn DB trong route và print quay lại. Ba kiểm tra dưới đây chạy trong CI
như test thường và báo đúng file vi phạm.

1. Gốc `app/api/endpoints/` và `app/services/` chỉ chứa package (thư mục), không file .py lẻ,
   để người mới tìm code theo domain thay vì lục một thư mục phẳng.
2. Tầng `app/api/` (route) không gọi `db(` và không import `app.db.supabase` / `supabase`:
   truy vấn và luật nghiệp vụ nằm ở `app/services/<domain>/` (Service Layer), route chỉ nhận request,
   gọi service, dựng response.
3. Không `print(` trong `app/`: dùng `logger = logging.getLogger(__name__)`, vì print không có mức,
   thời gian, tên module và không lọc được trên môi trường chạy thật. Kiểm bằng AST nên chuỗi và
   comment chứa chữ "print(" không bị tính nhầm.
"""
import ast
from pathlib import Path

APP_DIR = Path(__file__).resolve().parents[1] / "app"
API_DIR = APP_DIR / "api"
ENDPOINTS_DIR = API_DIR / "endpoints"
SERVICES_DIR = APP_DIR / "services"


def _py_files(directory: Path):
    return sorted(p for p in directory.rglob("*.py") if "__pycache__" not in p.parts)


def _rel(path: Path) -> str:
    return str(path.relative_to(APP_DIR.parent))


def test_no_loose_python_files_at_endpoints_and_services_root():
    loose = [
        _rel(p)
        for root in (ENDPOINTS_DIR, SERVICES_DIR)
        for p in root.glob("*.py")
        if p.name != "__init__.py"
    ]
    assert not loose, f"File .py rời ở gốc, hãy đưa vào package theo domain: {loose}"


def test_api_layer_does_not_query_database_directly():
    violations = []
    for path in _py_files(API_DIR):
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "db":
                violations.append(f"{_rel(path)}:{node.lineno} gọi db()")
            elif isinstance(node, ast.ImportFrom) and node.module and (
                node.module == "supabase" or node.module.startswith(("app.db.supabase", "supabase."))
            ):
                violations.append(f"{_rel(path)}:{node.lineno} import {node.module}")
            elif isinstance(node, ast.Import):
                for alias in node.names:
                    if alias.name == "supabase" or alias.name.startswith(("app.db.supabase", "supabase.")):
                        violations.append(f"{_rel(path)}:{node.lineno} import {alias.name}")
    assert not violations, "Route phải gọi service thay vì truy vấn DB: " + "; ".join(violations)


def test_no_print_calls_in_app():
    violations = []
    for path in _py_files(APP_DIR):
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "print":
                violations.append(f"{_rel(path)}:{node.lineno}")
    assert not violations, "Dùng logger thay cho print: " + ", ".join(violations)
