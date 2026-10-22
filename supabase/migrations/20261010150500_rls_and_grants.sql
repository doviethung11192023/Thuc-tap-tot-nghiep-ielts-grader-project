-- =====================================================================
-- 20261010150500 — Row Level Security, quyền bảng và Realtime
-- ---------------------------------------------------------------------
-- Sửa lỗ hổng hiện tại: RLS đang tắt nên bất kỳ ai có anon key (đang nằm
-- trong frontend) đều đọc và ghi được mọi bảng, kể cả tự đổi role thành
-- admin trong bảng users.
--
-- Sau file này:
--   * Backend dùng SERVICE ROLE KEY: không bị ảnh hưởng (service role bỏ qua RLS).
--     Nếu SUPABASE_KEY của backend đang là anon key, mọi truy vấn của backend
--     sẽ trả rỗng; phải đổi sang service role key TRƯỚC khi chạy file này.
--   * Frontend (anon key + JWT người dùng) chỉ còn ĐỌC được dòng của chính
--     mình trên 4 bảng, và không GHI được bảng nào. Các lệnh insert/update
--     bảng users ở trang register, login, auth/callback, profile sẽ báo lỗi
--     quyền; hồ sơ đã do trigger tạo, còn đổi tên phải đi qua PUT /users/me.
-- =====================================================================

-- 1. BẬT RLS TRÊN MỌI BẢNG ------------------------------------------------
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    -- 7 bảng có sẵn
    'users', 'topics', 'essays', 'evaluation_results', 'essay_annotations',
    'evaluation_logs', 'user_progress',
    -- 22 bảng mới
    'learner_goals', 'expert_profiles', 'test_sets', 'tests', 'test_sections',
    'question_groups', 'questions', 'question_answer_keys', 'band_conversions',
    'content_generation_logs', 'mock_sessions', 'test_attempts', 'attempt_answers',
    'speaking_responses', 'speech_analyses', 'speaking_evaluation_results',
    'evaluation_result_history', 'review_requests', 'expert_reviews',
    'expert_review_scores', 'system_settings', 'audit_logs'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END
$$;

-- 2. POLICY: chỉ đọc dòng của chính mình, đúng những chỗ frontend đang dùng --
-- Hook useAuth đọc hồ sơ của chính mình
DROP POLICY IF EXISTS users_read_own ON public.users;
CREATE POLICY users_read_own ON public.users
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

-- Realtime trạng thái chấm (useRealtimeEssayStatus, useGradingNotifications)
-- và trang profile đọc danh sách bài
DROP POLICY IF EXISTS essays_read_own ON public.essays;
CREATE POLICY essays_read_own ON public.essays
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Realtime trạng thái bài làm (Reading, Listening, Speaking, Mock)
DROP POLICY IF EXISTS attempts_read_own ON public.test_attempts;
CREATE POLICY attempts_read_own ON public.test_attempts
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Realtime cho Expert: yêu cầu được giao cho mình
DROP POLICY IF EXISTS reviews_read_assigned ON public.review_requests;
CREATE POLICY reviews_read_assigned ON public.review_requests
  FOR SELECT TO authenticated
  USING (expert_id = (SELECT auth.uid()));

-- Mọi bảng khác không có policy nào: anon và authenticated không đọc,
-- không ghi được, kể cả bảng đáp án question_answer_keys.

-- 3. QUYỀN BẢNG: lớp phòng thủ thứ hai, phòng khi sau này có policy viết sai --
-- anon (chưa đăng nhập) không cần đọc bảng nào trực tiếp.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
-- authenticated chỉ được SELECT (RLS quyết định dòng nào), không ghi trực tiếp.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON ALL TABLES IN SCHEMA public FROM authenticated;
-- Bảng tạo sau này cũng theo quy tắc trên.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM authenticated;

-- 4. REALTIME ------------------------------------------------------------
-- Thêm các bảng được frontend subscribe vào publication của Supabase
-- (bỏ qua bảng đã có, ví dụ essays nếu trước đây đã bật trên Dashboard).
DO $$
DECLARE
  t TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE NOTICE 'Không có publication supabase_realtime, bỏ qua bước Realtime.';
    RETURN;
  END IF;
  FOREACH t IN ARRAY ARRAY['essays', 'test_attempts', 'review_requests'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                   WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END
$$;
