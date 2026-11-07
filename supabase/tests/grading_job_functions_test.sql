-- =====================================================================
-- Test các function nộp bài và chấm AI (migration 20261107100000).
-- Chạy trong 1 transaction rồi ROLLBACK: không để lại dữ liệu.
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/grading_job_functions_test.sql
-- =====================================================================
BEGIN;

CREATE FUNCTION pg_temp.check(label text, ok boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF ok IS NOT TRUE THEN RAISE EXCEPTION 'FAIL  %', label; END IF;
  RAISE NOTICE 'PASS  %', label;
END $$;

-- ---------- dữ liệu nền ----------
INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data) VALUES
  ('00000000-0000-0000-0000-00000000000a', 'gj-admin@t.test', '{"role":"admin"}', '{}'),
  ('00000000-0000-0000-0000-0000000000b1', 'gj-learner@t.test', '{}', '{}'),
  ('00000000-0000-0000-0000-0000000000b2', 'gj-learner2@t.test', '{}', '{}');

INSERT INTO public.tests (id, title, skill, allowed_mode, author_id, author_role) VALUES
  ('20000000-0000-0000-0000-00000000000a', 'GJ Reading', 'reading', 'both', '00000000-0000-0000-0000-00000000000a', 'admin'),
  ('20000000-0000-0000-0000-00000000000b', 'GJ Writing', 'writing', 'both', '00000000-0000-0000-0000-00000000000a', 'admin'),
  ('20000000-0000-0000-0000-00000000000c', 'GJ Speaking', 'speaking', 'both', '00000000-0000-0000-0000-00000000000a', 'admin');
INSERT INTO public.sections (id, test_id, skill, kind, order_no) VALUES
  ('30000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-00000000000a', 'reading', 'lr', 1),
  ('30000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-00000000000b', 'writing', 'writing', 1),
  ('30000000-0000-0000-0000-0000000000b2', '20000000-0000-0000-0000-00000000000b', 'writing', 'writing', 2),
  ('30000000-0000-0000-0000-0000000000c1', '20000000-0000-0000-0000-00000000000c', 'speaking', 'speaking', 1);
INSERT INTO public.lr_sections (section_id, passage) VALUES ('30000000-0000-0000-0000-0000000000a1', 'passage');
INSERT INTO public.writing_tasks (section_id, task_type, task_prompt, min_words) VALUES
  ('30000000-0000-0000-0000-0000000000b1', 'task1', 'Describe the chart', 150),
  ('30000000-0000-0000-0000-0000000000b2', 'task2', 'Discuss both views', 250);
INSERT INTO public.speaking_parts (section_id) VALUES ('30000000-0000-0000-0000-0000000000c1');
INSERT INTO public.speaking_questions (id, speaking_part_id, order_no, prompt) VALUES
  ('50000000-0000-0000-0000-0000000000c1', '30000000-0000-0000-0000-0000000000c1', 1, 'Q1');
INSERT INTO public.question_groups (id, lr_section_id, order_no, question_type) VALUES
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-0000000000a1', 1, 'completion');
INSERT INTO public.questions (id, group_id, number, prompt) VALUES
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 1, 'Q1');
UPDATE public.tests SET status = 'published', reviewer_id = '00000000-0000-0000-0000-00000000000a',
       reviewer_role = 'admin', reviewed_at = now()
 WHERE id::text LIKE '20000000-%';

INSERT INTO public.attempts (id, learner_id, test_id, skill, mode, deadline_at) VALUES
  ('70000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-00000000000a', 'reading', 'practice', NULL),
  ('70000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-00000000000b', 'writing', 'practice', NULL),
  ('70000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-00000000000c', 'speaking', 'practice', NULL),
  ('70000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-0000000000b2', '20000000-0000-0000-0000-00000000000c', 'speaking', 'mock', now() + interval '1 hour');

-- ---------- Writing ----------
CREATE TEMP TABLE writing_result ON COMMIT DROP AS
SELECT public.submit_writing_attempt('70000000-0000-0000-0000-00000000000b', jsonb_build_array(
  jsonb_build_object('task_no', 2, 'section_id', '30000000-0000-0000-0000-0000000000b2', 'content', 'three little words'),
  jsonb_build_object('task_no', 1, 'section_id', '30000000-0000-0000-0000-0000000000b1', 'content', 'two words'))) AS r;

SELECT pg_temp.check('writing: attempt moves to grading with submitted_at',
  EXISTS (SELECT 1 FROM public.attempts WHERE id = '70000000-0000-0000-0000-00000000000b'
           AND status = 'grading' AND submitted_at IS NOT NULL));
SELECT pg_temp.check('writing: essays and attempt_sections saved',
  (SELECT count(*) FROM public.essays WHERE attempt_id = '70000000-0000-0000-0000-00000000000b') = 2
  AND (SELECT count(*) FROM public.attempt_sections WHERE attempt_id = '70000000-0000-0000-0000-00000000000b') = 2);
