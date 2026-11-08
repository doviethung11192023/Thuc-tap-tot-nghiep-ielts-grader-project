-- =====================================================================
-- Test migration 20261109100000: lưu bài, tự nộp, chặn ghi sau khi nộp, bất biến, transcript, Mock chờ Expert.
-- Chạy trong 1 transaction rồi ROLLBACK: không để lại dữ liệu.
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/saved_work_and_integrity_test.sql
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
  ('00000000-0000-0000-0000-00000000010a', 'sw-admin@t.test', '{"role":"admin"}', '{}'),
  ('00000000-0000-0000-0000-0000000001b1', 'sw-learner@t.test', '{}', '{}'),
  ('00000000-0000-0000-0000-0000000001b2', 'sw-learner2@t.test', '{}', '{}'),
  ('00000000-0000-0000-0000-0000000001b3', 'sw-learner3@t.test', '{}', '{}');

-- Đề Writing thuộc bộ đề Mock (chỉ thi Mock được); đề Reading ngoài bộ (chỉ Practice)
INSERT INTO public.test_sets (id, name, status) VALUES ('11000000-0000-0000-0000-000000000001', 'SW Mock set', 'published');

INSERT INTO public.tests (id, title, skill, allowed_mode, test_set_id, author_id, author_role) VALUES
  ('21000000-0000-0000-0000-00000000000a', 'SW Reading', 'reading', 'both', NULL, '00000000-0000-0000-0000-00000000010a', 'admin'),
  ('21000000-0000-0000-0000-00000000000b', 'SW Writing', 'writing', 'both', '11000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000010a', 'admin');
INSERT INTO public.sections (id, test_id, skill, kind, order_no) VALUES
  ('31000000-0000-0000-0000-0000000000a1', '21000000-0000-0000-0000-00000000000a', 'reading', 'lr', 1),
  ('31000000-0000-0000-0000-0000000000b1', '21000000-0000-0000-0000-00000000000b', 'writing', 'writing', 1),
  ('31000000-0000-0000-0000-0000000000b2', '21000000-0000-0000-0000-00000000000b', 'writing', 'writing', 2);
INSERT INTO public.lr_sections (section_id, passage, transcript) VALUES
  ('31000000-0000-0000-0000-0000000000a1', 'passage', 'secret transcript');
INSERT INTO public.writing_tasks (section_id, task_type, task_prompt, min_words) VALUES
  ('31000000-0000-0000-0000-0000000000b1', 'task1', 'Describe the chart', 150),
  ('31000000-0000-0000-0000-0000000000b2', 'task2', 'Discuss both views', 250);
INSERT INTO public.question_groups (id, lr_section_id, order_no, question_type) VALUES
  ('41000000-0000-0000-0000-000000000001', '31000000-0000-0000-0000-0000000000a1', 1, 'completion');
INSERT INTO public.questions (id, group_id, number, prompt) VALUES
  ('51000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000001', 1, 'Q1'),
  ('51000000-0000-0000-0000-000000000002', '41000000-0000-0000-0000-000000000001', 2, 'Q2');
UPDATE public.tests SET status = 'published', reviewer_id = '00000000-0000-0000-0000-00000000010a',
       reviewer_role = 'admin', reviewed_at = now()
 WHERE id::text LIKE '21000000-%';

-- a: Reading practice; b: Writing Mock không lưu gì; c: Writing Mock (Learner 2) sẽ quá hạn, có bài đã lưu
INSERT INTO public.attempts (id, learner_id, test_id, skill, mode, started_at, deadline_at) VALUES
  ('71000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000001b1', '21000000-0000-0000-0000-00000000000a', 'reading', 'practice', now(), NULL),
  ('71000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-0000000001b1', '21000000-0000-0000-0000-00000000000b', 'writing', 'mock', now(), now() + interval '1 hour');
INSERT INTO public.attempts (id, learner_id, test_id, skill, mode, started_at, deadline_at) VALUES
  ('71000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-0000000001b2', '21000000-0000-0000-0000-00000000000b', 'writing', 'mock', now() - interval '2 hours', now() + interval '1 hour');

-- ---------- A. Practice không abandoned ----------
SELECT pg_temp.rejects('A: practice attempt cannot be abandoned',
  $$UPDATE public.attempts SET status = 'abandoned' WHERE id = '71000000-0000-0000-0000-00000000000a'$$,
  'attempts_abandoned_mock_only');

-- ---------- B. Lưu bài ----------
SELECT public.save_lr_answers('71000000-0000-0000-0000-00000000000a', jsonb_build_array(
  jsonb_build_object('question_id', '51000000-0000-0000-0000-000000000001', 'section_id', '31000000-0000-0000-0000-0000000000a1', 'answer', 'libary')));
SELECT public.save_lr_answers('71000000-0000-0000-0000-00000000000a', jsonb_build_array(
  jsonb_build_object('question_id', '51000000-0000-0000-0000-000000000001', 'section_id', '31000000-0000-0000-0000-0000000000a1', 'answer', 'library')));
