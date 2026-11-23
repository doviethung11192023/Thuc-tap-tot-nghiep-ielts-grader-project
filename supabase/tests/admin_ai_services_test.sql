-- =====================================================================
-- Test migration 20261122100000 (spec 008): cost_usd, khoá settings, ai_provider_secrets, start_ai_regrade.
-- Chạy trong 1 transaction rồi ROLLBACK: không để lại dữ liệu.
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/admin_ai_services_test.sql
-- =====================================================================
BEGIN;

CREATE FUNCTION pg_temp.check(label text, ok boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF ok IS NOT TRUE THEN RAISE EXCEPTION 'FAIL  %', label; END IF;
  RAISE NOTICE 'PASS  %', label;
END $$;

-- Câu lệnh phải bị từ chối với một lỗi chứa chuỗi cho trước.
CREATE FUNCTION pg_temp.rejects(label text, stmt text, expected text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE stmt;
  EXCEPTION WHEN OTHERS THEN
    IF position(expected IN SQLERRM) > 0 THEN
      RAISE NOTICE 'PASS  %', label;
      RETURN;
    END IF;
    RAISE EXCEPTION 'FAIL  % (wrong error: %)', label, SQLERRM;
  END;
  RAISE EXCEPTION 'FAIL  % (statement was accepted)', label;
END $$;

-- ---------- dữ liệu nền ----------
INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data) VALUES
  ('00000000-0000-0000-0000-00000000020a', 'ai-admin@t.test', '{"role":"admin"}', '{}'),
  ('00000000-0000-0000-0000-0000000002b1', 'ai-learner1@t.test', '{}', '{}'),
  ('00000000-0000-0000-0000-0000000002b2', 'ai-learner2@t.test', '{}', '{}'),
  ('00000000-0000-0000-0000-0000000002b3', 'ai-learner3@t.test', '{}', '{}');

INSERT INTO public.tests (id, title, skill, allowed_mode, author_id, author_role) VALUES
  ('22000000-0000-0000-0000-00000000000a', 'AI Reading', 'reading', 'both', '00000000-0000-0000-0000-00000000020a', 'admin'),
  ('22000000-0000-0000-0000-00000000000b', 'AI Writing', 'writing', 'both', '00000000-0000-0000-0000-00000000020a', 'admin'),
  ('22000000-0000-0000-0000-00000000000c', 'AI Speaking', 'speaking', 'both', '00000000-0000-0000-0000-00000000020a', 'admin');
INSERT INTO public.sections (id, test_id, skill, kind, order_no) VALUES
  ('32000000-0000-0000-0000-0000000000a1', '22000000-0000-0000-0000-00000000000a', 'reading', 'lr', 1),
  ('32000000-0000-0000-0000-0000000000b1', '22000000-0000-0000-0000-00000000000b', 'writing', 'writing', 1),
  ('32000000-0000-0000-0000-0000000000b2', '22000000-0000-0000-0000-00000000000b', 'writing', 'writing', 2),
  ('32000000-0000-0000-0000-0000000000c1', '22000000-0000-0000-0000-00000000000c', 'speaking', 'speaking', 1);
INSERT INTO public.lr_sections (section_id, passage) VALUES ('32000000-0000-0000-0000-0000000000a1', 'passage');
INSERT INTO public.writing_tasks (section_id, task_type, task_prompt, min_words) VALUES
  ('32000000-0000-0000-0000-0000000000b1', 'task1', 'Describe the chart', 150),
  ('32000000-0000-0000-0000-0000000000b2', 'task2', 'Discuss both views', 250);
INSERT INTO public.speaking_parts (section_id) VALUES ('32000000-0000-0000-0000-0000000000c1');
INSERT INTO public.speaking_questions (id, speaking_part_id, order_no, prompt) VALUES
  ('52000000-0000-0000-0000-0000000000c1', '32000000-0000-0000-0000-0000000000c1', 1, 'Q1');
INSERT INTO public.question_groups (id, lr_section_id, order_no, question_type) VALUES
  ('42000000-0000-0000-0000-000000000001', '32000000-0000-0000-0000-0000000000a1', 1, 'completion');
INSERT INTO public.questions (id, group_id, number, prompt) VALUES
  ('52000000-0000-0000-0000-000000000001', '42000000-0000-0000-0000-000000000001', 1, 'Q1');
UPDATE public.tests SET status = 'published', reviewer_id = '00000000-0000-0000-0000-00000000020a',
       reviewer_role = 'admin', reviewed_at = now()
 WHERE id::text LIKE '22000000-%';

-- Mã rút gọn: R = Reading, W1/W2/W3 = Writing, S1/S2 = Speaking (đuôi id 0r, 01..03, 0a..)
INSERT INTO public.attempts (id, learner_id, test_id, skill, mode, deadline_at) VALUES
  ('72000000-0000-0000-0000-0000000000a0', '00000000-0000-0000-0000-0000000002b1', '22000000-0000-0000-0000-00000000000a', 'reading', 'practice', NULL),
  ('72000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000002b1', '22000000-0000-0000-0000-00000000000b', 'writing', 'practice', NULL),
  ('72000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000002b2', '22000000-0000-0000-0000-00000000000b', 'writing', 'practice', NULL),
  ('72000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000002b3', '22000000-0000-0000-0000-00000000000b', 'writing', 'practice', NULL),
  ('72000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000002b1', '22000000-0000-0000-0000-00000000000c', 'speaking', 'practice', NULL),
  ('72000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000002b2', '22000000-0000-0000-0000-00000000000c', 'speaking', 'practice', NULL);


-- ---------- 1. grading_runs.cost_usd ----------
SELECT pg_temp.check('cost_usd: column exists with numeric(12,6)',
  EXISTS (SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'grading_runs' AND column_name = 'cost_usd'
             AND numeric_precision = 12 AND numeric_scale = 6));
SELECT pg_temp.check('index: started_at and model indexes exist',
  (SELECT count(*) FROM pg_indexes WHERE schemaname = 'public'
    AND indexname IN ('idx_runs_started_at', 'idx_runs_model', 'idx_audit_created', 'idx_audit_action')) = 4);


-- ---------- 2. system_settings ----------
SELECT pg_temp.check('settings: ai_model_prices has the default models with null prices',
  (SELECT value -> 'qwen-flash' ->> 'input_per_1m' IS NULL AND value ? 'qwen-flash'
          AND value ? 'qwen3.7-plus' AND jsonb_typeof(value -> 'qwen3.7-plus' -> 'output_per_1m') = 'null'
     FROM public.system_settings WHERE key = 'ai_model_prices'));
SELECT pg_temp.check('settings: budget, trace days and runtime config seeded',
  (SELECT value FROM public.system_settings WHERE key = 'ai_monthly_budget_usd') IS NOT NULL
  AND (SELECT (value #>> '{}')::int FROM public.system_settings WHERE key = 'trace_view_days') > 0
  AND (SELECT value ? 'steps' AND value ? 'llm' AND value ? 'jev'
         FROM public.system_settings WHERE key = 'ai_runtime_config'));
-- Chạy lại phần gieo không ghi đè giá Admin đã sửa (ON CONFLICT DO NOTHING).
UPDATE public.system_settings SET value = '{"qwen-flash": {"input_per_1m": 0.05, "output_per_1m": 0.4}}'
 WHERE key = 'ai_model_prices';
INSERT INTO public.system_settings (key, value) VALUES ('ai_model_prices', '{}') ON CONFLICT (key) DO NOTHING;
SELECT pg_temp.check('settings: reseed keeps the admin edit',
  (SELECT value -> 'qwen-flash' ->> 'input_per_1m' FROM public.system_settings WHERE key = 'ai_model_prices') = '0.05');


-- ---------- 3. ai_provider_secrets ----------
INSERT INTO public.ai_provider_secrets (provider, ciphertext, last4, updated_by)
VALUES ('dashscope', 'gAAAA-fake-token', 'ab12', '00000000-0000-0000-0000-00000000020a');

SELECT pg_temp.check('secrets: RLS on, no policy',
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.ai_provider_secrets'::regclass)
  AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_provider_secrets'));
SELECT pg_temp.check('secrets: only service_role has table privileges',
  NOT has_table_privilege('anon', 'public.ai_provider_secrets', 'SELECT')
  AND NOT has_table_privilege('authenticated', 'public.ai_provider_secrets', 'SELECT')
  AND NOT has_table_privilege('authenticated', 'public.ai_provider_secrets', 'INSERT')
  AND has_table_privilege('service_role', 'public.ai_provider_secrets', 'SELECT')
  AND has_table_privilege('service_role', 'public.ai_provider_secrets', 'INSERT'));

DO $$
DECLARE
  n integer;
BEGIN
  SET LOCAL ROLE authenticated;
  BEGIN
    SELECT count(*) INTO n FROM public.ai_provider_secrets;
    RESET ROLE;
    RAISE EXCEPTION 'FAIL  secrets: authenticated read % rows', n;
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    RAISE NOTICE 'PASS  secrets: authenticated role cannot read the table';
  END;
END $$;

SELECT pg_temp.rejects('secrets: unknown provider is rejected',
  $q$INSERT INTO public.ai_provider_secrets (provider, ciphertext, last4, updated_by)
     VALUES ('openai', 'x', 'abcd', '00000000-0000-0000-0000-00000000020a')$q$, 'check');
SELECT pg_temp.rejects('secrets: last4 longer than 4 chars is rejected',
  $q$INSERT INTO public.ai_provider_secrets (provider, ciphertext, last4, updated_by)
     VALUES ('typesafe', 'x', 'abcde', '00000000-0000-0000-0000-00000000020a')$q$, 'check');
SELECT pg_temp.rejects('secrets: only an admin profile can be the updater',
  $q$INSERT INTO public.ai_provider_secrets (provider, ciphertext, last4, updated_by)
     VALUES ('typesafe', 'x', 'abcd', '00000000-0000-0000-0000-0000000002b1')$q$, 'violates');


-- ---------- 4. start_ai_regrade: bỏ qua ----------
SELECT pg_temp.check('regrade: unknown attempt is not_found',
  public.start_ai_regrade('72000000-0000-0000-0000-0000000000ff', '00000000-0000-0000-0000-00000000020a')
    = '{"status": "skipped", "reason": "not_found"}'::jsonb);
SELECT pg_temp.check('regrade: Reading is not AI graded',
  public.start_ai_regrade('72000000-0000-0000-0000-0000000000a0', '00000000-0000-0000-0000-00000000020a') ->> 'reason' = 'not_ai_graded');
SELECT pg_temp.check('regrade: Writing still in progress is not_submitted',
  public.start_ai_regrade('72000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-00000000020a') ->> 'reason' = 'not_submitted');
SELECT pg_temp.check('regrade: Speaking still in progress is not_submitted',
  public.start_ai_regrade('72000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-00000000020a') ->> 'reason' = 'not_submitted');

-- Speaking không có câu confirm → no_speech, không tạo evaluation.
SELECT public.submit_speaking_attempt('72000000-0000-0000-0000-0000000000c2');
SELECT pg_temp.check('regrade: no_speech attempt is skipped and creates nothing',
  public.start_ai_regrade('72000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-00000000020a') ->> 'reason' = 'no_speech'
  AND NOT EXISTS (SELECT 1 FROM public.evaluations WHERE attempt_id = '72000000-0000-0000-0000-0000000000c2'));


-- ---------- 5. start_ai_regrade: Writing grading_failed ----------
-- W1: chỉ Task 1 có chữ, Task 2 chỉ có khoảng trắng → chỉ chấm Task 1 (BR-04).
CREATE TEMP TABLE w1_submit ON COMMIT DROP AS
SELECT public.submit_writing_attempt('72000000-0000-0000-0000-0000000000b1', jsonb_build_array(
  jsonb_build_object('task_no', 1, 'section_id', '32000000-0000-0000-0000-0000000000b1', 'content', 'two words'),
  jsonb_build_object('task_no', 2, 'section_id', '32000000-0000-0000-0000-0000000000b2', 'content', '   '))) AS r;

SELECT pg_temp.check('regrade: attempt that is grading is skipped as grading',
  public.start_ai_regrade('72000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000020a') ->> 'reason' = 'grading');

UPDATE public.grading_runs SET status = 'failed', error = 'boom', finished_at = now()
 WHERE evaluation_id = (SELECT (r ->> 'evaluation_id')::uuid FROM w1_submit);
SELECT public.fail_ai_evaluation((SELECT (r ->> 'evaluation_id')::uuid FROM w1_submit), '72000000-0000-0000-0000-0000000000b1');
SELECT pg_temp.check('regrade setup: W1 is grading_failed',
  (SELECT status FROM public.attempts WHERE id = '72000000-0000-0000-0000-0000000000b1') = 'grading_failed');

CREATE TEMP TABLE w1_regrade ON COMMIT DROP AS
SELECT public.start_ai_regrade('72000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000020a',
                               '99000000-0000-0000-0000-000000000001') AS r;

SELECT pg_temp.check('regrade: grading_failed Writing is queued with a run for the non-empty task only',
  (SELECT r ->> 'status' = 'queued' AND r ->> 'skill' = 'writing' AND r ->> 'mode' = 'practice'
          AND jsonb_array_length(r -> 'runs') = 1 AND r #>> '{runs,0,task_no}' = '1' FROM w1_regrade));
SELECT pg_temp.check('regrade: attempt goes back to grading',
  (SELECT status FROM public.attempts WHERE id = '72000000-0000-0000-0000-0000000000b1') = 'grading');
SELECT pg_temp.check('regrade: new pending AI evaluation, old failed one kept',
  EXISTS (SELECT 1 FROM public.evaluations e, w1_regrade w
           WHERE e.id = (w.r ->> 'evaluation_id')::uuid AND e.status = 'pending' AND e.evaluator_type = 'ai')
  AND (SELECT count(*) FROM public.evaluations WHERE attempt_id = '72000000-0000-0000-0000-0000000000b1') = 2);
SELECT pg_temp.check('regrade: a running run exists for the new evaluation',
  EXISTS (SELECT 1 FROM public.grading_runs g, w1_regrade w
           WHERE g.evaluation_id = (w.r ->> 'evaluation_id')::uuid AND g.status = 'running' AND g.task_no = 1));
SELECT pg_temp.check('regrade: audit log written with old status, evaluation and batch',
  EXISTS (SELECT 1 FROM public.audit_logs a, w1_regrade w
           WHERE a.action = 'regrade_ai' AND a.entity = 'attempts' AND a.actor_type = 'admin'
             AND a.admin_id = '00000000-0000-0000-0000-00000000020a' AND a.admin_role = 'admin'
             AND a.entity_id = '72000000-0000-0000-0000-0000000000b1'
             AND a.before ->> 'status' = 'grading_failed'
             AND a.after ->> 'evaluation_id' = w.r ->> 'evaluation_id'
             AND a.after ->> 'batch_id' = '99000000-0000-0000-0000-000000000001'));
SELECT pg_temp.check('regrade: a second click while it runs is skipped as grading',
  public.start_ai_regrade('72000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000020a') ->> 'reason' = 'grading'
  AND (SELECT count(*) FROM public.evaluations WHERE attempt_id = '72000000-0000-0000-0000-0000000000b1') = 2);


-- ---------- 6. start_ai_regrade: Writing scored giữ kết quả cũ ----------
CREATE TEMP TABLE w2_submit ON COMMIT DROP AS
SELECT public.submit_writing_attempt('72000000-0000-0000-0000-0000000000b2', jsonb_build_array(
  jsonb_build_object('task_no', 1, 'section_id', '32000000-0000-0000-0000-0000000000b1', 'content', 'one two'),
  jsonb_build_object('task_no', 2, 'section_id', '32000000-0000-0000-0000-0000000000b2', 'content', 'three four five'))) AS r;
UPDATE public.grading_runs SET status = 'done', finished_at = now()
 WHERE evaluation_id = (SELECT (r ->> 'evaluation_id')::uuid FROM w2_submit);
SELECT public.publish_ai_evaluation((SELECT (r ->> 'evaluation_id')::uuid FROM w2_submit),
                                    '72000000-0000-0000-0000-0000000000b2', 6.5);

CREATE TEMP TABLE w2_regrade ON COMMIT DROP AS
SELECT public.start_ai_regrade('72000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000020a') AS r;

SELECT pg_temp.check('regrade: scored Writing is queued with both tasks',
  (SELECT r ->> 'status' = 'queued' AND jsonb_array_length(r -> 'runs') = 2 FROM w2_regrade));
SELECT pg_temp.check('regrade: scored attempt stays scored and the old official result is untouched',
  (SELECT status FROM public.attempts WHERE id = '72000000-0000-0000-0000-0000000000b2') = 'scored'
  AND EXISTS (SELECT 1 FROM public.evaluations e, w2_submit s
               WHERE e.id = (s.r ->> 'evaluation_id')::uuid AND e.is_official AND e.overall_band = 6.5));
SELECT pg_temp.check('regrade: audit batch_id is null for a single regrade',
  EXISTS (SELECT 1 FROM public.audit_logs a, w2_regrade w
           WHERE a.action = 'regrade_ai' AND a.before ->> 'status' = 'scored'
             AND a.after ->> 'evaluation_id' = w.r ->> 'evaluation_id'
             AND jsonb_typeof(a.after -> 'batch_id') = 'null'));


-- ---------- 7. start_ai_regrade: Speaking ----------
INSERT INTO public.attempt_sections (attempt_id, section_id, test_id) VALUES
  ('72000000-0000-0000-0000-0000000000c1', '32000000-0000-0000-0000-0000000000c1', '22000000-0000-0000-0000-00000000000c');
INSERT INTO public.speaking_responses (attempt_id, speaking_question_id, section_id, audio_key, confirmed_at) VALUES
  ('72000000-0000-0000-0000-0000000000c1', '52000000-0000-0000-0000-0000000000c1', '32000000-0000-0000-0000-0000000000c1', 'k', now());

CREATE TEMP TABLE s1_submit ON COMMIT DROP AS
SELECT public.submit_speaking_attempt('72000000-0000-0000-0000-0000000000c1') AS r;
UPDATE public.grading_runs SET status = 'failed', error = 'boom', finished_at = now()
 WHERE evaluation_id = (SELECT (r #>> '{job,evaluation_id}')::uuid FROM s1_submit);
SELECT public.fail_ai_evaluation((SELECT (r #>> '{job,evaluation_id}')::uuid FROM s1_submit),
                                 '72000000-0000-0000-0000-0000000000c1');

UPDATE public.speaking_responses SET audio_deleted_at = now()
 WHERE attempt_id = '72000000-0000-0000-0000-0000000000c1';
SELECT pg_temp.check('regrade: Speaking with deleted audio is skipped',
  public.start_ai_regrade('72000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000020a') ->> 'reason' = 'audio_deleted'
  AND (SELECT status FROM public.attempts WHERE id = '72000000-0000-0000-0000-0000000000c1') = 'grading_failed'
  AND (SELECT count(*) FROM public.evaluations WHERE attempt_id = '72000000-0000-0000-0000-0000000000c1') = 1);

UPDATE public.speaking_responses SET audio_deleted_at = NULL
 WHERE attempt_id = '72000000-0000-0000-0000-0000000000c1';
CREATE TEMP TABLE s1_regrade ON COMMIT DROP AS
SELECT public.start_ai_regrade('72000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000020a') AS r;
SELECT pg_temp.check('regrade: Speaking is queued with one run without task number',
  (SELECT r ->> 'status' = 'queued' AND r ->> 'skill' = 'speaking' AND jsonb_array_length(r -> 'runs') = 1
          AND jsonb_typeof(r #> '{runs,0,task_no}') = 'null' FROM s1_regrade)
  AND (SELECT status FROM public.attempts WHERE id = '72000000-0000-0000-0000-0000000000c1') = 'grading');


-- ---------- 8. Quyền ----------
DO $$
DECLARE
  r text;
  fn text := 'public.start_ai_regrade(uuid, uuid, uuid)';
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF has_function_privilege(r, fn, 'EXECUTE') THEN
      RAISE EXCEPTION 'FAIL  % can execute %', r, fn;
    END IF;
  END LOOP;
  IF NOT has_function_privilege('service_role', fn, 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL  service_role cannot execute %', fn;
  END IF;
  RAISE NOTICE 'PASS  only service_role can execute start_ai_regrade';
END $$;

ROLLBACK;