SELECT pg_temp.check('writing: result has one run per task with word counts',
  jsonb_array_length((SELECT r -> 'runs' FROM writing_result)) = 2
  AND (SELECT sum((e ->> 'word_count')::int) FROM writing_result, jsonb_array_elements(r -> 'essays') AS e) = 5);
SELECT pg_temp.check('writing: evaluation is pending and not official',
  EXISTS (SELECT 1 FROM public.evaluations WHERE attempt_id = '70000000-0000-0000-0000-00000000000b'
           AND status = 'pending' AND evaluator_type = 'ai' AND NOT is_official));
SELECT pg_temp.check('writing: second submit returns NULL and creates nothing',
  public.submit_writing_attempt('70000000-0000-0000-0000-00000000000b', '[]') IS NULL
  AND (SELECT count(*) FROM public.evaluations WHERE attempt_id = '70000000-0000-0000-0000-00000000000b') = 1);

-- Lỗi giữa chừng phải huỷ cả việc khoá attempt: đây là lỗi kẹt ở grading mà migration này sửa.
DO $$
BEGIN
  INSERT INTO public.attempts (id, learner_id, test_id, skill, mode, deadline_at) VALUES
    ('70000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-00000000000b', 'writing', 'mock', now() + interval '1 hour');
  BEGIN
    PERFORM public.submit_writing_attempt('70000000-0000-0000-0000-00000000000e', jsonb_build_array(
      jsonb_build_object('task_no', 1, 'section_id', '30000000-0000-0000-0000-0000000000c1', 'content', 'wrong test section')));
    RAISE EXCEPTION 'FAIL  writing: bad section should have failed';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;
  IF (SELECT status FROM public.attempts WHERE id = '70000000-0000-0000-0000-00000000000e') <> 'in_progress' THEN
    RAISE EXCEPTION 'FAIL  writing: failed submit must leave the attempt in_progress';
  END IF;
  IF EXISTS (SELECT 1 FROM public.evaluations WHERE attempt_id = '70000000-0000-0000-0000-00000000000e') THEN
    RAISE EXCEPTION 'FAIL  writing: failed submit must not leave an evaluation';
  END IF;
  RAISE NOTICE 'PASS  writing: failed submit rolls back the lock, so the learner can submit again';
END $$;

-- ---------- Speaking ----------
SELECT pg_temp.check('speaking: nothing confirmed gives no_speech and no job',
  (SELECT r ->> 'status' = 'no_speech' AND r -> 'job' = 'null'::jsonb
     FROM (SELECT public.submit_speaking_attempt('70000000-0000-0000-0000-00000000000d') AS r) x)
  AND NOT EXISTS (SELECT 1 FROM public.evaluations WHERE attempt_id = '70000000-0000-0000-0000-00000000000d'));

INSERT INTO public.attempt_sections (attempt_id, section_id, test_id) VALUES
  ('70000000-0000-0000-0000-00000000000c', '30000000-0000-0000-0000-0000000000c1', '20000000-0000-0000-0000-00000000000c');
INSERT INTO public.speaking_responses (attempt_id, speaking_question_id, section_id, audio_key, confirmed_at) VALUES
  ('70000000-0000-0000-0000-00000000000c', '50000000-0000-0000-0000-0000000000c1', '30000000-0000-0000-0000-0000000000c1', 'k', now());

CREATE TEMP TABLE speaking_result ON COMMIT DROP AS
SELECT public.submit_speaking_attempt('70000000-0000-0000-0000-00000000000c') AS r;

