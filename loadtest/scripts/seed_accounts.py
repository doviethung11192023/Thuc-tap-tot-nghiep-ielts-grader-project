#!/usr/bin/env python3
"""
Tạo N tài khoản Learner test trên Supabase, đăng nhập sẵn và ghi token vào loadtest/.tokens.json.

    LOADTEST_CONFIRM=yes backend/.venv/bin/python loadtest/scripts/seed_accounts.py --count 5 [--env-file backend/.env]

Biến môi trường (seed): SUPABASE_URL, SUPABASE_KEY (anon) và SUPABASE_JWT_SECRET (hoặc SUPABASE_SERVICE_ROLE_KEY thay cho secret),
LOADTEST_EMAIL_DOMAIN (mặc định example.com). Mật khẩu ngẫu nhiên, chỉ giữ trong bộ nhớ, không ghi ra file.
Email: loadtest+<run>-<i>@<domain>; trigger của DB tự tạo profiles + learner_profiles (role learner).
"""
import argparse
import json
import os
import secrets
import string
import sys
import time
from pathlib import Path

from supabase_admin import Supabase, add_env_file_arg, load_env_file, require_confirmation

DEFAULT_OUT = Path(__file__).resolve().parents[1] / ".tokens.json"


def new_run_id() -> str:
    return time.strftime("%m%d%H%M") + secrets.choice(string.ascii_lowercase)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--count", type=int, required=True, help="số tài khoản cần tạo")
    parser.add_argument("--run", default=None, help="mã đợt (chữ thường/số) nằm trong email; mặc định theo giờ")
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    parser.add_argument("--batch", type=int, default=10, help="số tài khoản mỗi lô trước khi nghỉ")
    parser.add_argument("--pause", type=float, default=2.0, help="giây nghỉ giữa các lô (tránh giới hạn tốc độ Auth)")
    add_env_file_arg(parser)
    args = parser.parse_args()
    load_env_file(args.env_file)
    require_confirmation()
    if args.count < 1:
        sys.exit("--count phải >= 1")

    run = (args.run or new_run_id()).lower()
    domain = os.getenv("LOADTEST_EMAIL_DOMAIN", "example.com")
    client = Supabase()
    out_path = Path(args.out)
    users: list[dict] = []
    failures = 0
    print(f"Tạo {args.count} tài khoản run={run} trên {client.url}")
    try:
        for i in range(1, args.count + 1):
            email = f"loadtest+{run}-{i}@{domain}"
            password = secrets.token_urlsafe(24)
            created = client.create_user(email, password, f"Load Test {run}-{i}")
            if created.status_code not in (200, 201):
                failures += 1
                print(f"  [{i}] tạo lỗi: HTTP {created.status_code} {created.text[:200]}", file=sys.stderr)
                continue
            session = client.sign_in(email, password)
            if session.status_code != 200:
                failures += 1
                print(f"  [{i}] đăng nhập lỗi: HTTP {session.status_code} {session.text[:200]}", file=sys.stderr)
                continue
            body = session.json()
            users.append({"email": email, "user_id": created.json().get("id"),
                          "access_token": body["access_token"], "expires_at": body.get("expires_at")})
            if i % args.batch == 0 and i < args.count:
                time.sleep(args.pause)       # nghỉ giữa các lô: Auth giới hạn số lần đăng nhập/tạo user theo IP
    finally:
        # Ghi cả khi dừng giữa chừng để cleanup còn biết đã tạo gì (cleanup cũng quét theo email)
        out_path.write_text(json.dumps({"run": run, "created_at": int(time.time()), "users": users}, indent=1))
        os.chmod(out_path, 0o600)
        client.close()
    print(f"Xong: {len(users)}/{args.count} tài khoản, token ở {out_path} (quyền 600). Lỗi: {failures}")
    if failures:
        sys.exit(1)


if __name__ == "__main__":
    main()
