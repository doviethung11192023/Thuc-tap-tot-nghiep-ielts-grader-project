-- =====================================================================
-- Test migration 20261109120000: Mock chọn đề ngẫu nhiên, không lặp đề, không xem trước.
-- Chạy trong 1 transaction rồi ROLLBACK: không để lại dữ liệu.
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/random_mock_selection_test.sql
-- =====================================================================
BEGIN;

CREATE FUNCTION pg_temp.check(label text, ok boolean) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF ok IS NOT TRUE THEN RAISE EXCEPTION 'FAIL  %', label; END IF;
  RAISE NOTICE 'PASS  %', label;
END $$;

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

-- ---------- dữ liệu nền: 2 bộ Mock, mỗi bộ 1 đề Speaking; 1 đề Speaking Practice ----------
-- Kho đề Mock Speaking trong test chỉ gồm các đề tạo ở đây (đề có sẵn bị ẩn tạm bên dưới)
INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data) VALUES
  ('00000000-0000-0000-0000-00000000020a', 'rm-admin@t.test', '{"role":"admin"}', '{}'),
  ('00000000-0000-0000-0000-0000000002b1', 'rm-learner@t.test', '{}', '{}'),
  ('00000000-0000-0000-0000-0000000002b2', 'rm-learner2@t.test', '{}', '{}');

-- Tạm ẩn đề Mock speaking có sẵn trên DB để kho chỉ gồm 2 đề test (rollback ở cuối)
UPDATE public.test_sets SET status = 'draft' WHERE id IN (
  SELECT test_set_id FROM public.tests WHERE skill = 'speaking' AND test_set_id IS NOT NULL);

INSERT INTO public.test_sets (id, name, status) VALUES
  ('12000000-0000-0000-0000-000000000001', 'RM set A', 'published'),
  ('12000000-0000-0000-0000-000000000002', 'RM set B', 'published');
INSERT INTO public.tests (id, title, skill, allowed_mode, test_set_id, author_id, author_role) VALUES
  ('22000000-0000-0000-0000-00000000000a', 'RM Mock A', 'speaking', 'both', '12000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000020a', 'admin'),
  ('22000000-0000-0000-0000-00000000000b', 'RM Mock B', 'speaking', 'practice', '12000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000020a', 'admin'),
  ('22000000-0000-0000-0000-00000000000c', 'RM Practice', 'speaking', 'both', NULL, '00000000-0000-0000-0000-00000000020a', 'admin');
INSERT INTO public.sections (id, test_id, skill, kind, order_no) VALUES
  ('32000000-0000-0000-0000-0000000000a1', '22000000-0000-0000-0000-00000000000a', 'speaking', 'speaking', 1),
  ('32000000-0000-0000-0000-0000000000c1', '22000000-0000-0000-0000-00000000000c', 'speaking', 'speaking', 1);
INSERT INTO public.speaking_parts (section_id) VALUES
  ('32000000-0000-0000-0000-0000000000a1'), ('32000000-0000-0000-0000-0000000000c1');
INSERT INTO public.speaking_questions (speaking_part_id, order_no, prompt) VALUES
  ('32000000-0000-0000-0000-0000000000a1', 1, 'Mock question'),
  ('32000000-0000-0000-0000-0000000000c1', 1, 'Practice question');
UPDATE public.tests SET status = 'published', reviewer_id = '00000000-0000-0000-0000-00000000020a',
       reviewer_role = 'admin', reviewed_at = now()
 WHERE id::text LIKE '22000000-%';

-- ---------- A. allowed_mode theo bộ đề ----------
SELECT pg_temp.check('A: tests in a Mock set are mock-only, others practice-only, whatever the admin sent',
  (SELECT array_agg(allowed_mode::text ORDER BY id) FROM public.tests WHERE id::text LIKE '22000000-%')
    = ARRAY['mock', 'mock', 'practice']);
SELECT pg_temp.rejects('A: practice on a Mock test is refused',
  $$INSERT INTO public.attempts (learner_id, test_id, skill, mode) VALUES
    ('00000000-0000-0000-0000-0000000002b1', '22000000-0000-0000-0000-00000000000a', 'speaking', 'practice')$$,
  'does not allow practice');
SELECT pg_temp.rejects('A: mock on a practice test is refused',
  $$INSERT INTO public.attempts (learner_id, test_id, skill, mode, deadline_at) VALUES
    ('00000000-0000-0000-0000-0000000002b1', '22000000-0000-0000-0000-00000000000c', 'speaking', 'mock', now() + interval '1 hour')$$,
  'does not allow mock');
SELECT pg_temp.rejects('A: published content stays locked (BR-10)',
  $$UPDATE public.tests SET title = 'x' WHERE id = '22000000-0000-0000-0000-00000000000a'$$, 'BR-10');

-- ---------- D. Không xem trước đề Mock ----------
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000002b1', true);
SELECT pg_temp.check('D: learner sees the practice test but not Mock tests or their questions before starting',
  (SELECT count(*) FROM public.tests WHERE id::text LIKE '22000000-%') = 1
  AND (SELECT count(*) FROM public.speaking_questions WHERE prompt = 'Mock question') = 0
  AND (SELECT count(*) FROM public.speaking_questions WHERE prompt = 'Practice question') = 1);
