"""Khoá cấu trúc thư mục của AI engine để không bị lệch dần.

Vì sao cần: sau lần tái cấu trúc, `services/` chỉ chứa package theo miền (tutor, writing, llm...) và
code chạy server phải ghi log qua `logger`, không dùng `print`. Các kiểm tra này chạy bằng AST/hệ thống
file nên không phụ thuộc model hay mạng.
"""
import ast
from pathlib import Path

from settings.config import ROOT, get_settings

SERVER_PATHS = [ROOT / "services", ROOT / "api", ROOT / "main.py"]


def _server_python_files():
    for base in SERVER_PATHS:
        yield from ([base] if base.is_file() else sorted(base.rglob("*.py")))


def test_services_root_chi_con_package():
    """Gốc services/ không được có file .py rời (ngoài __init__.py); module phải nằm trong package miền."""
    loose = [p.name for p in (ROOT / "services").glob("*.py") if p.name != "__init__.py"]
    assert not loose, f"File .py rời ở gốc services/: {loose}"


def test_khong_dung_print_trong_code_server():
    """services/, api/, main.py ghi log bằng logger; `print(` làm mất mức log và trace id."""
    offenders = []
    for path in _server_python_files():
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "print":
                offenders.append(f"{path.relative_to(ROOT)}:{node.lineno}")
    assert not offenders, f"print() còn trong code server: {offenders}"


def test_duong_dan_du_lieu_tro_dung_goc_ai_engine():
    """ROOT (settings/config.py) phải là thư mục ai-engine: reference corpus và .env tính từ đây."""
    assert (ROOT / "main.py").is_file() and (ROOT / "services").is_dir()
    assert Path(get_settings().reference_corpus_dir) == ROOT / "data" / "reference_corpus"
