-- =====================================================================
-- Test migration 20261124120000: anon và authenticated không ghi được bảng nào trong public,
-- notifications không còn policy UPDATE, Learner không sửa được action_url qua REST.
-- Chạy trong 1 transaction rồi ROLLBACK: không để lại dữ liệu.
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/read_only_rls_test.sql
-- =====================================================================
BEGIN;

CREATE FUNCTION pg_temp.check(label text, ok boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF ok IS NOT TRUE THEN RAISE EXCEPTION 'FAIL  %', label; END IF;
  RAISE NOTICE 'PASS  %', label;
END $$;

-- 1. Không bảng nào trong public cấp quyền ghi cho anon/authenticated
SELECT pg_temp.check('không bảng public nào cho anon/authenticated ghi',
  NOT EXISTS (SELECT 1 FROM information_schema.role_table_grants
              WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated')
                AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')));

-- 2. anon không còn quyền gì trên bảng public
SELECT pg_temp.check('anon không có quyền trên bảng public',
  NOT EXISTS (SELECT 1 FROM information_schema.role_table_grants
              WHERE table_schema = 'public' AND grantee = 'anon'));

-- 3. notifications chỉ còn policy đọc
SELECT pg_temp.check('notifications không còn policy ghi',
  NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications'
              AND cmd IN ('UPDATE', 'INSERT', 'DELETE', 'ALL')));
SELECT pg_temp.check('notifications vẫn còn policy đọc của chính mình',
  EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' AND cmd = 'SELECT'));

-- 4. Bảng mới tạo sau migration này cũng không tự có quyền ghi (quyền mặc định đã đổi)
CREATE TABLE public.__read_only_probe (id int);
SELECT pg_temp.check('bảng mới không tự cấp quyền ghi cho authenticated',
  NOT has_table_privilege('authenticated', 'public.__read_only_probe', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.__read_only_probe', 'UPDATE')
  AND NOT has_table_privilege('anon', 'public.__read_only_probe', 'SELECT'));

-- 5. Learner thật sửa action_url thông báo của mình qua REST: bị từ chối
DO $$
DECLARE uid uuid; nid uuid;
BEGIN
  SELECT user_id INTO uid FROM public.notifications LIMIT 1;
  IF uid IS NULL THEN
    RAISE NOTICE 'SKIP  learner sửa action_url (chưa có thông báo nào)';
    RETURN;
  END IF;
  SELECT id INTO nid FROM public.notifications WHERE user_id = uid LIMIT 1;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    UPDATE public.notifications SET action_url = '//evil.example' WHERE id = nid;
    RAISE EXCEPTION 'FAIL  learner sửa được action_url của mình';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS  learner sửa action_url bị từ chối (%)', SQLERRM;
  END;
  RESET ROLE;
END $$;

ROLLBACK;