RESET ROLE;

-- ---------- B. Chọn ngẫu nhiên, làm tiếp, không lặp, hết đề ----------
CREATE TEMP TABLE first_pick ON COMMIT DROP AS
SELECT public.start_mock_attempt('00000000-0000-0000-0000-0000000002b1', 'speaking') AS r;
GRANT SELECT ON first_pick TO authenticated;
SELECT pg_temp.check('B: picks a Mock test of the skill, with a server deadline',
  (SELECT (r ->> 'test_id') IN ('22000000-0000-0000-0000-00000000000a', '22000000-0000-0000-0000-00000000000b')
          AND r ->> 'mode' = 'mock' AND (r ->> 'deadline_at') IS NOT NULL AND NOT (r ->> 'resumed')::boolean
     FROM first_pick));
SELECT pg_temp.check('B: starting again resumes the unfinished Mock instead of drawing a new test',
  (SELECT r ->> 'id' FROM first_pick)
    = (public.start_mock_attempt('00000000-0000-0000-0000-0000000002b1', 'speaking') ->> 'id'));

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000002b1', true);
SELECT pg_temp.check('D: once started, the learner can read that Mock test',
  EXISTS (SELECT 1 FROM public.tests WHERE id = (SELECT (r ->> 'test_id')::uuid FROM first_pick)));
RESET ROLE;

UPDATE public.attempts SET status = 'abandoned' WHERE id = (SELECT (r ->> 'id')::uuid FROM first_pick);
CREATE TEMP TABLE second_pick ON COMMIT DROP AS
SELECT public.start_mock_attempt('00000000-0000-0000-0000-0000000002b1', 'speaking') AS r;
SELECT pg_temp.check('B: an abandoned Mock test is never drawn again',
  (SELECT r ->> 'test_id' FROM second_pick) <> (SELECT r ->> 'test_id' FROM first_pick));

SELECT pg_temp.rejects('C: taking the same Mock test again is refused even by direct insert',
  format($$INSERT INTO public.attempts (learner_id, test_id, skill, mode, deadline_at) VALUES
    ('00000000-0000-0000-0000-0000000002b1', '%s', 'speaking', 'mock', now() + interval '1 hour')$$,
    (SELECT r ->> 'test_id' FROM first_pick)),
  'mock_test_already_taken');

UPDATE public.attempts SET status = 'abandoned' WHERE id = (SELECT (r ->> 'id')::uuid FROM second_pick);
SELECT pg_temp.check('B: summary shows the pool is used up for this learner, full for another',
  (SELECT total = 2 AND remaining = 0 AND open_attempt_id IS NULL
     FROM public.mock_pool_summary('00000000-0000-0000-0000-0000000002b1') WHERE skill = 'speaking')
  AND (SELECT remaining = 2 FROM public.mock_pool_summary('00000000-0000-0000-0000-0000000002b2') WHERE skill = 'speaking'));
SELECT pg_temp.rejects('B: no untaken Mock test left: refused, never repeats an old test',
  $$SELECT public.start_mock_attempt('00000000-0000-0000-0000-0000000002b1', 'speaking')$$, 'mock_pool_exhausted');

-- Đề đã luyện Practice rồi mới được đưa vào bộ Mock: không bị rút cho Learner đó
INSERT INTO public.attempts (learner_id, test_id, skill, mode) VALUES
  ('00000000-0000-0000-0000-0000000002b2', '22000000-0000-0000-0000-00000000000c', 'speaking', 'practice');
UPDATE public.tests SET test_set_id = '12000000-0000-0000-0000-000000000002', allowed_mode = 'both'
 WHERE id = '22000000-0000-0000-0000-00000000000b';      -- giữ nguyên bộ: allowed_mode vẫn tự là mock
UPDATE public.test_sets SET status = 'published' WHERE id = '12000000-0000-0000-0000-000000000001';
INSERT INTO public.test_sets (id, name, status) VALUES ('12000000-0000-0000-0000-000000000003', 'RM set C', 'published');
UPDATE public.tests SET test_set_id = '12000000-0000-0000-0000-000000000003' WHERE id = '22000000-0000-0000-0000-00000000000c';
SELECT pg_temp.check('B: a test the learner already practised is excluded from their Mock pool',
  (SELECT total = 3 AND remaining = 2 FROM public.mock_pool_summary('00000000-0000-0000-0000-0000000002b2') WHERE skill = 'speaking')
  AND (SELECT allowed_mode = 'mock' FROM public.tests WHERE id = '22000000-0000-0000-0000-00000000000b'));

-- ---------- NFR-11 ----------
DO $$
DECLARE
  fn text;
  r text;
BEGIN
  FOREACH fn IN ARRAY ARRAY['public.start_mock_attempt(uuid, public.skill)', 'public.mock_pool_summary(uuid)',
                            'public.mock_pool(public.skill)'] LOOP
    FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF has_function_privilege(r, fn, 'EXECUTE') THEN
        RAISE EXCEPTION 'FAIL  % can execute %', r, fn;
      END IF;
    END LOOP;
  END LOOP;
  RAISE NOTICE 'PASS  NFR-11 only service_role can draw a Mock test';
END $$;

ROLLBACK;
