-- =====================================================================
-- HOÀN TÁC các migration 20261010150200 → 20261010150600
-- ---------------------------------------------------------------------
-- KHÔNG nằm trong thư mục supabase/migrations: chỉ chạy tay khi cần quay
-- lại trạng thái trước khi mở rộng (ví dụ chạy thử trên project phụ).
--
-- CẢNH BÁO:
--   * XÓA toàn bộ dữ liệu trong 22 bảng mới và các cột đã thêm.
--   * Bật lại trạng thái cũ: RLS tắt trên 7 bảng có sẵn, tức là MỞ LẠI lỗ hổng.
--   * Không xóa được giá trị 'expert' của enum user_role (PostgreSQL không hỗ
--     trợ); tài khoản đang mang vai trò expert cần đổi về student trước.
--   * Dòng users do trigger tạo ra được giữ lại.
-- Nên sao lưu database trước khi chạy.
-- =====================================================================

BEGIN;

-- Trigger và hàm
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.assign_pending_reviews();
DROP FUNCTION IF EXISTS public.save_answers(UUID, UUID, JSONB);
DROP FUNCTION IF EXISTS public.submit_attempt(UUID, UUID);
DROP FUNCTION IF EXISTS public.create_review_request(UUID, UUID, UUID, public.review_source);

-- Realtime: bỏ hai bảng mới (giữ essays vì có thể đã bật từ trước)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['test_attempts', 'review_requests'] LOOP
    IF EXISTS (SELECT 1 FROM pg_publication_tables
               WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime DROP TABLE public.%I', t);
    END IF;
  END LOOP;
END
$$;

-- Policy và RLS trên bảng có sẵn
DROP POLICY IF EXISTS users_read_own  ON public.users;
DROP POLICY IF EXISTS essays_read_own ON public.essays;
ALTER TABLE public.users              DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics             DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.essays             DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.essay_annotations  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_logs    DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress      DISABLE ROW LEVEL SECURITY;

-- Cột đã thêm vào bảng có sẵn
ALTER TABLE public.essays          DROP COLUMN IF EXISTS attempt_id;
ALTER TABLE public.evaluation_logs DROP COLUMN IF EXISTS attempt_id;
ALTER TABLE public.users           DROP COLUMN IF EXISTS voice_consent_at;
ALTER TABLE public.topics
  DROP COLUMN IF EXISTS image_key,
  DROP COLUMN IF EXISTS visual_description,
  DROP COLUMN IF EXISTS origin,
  DROP COLUMN IF EXISTS source_name,
  DROP COLUMN IF EXISTS license;
ALTER TABLE public.evaluation_results
  DROP COLUMN IF EXISTS model,
  DROP COLUMN IF EXISTS prompt_versions,
  DROP COLUMN IF EXISTS trace_id;
ALTER TABLE public.user_progress
  DROP COLUMN IF EXISTS band_listening,
  DROP COLUMN IF EXISTS band_reading,
  DROP COLUMN IF EXISTS band_writing,
  DROP COLUMN IF EXISTS band_speaking,
  DROP COLUMN IF EXISTS band_overall;

-- 22 bảng mới (thứ tự từ phụ thuộc đến gốc)
DROP TABLE IF EXISTS public.expert_review_scores;
DROP TABLE IF EXISTS public.expert_reviews;
DROP TABLE IF EXISTS public.review_requests;
DROP TABLE IF EXISTS public.evaluation_result_history;
DROP TABLE IF EXISTS public.speaking_evaluation_results;
DROP TABLE IF EXISTS public.speech_analyses;
DROP TABLE IF EXISTS public.speaking_responses;
DROP TABLE IF EXISTS public.attempt_answers;
DROP TABLE IF EXISTS public.test_attempts;
DROP TABLE IF EXISTS public.mock_sessions;
DROP TABLE IF EXISTS public.content_generation_logs;
DROP TABLE IF EXISTS public.band_conversions;
DROP TABLE IF EXISTS public.question_answer_keys;
DROP TABLE IF EXISTS public.questions;
DROP TABLE IF EXISTS public.question_groups;
DROP TABLE IF EXISTS public.test_sections;
DROP TABLE IF EXISTS public.tests;
DROP TABLE IF EXISTS public.test_sets;
DROP TABLE IF EXISTS public.expert_profiles;
DROP TABLE IF EXISTS public.learner_goals;
DROP TABLE IF EXISTS public.system_settings;
DROP TABLE IF EXISTS public.audit_logs;

-- 12 enum mới
DROP TYPE IF EXISTS public.criterion_code;
DROP TYPE IF EXISTS public.assigner_type;
DROP TYPE IF EXISTS public.review_status;
DROP TYPE IF EXISTS public.review_source;
DROP TYPE IF EXISTS public.question_type;
DROP TYPE IF EXISTS public.band_source;
DROP TYPE IF EXISTS public.attempt_status;
DROP TYPE IF EXISTS public.content_origin;
DROP TYPE IF EXISTS public.content_status;
DROP TYPE IF EXISTS public.allowed_mode;
DROP TYPE IF EXISTS public.practice_mode;
DROP TYPE IF EXISTS public.skill_type;

-- Trả lại quyền mặc định của Supabase cho anon và authenticated
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;

COMMIT;
