# Supabase — schema cơ sở dữ liệu

Một schema duy nhất (`public`) theo thiết kế 33 bảng trong [`docs/source-of-truth.md`](../docs/source-of-truth.md) §7.

| File | Dùng để |
|---|---|
| `migrations/20261103130000_baseline_schema.sql` | Dựng toàn bộ schema cho môi trường **mới**: 33 bảng + 3 view, 16 ràng buộc, trigger, RLS chỉ đọc, seed bảng quy đổi band, Realtime, các bảng ngoài sơ đồ đã ghi trong source-of-truth |
| `tests/schema_constraints_test.sql` | 48 ca test ràng buộc (C1–C16, BR, RLS, NFR-11); chạy trong transaction rồi ROLLBACK, không để lại dữ liệu |

```bash
# môi trường mới (project Supabase trống)
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f supabase/migrations/20261103130000_baseline_schema.sql
# kiểm tra ràng buộc (an toàn trên DB thật)
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/schema_constraints_test.sql
```

`SUPABASE_DB_URL` nằm trong `backend/.env` (Dashboard → Connect → Session pooler; mật khẩu DB tự điền).

**Project hiện tại** đã ở schema này từ 2026-11-03 (cutover) — không chạy lại baseline. Dữ liệu cũ còn nằm trong schema `legacy` làm bản sao lưu cho tới khi nhóm xác nhận xoá (`DROP SCHEMA legacy CASCADE`).

Thay đổi schema: viết file migration mới có số thứ tự lớn hơn, chạy bằng `psql -1`, cập nhật source-of-truth §7 cùng commit.