SELECT pg_temp.check('B: autosave keeps one row per question, newest answer, no score yet',
  (SELECT count(*) FROM public.answers WHERE attempt_id = '71000000-0000-0000-0000-00000000000a') = 1
  AND (SELECT answer = 'library' AND is_correct IS NULL FROM public.answers
        WHERE attempt_id = '71000000-0000-0000-0000-00000000000a'));

SELECT public.save_writing_essays('71000000-0000-0000-0000-00000000000c', jsonb_build_array(
  jsonb_build_object('section_id', '31000000-0000-0000-0000-0000000000b2', 'content', 'saved before the deadline')));
SELECT pg_temp.check('B: essay saved on the server',
  (SELECT word_count FROM public.essays WHERE attempt_id = '71000000-0000-0000-0000-00000000000c') = 4);

-- Hạn qua đi (đổi deadline thay vì chờ): lưu muộn hơn hạn + 30 s bị từ chối (BR-07)
UPDATE public.attempts SET deadline_at = now() - interval '1 minute' WHERE id = '71000000-0000-0000-0000-00000000000c';
SELECT pg_temp.rejects('B: save after deadline + grace is refused',
  $$SELECT public.save_writing_essays('71000000-0000-0000-0000-00000000000c', '[{"section_id": "31000000-0000-0000-0000-0000000000b2", "content": "late text"}]')$$,
  'deadline_passed');

