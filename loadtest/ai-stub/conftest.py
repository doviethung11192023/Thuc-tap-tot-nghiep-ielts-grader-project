"""Cho test của stub import được code thật của backend (không cần .env: đặt giá trị giả cho cấu hình bắt buộc)."""
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
for path in (str(ROOT / "backend"), str(Path(__file__).parent)):
    if path not in sys.path:
        sys.path.insert(0, path)

for key, value in {"SUPABASE_URL": "http://localhost:54321", "SUPABASE_KEY": "dummy",
                   "SUPABASE_JWT_SECRET": "dummy"}.items():
    os.environ.setdefault(key, value)
os.environ["STUB_DELAY_SECONDS"] = "0"