SELECT pg_temp.check('speaking: one run with no task number',
  (SELECT r ->> 'status' FROM speaking_result) = 'grading'
  AND jsonb_array_length((SELECT r #> '{job,runs}' FROM speaking_result)) = 1
  AND EXISTS (SELECT 1 FROM public.grading_runs g
               WHERE g.id = (SELECT (r #>> '{job,runs,0,run_id}')::uuid FROM speaking_result) AND g.task_no IS NULL));
SELECT pg_temp.check('speaking: section finished',
  EXISTS (SELECT 1 FROM public.attempt_sections WHERE attempt_id = '70000000-0000-0000-0000-00000000000c'
           AND finished_at IS NOT NULL));

-- ---------- Lease ----------
CREATE TEMP TABLE speaking_run ON COMMIT DROP AS
SELECT (r #>> '{job,runs,0,run_id}')::uuid AS id, (r #>> '{job,evaluation_id}')::uuid AS evaluation_id FROM speaking_result;

SELECT pg_temp.check('lease: first worker wins', public.claim_grading_run((SELECT id FROM speaking_run), 1500));
SELECT pg_temp.check('lease: second worker is refused', NOT public.claim_grading_run((SELECT id FROM speaking_run), 1500));
UPDATE public.grading_runs SET claimed_at = now() - interval '1 hour' WHERE id = (SELECT id FROM speaking_run);
SELECT pg_temp.check('lease: expired lease can be taken', public.claim_grading_run((SELECT id FROM speaking_run), 1500));
UPDATE public.grading_runs SET status = 'done', claimed_at = NULL WHERE id = (SELECT id FROM speaking_run);
SELECT pg_temp.check('lease: finished run is never claimed', NOT public.claim_grading_run((SELECT id FROM speaking_run), 1500));

-- ---------- Công bố điểm (BR-08) ----------
SELECT public.publish_ai_evaluation((SELECT evaluation_id FROM speaking_run), '70000000-0000-0000-0000-00000000000c', 6.5);
SELECT pg_temp.check('publish: AI official, attempt scored',
  EXISTS (SELECT 1 FROM public.evaluations WHERE id = (SELECT evaluation_id FROM speaking_run)
           AND is_official AND status = 'done' AND overall_band = 6.5)
  AND (SELECT status FROM public.attempts WHERE id = '70000000-0000-0000-0000-00000000000c') = 'scored');

CREATE TEMP TABLE regrade ON COMMIT DROP AS
SELECT (public.create_ai_grading_job('70000000-0000-0000-0000-00000000000c', 'speaking', NULL) ->> 'evaluation_id')::uuid AS evaluation_id;
SELECT public.publish_ai_evaluation((SELECT evaluation_id FROM regrade), '70000000-0000-0000-0000-00000000000c', 7.0);
SELECT pg_temp.check('publish: AI rerun replaces the old official and keeps the old row',
  (SELECT count(*) FROM public.evaluations WHERE attempt_id = '70000000-0000-0000-0000-00000000000c' AND is_official) = 1
  AND (SELECT is_official FROM public.evaluations WHERE id = (SELECT evaluation_id FROM regrade))
  AND (SELECT count(*) FROM public.evaluations WHERE attempt_id = '70000000-0000-0000-0000-00000000000c') = 2);

-- ---------- Chấm thất bại ----------
SELECT public.fail_ai_evaluation((r ->> 'evaluation_id')::uuid, '70000000-0000-0000-0000-00000000000b') FROM writing_result;
SELECT pg_temp.check('fail: evaluation failed and attempt grading_failed',
  (SELECT status FROM public.attempts WHERE id = '70000000-0000-0000-0000-00000000000b') = 'grading_failed'
  AND (SELECT e.status FROM public.evaluations e, writing_result w WHERE e.id = (w.r ->> 'evaluation_id')::uuid) = 'failed');

-- ---------- Listening/Reading ----------
CREATE TEMP TABLE lr_result ON COMMIT DROP AS
SELECT public.submit_lr_attempt('70000000-0000-0000-0000-00000000000a', ARRAY['30000000-0000-0000-0000-0000000000a1']::uuid[],
  jsonb_build_array(jsonb_build_object('question_id', '50000000-0000-0000-0000-000000000001',
    'section_id', '30000000-0000-0000-0000-0000000000a1', 'answer', 'library', 'is_correct', true)),
  1, 1, NULL) AS r;
SELECT pg_temp.check('lr: score, section and answer written together',
  (SELECT r ->> 'status' FROM lr_result) = 'scored'
  AND EXISTS (SELECT 1 FROM public.answers WHERE attempt_id = '70000000-0000-0000-0000-00000000000a' AND is_correct)
  AND EXISTS (SELECT 1 FROM public.attempt_sections WHERE attempt_id = '70000000-0000-0000-0000-00000000000a'
               AND finished_at IS NOT NULL));
SELECT pg_temp.check('lr: second submit returns NULL',
  public.submit_lr_attempt('70000000-0000-0000-0000-00000000000a', ARRAY[]::uuid[], '[]', 0, 0, NULL) IS NULL
  AND (SELECT raw_score FROM public.attempts WHERE id = '70000000-0000-0000-0000-00000000000a') = 1);

-- ---------- NFR-11: Learner và anon không gọi được ----------
DO $$
DECLARE
  fn text;
  r text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.create_ai_grading_job(uuid, public.skill, smallint[])', 'public.submit_writing_attempt(uuid, jsonb)',
    'public.submit_speaking_attempt(uuid)', 'public.submit_lr_attempt(uuid, uuid[], jsonb, integer, integer, numeric)',
    'public.claim_grading_run(uuid, integer)', 'public.publish_ai_evaluation(uuid, uuid, numeric)',
    'public.fail_ai_evaluation(uuid, uuid, public.attempt_status)'
  ] LOOP
    FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF has_function_privilege(r, fn, 'EXECUTE') THEN
        RAISE EXCEPTION 'FAIL  % can execute %', r, fn;
      END IF;
    END LOOP;
    IF NOT has_function_privilege('service_role', fn, 'EXECUTE') THEN
      RAISE EXCEPTION 'FAIL  service_role cannot execute %', fn;
    END IF;
  END LOOP;
  RAISE NOTICE 'PASS  NFR-11 only service_role can execute grading functions';
END $$;

ROLLBACK;