-- ---------- C. Tự nộp bằng bài đã lưu ----------
CREATE TEMP TABLE auto_w ON COMMIT DROP AS
SELECT public.submit_writing_attempt('71000000-0000-0000-0000-00000000000c', NULL, true) AS r;
SELECT pg_temp.check('C: auto-submit grades the saved essay only',
  (SELECT r ->> 'status' FROM auto_w) = 'grading'
  AND jsonb_array_length((SELECT r -> 'runs' FROM auto_w)) = 1
  AND (SELECT (r #>> '{essays,0,task_no}')::int FROM auto_w) = 2
  AND EXISTS (SELECT 1 FROM public.attempts WHERE id = '71000000-0000-0000-0000-00000000000c'
               AND status = 'grading' AND auto_submitted AND submitted_at IS NOT NULL));
SELECT pg_temp.check('C: manual submit after auto-submit is a no-op',
  public.submit_writing_attempt('71000000-0000-0000-0000-00000000000c', NULL) IS NULL);

SELECT pg_temp.check('C: Mock with nothing saved ends abandoned, no grading job',
  (SELECT public.submit_writing_attempt('71000000-0000-0000-0000-00000000000b', NULL, true) ->> 'status') = 'abandoned'
  AND NOT EXISTS (SELECT 1 FROM public.evaluations WHERE attempt_id = '71000000-0000-0000-0000-00000000000b'));

-- L/R: DB tự tính điểm, không tin số bên gọi gửi
CREATE TEMP TABLE lr ON COMMIT DROP AS
SELECT public.submit_lr_attempt('71000000-0000-0000-0000-00000000000a', ARRAY['31000000-0000-0000-0000-0000000000a1']::uuid[],
  jsonb_build_array(
    jsonb_build_object('question_id', '51000000-0000-0000-0000-000000000001', 'section_id', '31000000-0000-0000-0000-0000000000a1', 'answer', 'library', 'is_correct', true),
    jsonb_build_object('question_id', '51000000-0000-0000-0000-000000000002', 'section_id', '31000000-0000-0000-0000-0000000000a1', 'answer', NULL, 'is_correct', false)),
  40, 40, 9.0) AS r;
SELECT pg_temp.check('C: raw score and question count come from the stored rows, no band under 40 questions',
  (SELECT (r ->> 'raw_score')::int = 1 AND (r ->> 'question_count')::int = 2 AND r ->> 'lr_band' IS NULL FROM lr));

-- ---------- D. Không sửa bài sau khi nộp ----------
SELECT pg_temp.rejects('D: answer cannot change after submission',
  $$UPDATE public.answers SET answer = 'other', is_correct = true WHERE attempt_id = '71000000-0000-0000-0000-00000000000a'$$,
  'cannot change after submission');
SELECT pg_temp.rejects('D: essay cannot change after submission',
  $$UPDATE public.essays SET content = 'rewritten' WHERE attempt_id = '71000000-0000-0000-0000-00000000000c'$$,
  'cannot change after submission');
SELECT pg_temp.rejects('D: save on a submitted attempt is refused',
  $$SELECT public.save_lr_answers('71000000-0000-0000-0000-00000000000a', '[]')$$, 'attempt_closed');

-- Practice đang dở xoá được (cascade xuống answers không bị trigger chặn)
INSERT INTO public.attempts (id, learner_id, test_id, skill, mode) VALUES
  ('71000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000001b1', '21000000-0000-0000-0000-00000000000a', 'reading', 'practice');
SELECT public.save_lr_answers('71000000-0000-0000-0000-0000000000f1', jsonb_build_array(
  jsonb_build_object('question_id', '51000000-0000-0000-0000-000000000001', 'section_id', '31000000-0000-0000-0000-0000000000a1', 'answer', 'x')));
DELETE FROM public.attempts WHERE id = '71000000-0000-0000-0000-0000000000f1';
SELECT pg_temp.check('D: discarding an unfinished practice still deletes its answers',
  NOT EXISTS (SELECT 1 FROM public.answers WHERE attempt_id = '71000000-0000-0000-0000-0000000000f1'));

-- ---------- E. Kết quả chấm và audit log bất biến ----------
SELECT public.publish_ai_evaluation((r ->> 'evaluation_id')::uuid, '71000000-0000-0000-0000-00000000000c', 6.0) FROM auto_w;
SELECT pg_temp.rejects('E: finished evaluation band cannot be edited',
  format($$UPDATE public.evaluations SET overall_band = 9 WHERE id = '%s'$$, (SELECT r ->> 'evaluation_id' FROM auto_w)),
  'create a new evaluation');
SELECT pg_temp.rejects('E: finished evaluation cannot be deleted',
  format($$DELETE FROM public.evaluations WHERE id = '%s'$$, (SELECT r ->> 'evaluation_id' FROM auto_w)),
  'create a new evaluation');
SELECT pg_temp.rejects('E: criterion score cannot be added to a finished evaluation',
  format($$INSERT INTO public.criterion_scores (evaluation_id, criterion_id, task_no, skill, band)
           SELECT '%s', id, 2, 'writing', 9 FROM public.criteria WHERE skill = 'writing' AND code = 'CC'$$,
         (SELECT r ->> 'evaluation_id' FROM auto_w)),
  'cannot change after it is finished');

INSERT INTO public.audit_logs (actor_type, action, entity) VALUES ('system', 'test', 'test');
SELECT pg_temp.rejects('E: audit log cannot be edited',
  $$UPDATE public.audit_logs SET action = 'x' WHERE action = 'test'$$, 'append-only');
SELECT pg_temp.rejects('E: audit log cannot be deleted',
  $$DELETE FROM public.audit_logs WHERE action = 'test'$$, 'append-only');

-- ---------- F. Transcript ----------
SELECT pg_temp.check('F: learners cannot read the Listening transcript, can read the passage',
  NOT has_column_privilege('authenticated', 'public.lr_sections', 'transcript', 'SELECT')
  AND has_column_privilege('authenticated', 'public.lr_sections', 'passage', 'SELECT')
  AND has_column_privilege('service_role', 'public.lr_sections', 'transcript', 'SELECT'));

-- ---------- G. Mock có yêu cầu Expert: AI chỉ preliminary ----------
INSERT INTO public.attempts (id, learner_id, test_id, skill, mode, started_at, deadline_at) VALUES
  ('71000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000001b3', '21000000-0000-0000-0000-00000000000b', 'writing', 'mock', now(), now() + interval '1 hour');
CREATE TEMP TABLE mock_w ON COMMIT DROP AS
SELECT public.submit_writing_attempt('71000000-0000-0000-0000-0000000000e1', jsonb_build_array(
  jsonb_build_object('section_id', '31000000-0000-0000-0000-0000000000b2', 'content', 'mock essay text'))) AS r;
INSERT INTO public.review_requests (attempt_id, learner_id, skill) VALUES
  ('71000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000001b3', 'writing');
SELECT public.publish_ai_evaluation((r ->> 'evaluation_id')::uuid, '71000000-0000-0000-0000-0000000000e1', 6.5) FROM mock_w;
SELECT pg_temp.check('G: Mock with an open Expert request waits, AI band is preliminary only',
  (SELECT status FROM public.attempts WHERE id = '71000000-0000-0000-0000-0000000000e1') = 'waiting_expert'
  AND NOT EXISTS (SELECT 1 FROM public.evaluations WHERE attempt_id = '71000000-0000-0000-0000-0000000000e1' AND is_official)
  AND (SELECT band IS NULL AND preliminary_band = 6.5 FROM public.attempt_results
        WHERE attempt_id = '71000000-0000-0000-0000-0000000000e1'));
SELECT pg_temp.check('G: Mock without an Expert request: AI band is official',
  (SELECT status FROM public.attempts WHERE id = '71000000-0000-0000-0000-00000000000c') = 'scored'
  AND (SELECT band = 6.0 FROM public.attempt_results WHERE attempt_id = '71000000-0000-0000-0000-00000000000c'));

-- ---------- NFR-11 ----------
DO $$
DECLARE
  fn text;
  r text;
BEGIN
  FOREACH fn IN ARRAY ARRAY['public.save_lr_answers(uuid, jsonb)', 'public.save_writing_essays(uuid, jsonb)',
                            'public.lock_attempt_for_work(uuid)', 'public.awaits_expert(uuid)'] LOOP
    FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF has_function_privilege(r, fn, 'EXECUTE') THEN
        RAISE EXCEPTION 'FAIL  % can execute %', r, fn;
      END IF;
    END LOOP;
  END LOOP;
  RAISE NOTICE 'PASS  NFR-11 only service_role can save work';
END $$;

ROLLBACK;
