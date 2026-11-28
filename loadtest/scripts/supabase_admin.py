"""
Phần dùng chung của seed_accounts.py và cleanup_accounts.py: đọc cấu hình từ biến môi trường,
cổng an toàn LOADTEST_CONFIRM, gọi Supabase Auth Admin API có backoff khi bị giới hạn tốc độ.

Không script nào in hoặc ghi key ra file. Khoá chỉ đọc từ biến môi trường lúc chạy
(có thể nạp từ file bằng --env-file, ví dụ backend/.env, nhưng file đó không được đọc/in ở nơi khác).
"""
import argparse
import os
import re
import sys
import time
from typing import Any, Optional

import httpx

EMAIL_PREFIX = "loadtest+"
# Chỉ email đúng mẫu loadtest+<run>-<số>@... mới bị cleanup đụng tới
EMAIL_PATTERN = re.compile(r"^loadtest\+([a-z0-9]+)-(\d+)@", re.IGNORECASE)
MAX_RETRIES = 6


def require_confirmation() -> None:
    """Hai script này ghi/xoá dữ liệu trên Supabase thật: bắt buộc bật tường minh."""
    if os.getenv("LOADTEST_CONFIRM") != "yes":
        sys.exit("Từ chối chạy: đặt LOADTEST_CONFIRM=yes để xác nhận bạn đang thao tác trên project Supabase đã chọn "
                 f"({os.getenv('SUPABASE_URL', 'SUPABASE_URL chưa đặt')}).")


def add_env_file_arg(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--env-file", help="nạp biến môi trường từ file này trước khi chạy (không in nội dung)")


def load_env_file(path: Optional[str]) -> None:
    if not path:
        return
    from dotenv import load_dotenv
    load_dotenv(path, override=False)


def _env(*names: str) -> str:
    for name in names:
        if os.getenv(name):
            return os.environ[name]
    sys.exit(f"Thiếu biến môi trường: {' hoặc '.join(names)}")


class Supabase:
    """Client mỏng: Auth Admin (service key), đăng nhập mật khẩu (anon key nếu có), PostgREST (service key)."""

    def __init__(self) -> None:
        self.url = _env("SUPABASE_URL").rstrip("/")
        # apikey (gateway) là anon key; quyền admin nằm ở Bearer: service_role key, hoặc JWT service_role tự ký từ
        # SUPABASE_JWT_SECRET giống cách Core làm (backend/app/db/supabase.py) khi .env chỉ có anon key.
        self.anon_key = os.getenv("SUPABASE_ANON_KEY") or _env("SUPABASE_KEY")
        self.service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or self._mint_service_jwt()
        self.http = httpx.Client(timeout=30.0)

    def _mint_service_jwt(self) -> str:
        secret = _env("SUPABASE_JWT_SECRET").strip()
        import jwt
        now = int(time.time())
        return jwt.encode({"iss": "supabase", "role": "service_role", "iat": now, "exp": now + 3600},
                          secret, algorithm="HS256")

    def close(self) -> None:
        self.http.close()

    def _headers(self, key: str) -> dict[str, str]:
        """key là Bearer; apikey luôn là anon key (gateway từ chối service JWT tự ký làm apikey)."""
        return {"apikey": self.anon_key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}

    def request(self, method: str, path: str, *, key: Optional[str] = None, **kwargs: Any) -> httpx.Response:
        """Thử lại khi 429/5xx hoặc lỗi mạng, chờ tăng dần (tôn trọng Retry-After)."""
        headers = {**self._headers(key or self.service_key), **kwargs.pop("headers", {})}
        for attempt in range(MAX_RETRIES):
            try:
                response = self.http.request(method, f"{self.url}{path}", headers=headers, **kwargs)
            except httpx.TransportError as exc:
                wait, response = 2 ** attempt, None
                print(f"  lỗi mạng ({type(exc).__name__}), chờ {wait}s", file=sys.stderr)
            else:
                if response.status_code != 429 and response.status_code < 500:
                    return response
                retry_after = response.headers.get("retry-after")
                wait = float(retry_after) if retry_after and retry_after.isdigit() else 2 ** attempt * 2
                print(f"  HTTP {response.status_code}, chờ {wait:.0f}s rồi thử lại", file=sys.stderr)
            time.sleep(wait)
        if response is not None:
            return response
        raise RuntimeError(f"{method} {path}: hết lượt thử")

    # --- Auth ---
    def create_user(self, email: str, password: str, full_name: str) -> httpx.Response:
        return self.request("POST", "/auth/v1/admin/users", json={
            "email": email, "password": password, "email_confirm": True,
            "user_metadata": {"full_name": full_name}})

    def sign_in(self, email: str, password: str) -> httpx.Response:
        return self.request("POST", "/auth/v1/token?grant_type=password", key=self.anon_key,
                            json={"email": email, "password": password})

    def delete_user(self, user_id: str) -> httpx.Response:
        return self.request("DELETE", f"/auth/v1/admin/users/{user_id}")

    def list_loadtest_users(self, run: Optional[str] = None) -> list[dict[str, Any]]:
        """Duyệt mọi trang user, giữ lại email đúng mẫu loadtest+<run>-<i>@ (và đúng run nếu chỉ định)."""
        found, page = [], 1
        while True:
            response = self.request("GET", f"/auth/v1/admin/users?page={page}&per_page=200")
            if response.status_code != 200:
                sys.exit(f"Không liệt kê được user: HTTP {response.status_code} {response.text[:200]}")
            users = response.json().get("users") or []
            for user in users:
                match = EMAIL_PATTERN.match(user.get("email") or "")
                if match and (run is None or match.group(1).lower() == run.lower()):
                    found.append(user)
            if len(users) < 200:
                return found
            page += 1
