-- =====================================================================
-- RLS chỉ đọc cho các bảng tạo sau baseline (ADR-10: mọi thao tác ghi đi qua Core API).
--
-- 1. notifications có policy "Users can update own notifications": user sửa được MỌI cột hàng của mình qua
--    REST (kể cả action_url, đích điều hướng khi bấm thông báo). Frontend không dùng tới: đánh dấu đã đọc
--    đi qua Core (PATCH /notifications/{id}/read, POST /notifications/read-all) bằng service_role.
--    Trên project hiện tại policy này không dùng được vì authenticated không có quyền UPDATE trên bảng,
--    nhưng nó mâu thuẫn với thiết kế và sẽ mở ra ngay khi ai đó cấp lại quyền.
-- 2. Baseline thu quyền ghi của anon/authenticated trên các bảng có lúc đó. Bảng tạo sau (notifications,
--    writing_task_materials) chỉ an toàn vì project hiện tại đã đổi quyền mặc định của role postgres
--    (authenticated chỉ SELECT, anon không có gì; kiểm 2026-11-24 qua pg_default_acl). Thiết lập đó làm ngoài
--    repo, nên môi trường dựng mới từ migration sẽ cấp ALL cho anon/authenticated. Ghi lại vào đây.
-- Chạy: psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f <file này>
-- Test: supabase/tests/read_only_rls_test.sql
-- =====================================================================

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM authenticated;

-- Bảng do role postgres tạo sau này (migration chạy bằng role này) không còn tự cấp quyền ghi
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM authenticated;
