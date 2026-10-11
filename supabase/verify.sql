-- =====================================================================
-- KIỂM TRA SAU KHI CHẠY MIGRATION
-- Dán vào SQL Editor của Supabase. Mỗi truy vấn ghi kết quả mong đợi.
-- =====================================================================

-- 1. Số bảng trong schema public. Mong đợi: 29
SELECT count(*) AS so_bang
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- 2. Bảng chưa bật RLS. Mong đợi: không có dòng nào
SELECT c.relname AS bang_chua_bat_rls
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity;

-- 3. Policy. Mong đợi đúng 4 dòng, đều là SELECT cho authenticated:
--    essays_read_own, reviews_read_assigned, attempts_read_own, users_read_own
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;

-- 4. Trigger tạo hồ sơ. Mong đợi: 1 dòng on_auth_user_created
SELECT tgname
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass AND tgname = 'on_auth_user_created';

-- 5. Tài khoản đăng nhập được nhưng chưa có hồ sơ. Mong đợi: không có dòng nào
SELECT au.id, au.email
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL;

-- 6. Giá trị enum user_role. Mong đợi: student, admin, expert
SELECT e.enumlabel
FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
WHERE t.typname = 'user_role'
ORDER BY e.enumsortorder;

-- 7. Hàm giao dịch và quyền gọi. Mong đợi: 4 hàm; anon và authenticated
--    đều là false, service_role là true
SELECT p.proname,
       has_function_privilege('anon',          p.oid, 'EXECUTE') AS anon_goi_duoc,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_goi_duoc,
       has_function_privilege('service_role',  p.oid, 'EXECUTE') AS service_role_goi_duoc
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('create_review_request', 'submit_attempt', 'save_answers', 'assign_pending_reviews')
ORDER BY p.proname;

-- 8. Quyền ghi của authenticated trên bảng users. Mong đợi: tất cả false
SELECT has_table_privilege('authenticated', 'public.users', 'INSERT') AS insert_users,
       has_table_privilege('authenticated', 'public.users', 'UPDATE') AS update_users,
       has_table_privilege('anon',          'public.users', 'SELECT') AS anon_select_users;

-- 9. Bảng bật Realtime. Mong đợi có: essays, test_attempts, review_requests
SELECT tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
ORDER BY tablename;

-- 10. Dữ liệu nền. Mong đợi: 6 dòng system_settings, 34 dòng band_conversions
SELECT (SELECT count(*) FROM public.system_settings)  AS system_settings,
       (SELECT count(*) FROM public.band_conversions) AS band_conversions;
