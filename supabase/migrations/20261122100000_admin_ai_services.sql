-- =====================================================================
-- Quản lý Service AI (spec 008): giám sát lượt chấm, chi phí, chạy lại, key nhà cung cấp.
--
--   1. grading_runs.cost_usd + index xem theo thời gian / model
--   2. system_settings: bảng giá model, ngân sách tháng, số ngày xem trace, cấu hình chạy AI
--   3. ai_provider_secrets: key nhà cung cấp AI đã mã hoá (chỉ service_role đọc được)
--   4. start_ai_regrade: Admin chạy lại chấm AI cho một attempt
--   5. audit_logs: index cho trang Audit log
--
-- Chạy lại an toàn (IF NOT EXISTS, ON CONFLICT DO NOTHING) nên không ghi đè giá hay cấu hình Admin đã sửa.
-- =====================================================================

-- 1. Chi phí từng lượt (USD). NULL = lượt chưa xong hoặc có model chưa rõ giá.
ALTER TABLE public.grading_runs ADD COLUMN IF NOT EXISTS cost_usd numeric(12,6) CHECK (cost_usd >= 0);

CREATE INDEX IF NOT EXISTS idx_runs_started_at ON public.grading_runs (started_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_model ON public.grading_runs (model, started_at DESC);


-- 2. Khoá cấu hình mới. Khoá của ai_model_prices chính là danh sách model được phép dùng.
-- Gieo model đang có trong lịch sử chấm + hai model mặc định, giá chưa rõ (null) để Admin không bị khoá ngay.
INSERT INTO public.system_settings (key, value)
SELECT 'ai_model_prices',
       COALESCE(jsonb_object_agg(m.model, jsonb_build_object('input_per_1m', 'null'::jsonb,
                                                              'output_per_1m', 'null'::jsonb)), '{}'::jsonb)
  FROM (SELECT DISTINCT g.model AS model FROM public.grading_runs g
         WHERE g.model ~ '^[A-Za-z0-9._:/-]+$'          -- bỏ nhãn cũ kiểu "ta=a; cc,lr,gra=b"
           AND g.model NOT LIKE 'system-%'              -- bỏ nhãn nội bộ như system-zero-word-guard
        UNION SELECT 'qwen-flash'
        UNION SELECT 'qwen3.7-plus'
        UNION SELECT 'qwen3.8-flash') AS m              -- prompt phân loại trên Langfuse dùng model này
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.system_settings (key, value) VALUES
  ('ai_monthly_budget_usd', '20'),                                      -- 0 hoặc null = không cảnh báo
  ('trace_view_days',       '30'),                                      -- số ngày còn xem được trace trên Langfuse
  ('ai_runtime_config',     '{"steps": {}, "llm": {}, "jev": {}}')      -- ghi đè model/tham số, xem data-model.md §2
ON CONFLICT (key) DO NOTHING;


-- 3. Key nhà cung cấp AI do Admin nhập ở trang Service AI, mã hoá Fernet bằng AI_SECRETS_ENCRYPTION_KEY của Core.
-- Không để trong system_settings vì trình sửa JSON chung đọc và ghi audit toàn bộ value.
-- Bật RLS không có policy và thu quyền: chỉ service_role (Core API) đọc được.
CREATE TABLE IF NOT EXISTS public.ai_provider_secrets (
  provider    text PRIMARY KEY CHECK (provider IN ('dashscope', 'typesafe')),
  ciphertext  text NOT NULL,                                     -- Fernet token
  last4       text NOT NULL CHECK (char_length(last4) <= 4),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid NOT NULL,
  admin_role  public.user_role NOT NULL DEFAULT 'admin' CHECK (admin_role = 'admin'),
  FOREIGN KEY (updated_by, admin_role) REFERENCES public.profiles (id, role)
);
ALTER TABLE public.ai_provider_secrets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_provider_secrets FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.ai_provider_secrets TO service_role;


-- 4. Chạy lại chấm AI (UC-24). Trả jsonb:
--    {"status": "skipped", "reason": ...}  hoặc
--    {"status": "queued", "skill", "mode", "evaluation_id", "runs": [{run_id, task_no}]}
-- Lý do bỏ qua: not_found, not_submitted, grading, no_speech, audio_deleted, not_ai_graded.
-- Kết quả cũ không bị đụng: create_ai_grading_job tạo evaluation mới, publish_ai_evaluation chỉ thay bản
-- chính thức khi lượt mới xong, fail_ai_evaluation chỉ đổi attempt đang `grading` (R5 trong research.md).
CREATE OR REPLACE FUNCTION public.start_ai_regrade(p_attempt_id uuid, p_admin_id uuid, p_batch_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v public.attempts%ROWTYPE;
  v_task_nos smallint[];
  v_job jsonb;
BEGIN
  SELECT * INTO v FROM public.attempts WHERE id = p_attempt_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'skipped', 'reason', 'not_found');
  END IF;

  IF v.skill NOT IN ('writing', 'speaking') THEN
    RETURN jsonb_build_object('status', 'skipped', 'reason', 'not_ai_graded');
  END IF;
  IF v.status IN ('in_progress', 'abandoned') THEN
    RETURN jsonb_build_object('status', 'skipped', 'reason', 'not_submitted');
  END IF;
  IF v.status = 'no_speech' THEN
    RETURN jsonb_build_object('status', 'skipped', 'reason', 'no_speech');
  END IF;
  -- Đang chấm: trạng thái grading/submitted, hoặc còn lượt chạy dở (kể cả lần chạy lại trên bài đã scored).
  IF v.status IN ('grading', 'submitted')
     OR EXISTS (SELECT 1 FROM public.grading_runs r JOIN public.evaluations e ON e.id = r.evaluation_id
                 WHERE e.attempt_id = p_attempt_id AND r.status = 'running') THEN
    RETURN jsonb_build_object('status', 'skipped', 'reason', 'grading');
  END IF;

  IF v.skill = 'speaking' THEN
    IF EXISTS (SELECT 1 FROM public.speaking_responses
                WHERE attempt_id = p_attempt_id AND audio_deleted_at IS NOT NULL) THEN
      RETURN jsonb_build_object('status', 'skipped', 'reason', 'audio_deleted');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.speaking_responses
                    WHERE attempt_id = p_attempt_id AND confirmed_at IS NOT NULL) THEN
      RETURN jsonb_build_object('status', 'skipped', 'reason', 'no_speech');
    END IF;
  ELSE
    -- Writing: chỉ task có bài viết không rỗng, giống luồng nộp (BR-04).
    SELECT array_agg(CASE w.task_type WHEN 'task1' THEN 1 ELSE 2 END::smallint
                     ORDER BY CASE w.task_type WHEN 'task1' THEN 1 ELSE 2 END)
      INTO v_task_nos
      FROM public.essays e JOIN public.writing_tasks w ON w.section_id = e.section_id
     WHERE e.attempt_id = p_attempt_id AND btrim(e.content) <> '';
    IF v_task_nos IS NULL THEN
      RETURN jsonb_build_object('status', 'skipped', 'reason', 'not_submitted');
    END IF;
  END IF;

  -- grading_failed → grading để Learner thấy "đang chấm"; scored / waiting_expert giữ nguyên.
  IF v.status = 'grading_failed' THEN
    UPDATE public.attempts SET status = 'grading' WHERE id = p_attempt_id;
  END IF;

  v_job := public.create_ai_grading_job(p_attempt_id, v.skill, v_task_nos);

  INSERT INTO public.audit_logs (actor_type, admin_id, admin_role, action, entity, entity_id, before, after)
  VALUES ('admin', p_admin_id, 'admin', 'regrade_ai', 'attempts', p_attempt_id::text,
          jsonb_build_object('status', v.status),
          jsonb_build_object('evaluation_id', v_job -> 'evaluation_id', 'batch_id', p_batch_id));

  RETURN jsonb_build_object('status', 'queued', 'skill', v.skill, 'mode', v.mode,
                            'evaluation_id', v_job -> 'evaluation_id', 'runs', v_job -> 'runs');
END $$;

-- Như các function chấm khác: chỉ service_role (Core API) gọi được, Learner không tự bắt chấm lại.
REVOKE ALL ON FUNCTION public.start_ai_regrade(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_ai_regrade(uuid, uuid, uuid) TO service_role;


-- 5. Trang Audit log lọc theo thời gian và hành động.
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.audit_logs (action, created_at DESC);
