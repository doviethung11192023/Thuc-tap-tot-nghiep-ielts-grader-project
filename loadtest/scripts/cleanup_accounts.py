#!/usr/bin/env python3
"""
Xoá tài khoản test (email loadtest+<run>-<i>@...) cùng dữ liệu bài làm của chúng.

    LOADTEST_CONFIRM=yes backend/.venv/bin/python loadtest/scripts/cleanup_accounts.py [--run <mã>] [--dry-run] [--env-file backend/.env]

Cần thêm SUPABASE_DB_URL (Session pooler) và lệnh `psql`, vì DB chặn xoá qua API:
  - evaluation đã done/failed và điểm/ghi chú của nó không xoá được (trigger block_finished_evaluation_*, BR-08);
  - answers/essays của attempt đã nộp không xoá được (trigger block_closed_attempt_work).
Script mở MỘT transaction: tắt 5 trigger đó, xoá theo thứ tự khoá ngoại, bật lại trước khi COMMIT (lỗi giữa chừng thì
ROLLBACK, trigger vẫn nguyên). Thứ tự: evaluations (kéo theo grading_runs, criterion_scores, annotations) ->
review_requests -> attempts (kéo theo attempt_sections, answers, essays); sau đó xoá user Auth
(kéo theo profiles, learner_profiles, notifications). Đợi hàng đợi chấm trống trước khi chạy.
Chỉ đụng email khớp mẫu loadtest+<run>-<số>@; không có --run thì xoá mọi đợt.
"""
import argparse
import os
import re
import subprocess
import sys
from pathlib import Path

from supabase_admin import Supabase, add_env_file_arg, load_env_file, require_confirmation

TOKENS_FILE = Path(__file__).resolve().parents[1] / ".tokens.json"
UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")

# (bảng, trigger) cần tắt tạm trong transaction xoá
BLOCKING_TRIGGERS = [
    ("evaluations", "block_finished_evaluation_edit"),
    ("criterion_scores", "block_finished_evaluation_detail"),
    ("annotations", "block_finished_evaluation_detail"),
    ("answers", "block_closed_attempt_work"),
    ("essays", "block_closed_attempt_work"),
]


def build_sql(user_ids: list[str]) -> str:
    """SQL một transaction; id đã kiểm đúng dạng UUID nên nhúng thẳng vào chuỗi là an toàn."""
    ids = ", ".join(f"'{i}'" for i in user_ids)
    alter = lambda action: "\n".join(f"ALTER TABLE public.{t} {action} TRIGGER {g};" for t, g in BLOCKING_TRIGGERS)
    return f"""BEGIN;
{alter('DISABLE')}
CREATE TEMP TABLE _lt_attempts ON COMMIT DROP AS SELECT id FROM public.attempts WHERE learner_id IN ({ids});
DELETE FROM public.evaluations WHERE attempt_id IN (SELECT id FROM _lt_attempts);
DELETE FROM public.review_requests WHERE attempt_id IN (SELECT id FROM _lt_attempts);
DELETE FROM public.attempts WHERE id IN (SELECT id FROM _lt_attempts);
{alter('ENABLE')}
SELECT count(*) AS attempts_deleted FROM _lt_attempts;
COMMIT;
"""


def delete_attempt_data(user_ids: list[str]) -> None:
    db_url = os.getenv("SUPABASE_DB_URL")
    if not db_url:
        sys.exit("Thiếu SUPABASE_DB_URL (Session pooler) để xoá bài làm; xem supabase/README.md")
    if not all(UUID.match(i) for i in user_ids):
        sys.exit("User id không đúng dạng UUID, dừng")
    result = subprocess.run(["psql", db_url, "-v", "ON_ERROR_STOP=1", "-qAt"], input=build_sql(user_ids),
                            text=True, capture_output=True)
    if result.returncode != 0:
        sys.exit(f"psql lỗi (transaction đã rollback): {result.stderr.strip()[:500]}")
    print(f"  đã xoá {result.stdout.strip() or '?'} attempt và dữ liệu chấm đi kèm")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--run", default=None, help="chỉ xoá đợt này")
    parser.add_argument("--dry-run", action="store_true", help="chỉ liệt kê, không xoá")
    add_env_file_arg(parser)
    args = parser.parse_args()
    load_env_file(args.env_file)
    require_confirmation()

    client = Supabase()
    try:
        users = client.list_loadtest_users(args.run)
        ids = [u["id"] for u in users]
        print(f"Tìm thấy {len(users)} tài khoản loadtest{f' (run={args.run})' if args.run else ''} trên {client.url}")
        if args.dry_run or not ids:
            for user in users:
                print(f"  {user['email']}")
            return

        delete_attempt_data(ids)
        failed = 0
        for user in users:
            response = client.delete_user(user["id"])
            if response.status_code not in (200, 204):
                failed += 1
                print(f"  xoá {user['email']} lỗi: HTTP {response.status_code} {response.text[:300]}", file=sys.stderr)
        left = client.list_loadtest_users(args.run)
        print(f"Còn lại sau khi xoá: {len(left)} tài khoản loadtest")
        if left or failed:
            sys.exit(1)
        if TOKENS_FILE.exists():
            os.remove(TOKENS_FILE)           # token trỏ tới user đã xoá, vô dụng và không nên nằm lại
            print("  đã xoá loadtest/.tokens.json")
    finally:
        client.close()


if __name__ == "__main__":
    main()
