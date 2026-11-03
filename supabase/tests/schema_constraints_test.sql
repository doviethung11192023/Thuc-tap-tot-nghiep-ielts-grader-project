-- =====================================================================
-- Test ràng buộc schema (source-of-truth §7, bảng 2.19: C1–C16, trigger, RLS)
-- Chạy trong 1 transaction rồi ROLLBACK: không để lại dữ liệu.
--   psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/schema_constraints_test.sql
-- Mỗi ca "phải lỗi" dùng expect_fail(); ca nào không lỗi → RAISE EXCEPTION.
-- =====================================================================
BEGIN;

CREATE FUNCTION pg_temp.expect_fail(label text, stmt text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE stmt;
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'PASS  % (%)', label, left(SQLERRM, 90);
    RETURN;
  END;
  RAISE EXCEPTION 'FAIL  % : statement succeeded but should have failed', label;
END $$;

CREATE FUNCTION pg_temp.expect_ok(label text, stmt text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE stmt;
  RAISE NOTICE 'PASS  %', label;
EXCEPTION WHEN others THEN
  RAISE EXCEPTION 'FAIL  % : %', label, SQLERRM;
END $$;

-- ---------- dữ liệu nền ----------
-- learner2 tự gửi role=admin qua user_metadata (người dùng kiểm soát) → vẫn phải là learner
INSERT INTO auth.users (id, email, raw_app_meta_data, raw_user_meta_data) VALUES
  ('00000000-0000-0000-0000-00000000000a', 'admin@t.test',   '{"role":"admin"}', '{}'),
  ('00000000-0000-0000-0000-0000000000e1', 'expert1@t.test', '{"role":"expert"}', '{}'),
  ('00000000-0000-0000-0000-0000000000e2', 'expert2@t.test', '{"role":"expert"}', '{}'),
  ('00000000-0000-0000-0000-0000000000b1', 'learner1@t.test', '{}', '{}'),
  ('00000000-0000-0000-0000-0000000000b2', 'learner2@t.test', '{}', '{"role":"admin"}');

DO $$ BEGIN
  IF (SELECT count(*) FROM public.profiles WHERE email LIKE '%@t.test') <> 5 THEN RAISE EXCEPTION 'FAIL handle_new_user: profiles'; END IF;
  IF (SELECT role FROM public.profiles WHERE email = 'learner2@t.test') <> 'learner' THEN RAISE EXCEPTION 'FAIL role taken from user_metadata'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.expert_profiles WHERE user_id = '00000000-0000-0000-0000-0000000000e1') THEN RAISE EXCEPTION 'FAIL expert subtype'; END IF;
  RAISE NOTICE 'PASS  handle_new_user creates profile + subtype, role only from app_metadata';
END $$;
UPDATE public.expert_profiles SET max_active_reviews = 1, is_available = true;

INSERT INTO public.test_sets (id, name) VALUES ('10000000-0000-0000-0000-000000000001', 'Set 1');
INSERT INTO public.tests (id, title, skill, allowed_mode, test_set_id, author_id, author_role) VALUES
  ('20000000-0000-0000-0000-00000000000a', 'Reading 1', 'reading', 'both', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'admin'),
  ('20000000-0000-0000-0000-00000000000b', 'Writing 1', 'writing', 'both', '10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'admin'),
  ('20000000-0000-0000-0000-00000000000c', 'Writing 2 (other set)', 'writing', 'practice', NULL, '00000000-0000-0000-0000-00000000000a', 'admin');
INSERT INTO public.sections (id, test_id, skill, kind, order_no) VALUES
  ('30000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-00000000000a', 'reading', 'lr', 1),
  ('30000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-00000000000b', 'writing', 'writing', 1),
  ('30000000-0000-0000-0000-0000000000b2', '20000000-0000-0000-0000-00000000000b', 'writing', 'writing', 2),
  ('30000000-0000-0000-0000-0000000000c1', '20000000-0000-0000-0000-00000000000c', 'writing', 'writing', 1);
INSERT INTO public.lr_sections (section_id, passage) VALUES ('30000000-0000-0000-0000-0000000000a1', 'passage');
INSERT INTO public.writing_tasks (section_id, task_type, task_prompt, min_words) VALUES
  ('30000000-0000-0000-0000-0000000000b1', 'task1', 'Describe the chart', 150),
  ('30000000-0000-0000-0000-0000000000b2', 'task2', 'Discuss both views', 250),
  ('30000000-0000-0000-0000-0000000000c1', 'task2', 'Agree or disagree', 250);
INSERT INTO public.question_groups (id, lr_section_id, order_no, question_type) VALUES
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-0000000000a1', 1, 'completion');
INSERT INTO public.questions (id, group_id, number, prompt) VALUES
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 1, 'Q1');
INSERT INTO public.question_keys (question_id, accepted_answers) VALUES ('50000000-0000-0000-0000-000000000001', '{library}');

DO $$ BEGIN
  IF (SELECT lr_section_id FROM public.questions WHERE id = '50000000-0000-0000-0000-000000000001') <> '30000000-0000-0000-0000-0000000000a1'
  THEN RAISE EXCEPTION 'FAIL fill_question_section'; END IF;
  RAISE NOTICE 'PASS  fill_question_section';
END $$;

-- C1: kiểu section khớp skill
SELECT pg_temp.expect_fail('C1a section kind <> skill',
  $$INSERT INTO public.sections (test_id, skill, kind, order_no) VALUES ('20000000-0000-0000-0000-00000000000a', 'reading', 'writing', 9)$$);
SELECT pg_temp.expect_fail('C1b section skill <> test skill',
  $$INSERT INTO public.sections (test_id, skill, kind, order_no) VALUES ('20000000-0000-0000-0000-00000000000a', 'writing', 'writing', 9)$$);
SELECT pg_temp.expect_fail('C1c writing_tasks on an lr section',
  $$INSERT INTO public.writing_tasks (section_id, task_type, task_prompt, min_words) VALUES ('30000000-0000-0000-0000-0000000000a1', 'task1', 'x', 150)$$);

-- C12: chỉ làm đề đã publish, đúng mode
SELECT pg_temp.expect_fail('C12a attempt on draft test',
  $$INSERT INTO public.attempts (learner_id, test_id, skill, mode) VALUES ('00000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-00000000000b', 'writing', 'practice')$$);

SELECT pg_temp.expect_fail('BR-18 publish without reviewer',
  $$UPDATE public.tests SET status = 'published' WHERE id = '20000000-0000-0000-0000-00000000000a'$$);
UPDATE public.tests SET status = 'published', reviewer_id = '00000000-0000-0000-0000-00000000000a', reviewer_role = 'admin', reviewed_at = now()
WHERE id::text LIKE '20000000-%';
UPDATE public.test_sets SET status = 'published' WHERE id = '10000000-0000-0000-0000-000000000001';

SELECT pg_temp.expect_fail('C12b mock on practice-only test',
  $$INSERT INTO public.attempts (learner_id, test_id, skill, mode, deadline_at) VALUES ('00000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-00000000000c', 'writing', 'mock', now() + interval '1 hour')$$);

-- BR-10: nội dung đề đã publish bị khoá
SELECT pg_temp.expect_fail('BR-10a edit published test title',
  $$UPDATE public.tests SET title = 'changed' WHERE id = '20000000-0000-0000-0000-00000000000a'$$);
SELECT pg_temp.expect_fail('BR-10b edit question of published test',
  $$UPDATE public.questions SET prompt = 'changed' WHERE id = '50000000-0000-0000-0000-000000000001'$$);
SELECT pg_temp.expect_fail('BR-10c add question to published test',
  $$INSERT INTO public.questions (group_id, number) VALUES ('40000000-0000-0000-0000-000000000001', 2)$$);
SELECT pg_temp.expect_fail('BR-10d change answer key of published test',
  $$UPDATE public.question_keys SET accepted_answers = '{x}' WHERE question_id = '50000000-0000-0000-0000-000000000001'$$);
SELECT pg_temp.expect_fail('BR-10e delete published test',
  $$DELETE FROM public.tests WHERE id = '20000000-0000-0000-0000-00000000000a'$$);

-- C3: mock session
INSERT INTO public.mock_sessions (id, learner_id, test_set_id) VALUES
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-000000000001');
INSERT INTO public.attempts (id, learner_id, test_id, skill, mode, mock_session_id, deadline_at) VALUES
  ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-00000000000b', 'writing', 'mock',
   '60000000-0000-0000-0000-000000000001', now() + interval '1 hour');
SELECT pg_temp.expect_fail('C3a second writing attempt in same session',
  $$INSERT INTO public.attempts (learner_id, test_id, skill, mode, mock_session_id, deadline_at) VALUES ('00000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-00000000000c', 'writing', 'mock', '60000000-0000-0000-0000-000000000001', now() + interval '1 hour')$$);
SELECT pg_temp.expect_fail('C3b another learner''s session',
  $$INSERT INTO public.attempts (learner_id, test_id, skill, mode, mock_session_id, deadline_at) VALUES ('00000000-0000-0000-0000-0000000000b2', '20000000-0000-0000-0000-00000000000a', 'reading', 'mock', '60000000-0000-0000-0000-000000000001', now() + interval '1 hour')$$);
SELECT pg_temp.expect_fail('uq_open_attempt: 2 open attempts of same test',
  $$INSERT INTO public.attempts (learner_id, test_id, skill, mode, deadline_at) VALUES ('00000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-00000000000b', 'writing', 'mock', now() + interval '1 hour')$$);

-- C2 + C14: section thuộc đúng đề, 1 essay / task
INSERT INTO public.attempt_sections (attempt_id, section_id, test_id) VALUES
  ('70000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-00000000000b'),
  ('70000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-0000000000b2', '20000000-0000-0000-0000-00000000000b');
SELECT pg_temp.expect_fail('C2a attempt_section from another test',
  $$INSERT INTO public.attempt_sections (attempt_id, section_id, test_id) VALUES ('70000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-0000000000c1', '20000000-0000-0000-0000-00000000000c')$$);
INSERT INTO public.essays (id, attempt_id, section_id, content) VALUES
  ('80000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-0000000000b1', 'The chart shows  three
 trends.'),
  ('80000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-0000000000b2', '');
DO $$ BEGIN
  IF (SELECT word_count FROM public.essays WHERE id = '80000000-0000-0000-0000-000000000001') <> 5
     OR (SELECT word_count FROM public.essays WHERE id = '80000000-0000-0000-0000-000000000002') <> 0
  THEN RAISE EXCEPTION 'FAIL word_count generated column'; END IF;
  RAISE NOTICE 'PASS  word_count generated column';
END $$;
SELECT pg_temp.expect_fail('C14 second essay for the same task',
  $$INSERT INTO public.essays (attempt_id, section_id) VALUES ('70000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-0000000000b1')$$);
SELECT pg_temp.expect_fail('C2b essay on a section not in the attempt',
  $$INSERT INTO public.essays (attempt_id, section_id) VALUES ('70000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-0000000000c1')$$);

-- L/R attempt cho C4
INSERT INTO public.attempts (id, learner_id, test_id, skill, mode) VALUES
  ('70000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-00000000000a', 'reading', 'practice');
SELECT pg_temp.expect_fail('BR-03 lr_band without 40 questions',
  $$UPDATE public.attempts SET raw_score = 1, question_count = 1, lr_band = 5 WHERE id = '70000000-0000-0000-0000-000000000002'$$);
SELECT pg_temp.expect_fail('BR-01 band 6.3',
  $$UPDATE public.attempts SET raw_score = 30, question_count = 40, lr_band = 6.3 WHERE id = '70000000-0000-0000-0000-000000000002'$$);

-- C4: chỉ W/S mới có evaluation và review request
SELECT pg_temp.expect_fail('C4a evaluation on reading attempt',
  $$INSERT INTO public.evaluations (attempt_id, skill, evaluator_type, status) VALUES ('70000000-0000-0000-0000-000000000002', 'reading', 'ai', 'pending')$$);
SELECT pg_temp.expect_fail('C4b evaluation skill mismatch',
  $$INSERT INTO public.evaluations (attempt_id, skill, evaluator_type, status) VALUES ('70000000-0000-0000-0000-000000000002', 'writing', 'ai', 'pending')$$);
SELECT pg_temp.expect_fail('C4c review request from another learner',
  $$INSERT INTO public.review_requests (attempt_id, learner_id, skill) VALUES ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b2', 'writing')$$);

-- Đánh giá AI cho bài Writing
INSERT INTO public.evaluations (id, attempt_id, skill, evaluator_type, status) VALUES
  ('90000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 'writing', 'ai', 'pending');
INSERT INTO public.grading_runs (evaluation_id, task_no, model) VALUES ('90000000-0000-0000-0000-000000000001', 1, 'qwen');
SELECT pg_temp.expect_fail('grading_run on expert evaluation type',
  $$INSERT INTO public.grading_runs (evaluation_id, evaluator_type, task_no) VALUES ('90000000-0000-0000-0000-000000000001', 'expert', 1)$$);

-- C6: tiêu chí đúng skill / task
SELECT pg_temp.expect_ok('C6 TA on task 1',
  $$INSERT INTO public.criterion_scores (evaluation_id, criterion_id, task_no, skill, band) SELECT '90000000-0000-0000-0000-000000000001', id, 1, 'writing', 6.5 FROM public.criteria WHERE code = 'TA'$$);
SELECT pg_temp.expect_fail('C6a TA on task 2',
  $$INSERT INTO public.criterion_scores (evaluation_id, criterion_id, task_no, skill, band) SELECT '90000000-0000-0000-0000-000000000001', id, 2, 'writing', 6.5 FROM public.criteria WHERE code = 'TA'$$);
SELECT pg_temp.expect_fail('C6b speaking criterion on writing evaluation',
  $$INSERT INTO public.criterion_scores (evaluation_id, criterion_id, task_no, skill, band) SELECT '90000000-0000-0000-0000-000000000001', id, 1, 'writing', 6.5 FROM public.criteria WHERE code = 'FC'$$);

SELECT pg_temp.expect_fail('annotation on essay of another attempt',
  $$INSERT INTO public.annotations (evaluation_id, attempt_id, essay_id, type, category, original_text, explanation, start_pos, end_pos) VALUES ('90000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002', '80000000-0000-0000-0000-000000000001', 'error', 'GRA', 'x', 'y', 0, 1)$$);
INSERT INTO public.annotations (evaluation_id, attempt_id, essay_id, type, category, original_text, explanation, start_pos, end_pos)
VALUES ('90000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001', 'error', 'GRA', 'shows', 'ok', 10, 15);

SELECT pg_temp.expect_fail('official evaluation must be done',
  $$UPDATE public.evaluations SET is_official = true WHERE id = '90000000-0000-0000-0000-000000000001'$$);
UPDATE public.evaluations SET status = 'done', overall_band = 6.5 WHERE id = '90000000-0000-0000-0000-000000000001';
UPDATE public.attempts SET status = 'waiting_expert', submitted_at = now() WHERE id = '70000000-0000-0000-0000-000000000001';
SELECT pg_temp.expect_fail('waiting_expert on practice attempt',
  $$UPDATE public.attempts SET status = 'waiting_expert' WHERE id = '70000000-0000-0000-0000-000000000002'$$);

-- C11 + C10 + C9 + capacity: yêu cầu Expert và assignment
INSERT INTO public.review_requests (id, attempt_id, learner_id, skill) VALUES
  ('a0000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'writing');
SELECT pg_temp.expect_fail('C11 second open request for the attempt',
  $$INSERT INTO public.review_requests (attempt_id, learner_id, skill) VALUES ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1', 'writing')$$);
INSERT INTO public.review_assignments (id, request_id, attempt_id, expert_id, due_at) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000e1', now() + interval '48 hours');
SELECT pg_temp.expect_fail('C10 second open assignment for the request',
  $$INSERT INTO public.review_assignments (request_id, attempt_id, expert_id, due_at) VALUES ('a0000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000e2', now() + interval '48 hours')$$);
SELECT pg_temp.expect_fail('check_expert_capacity (max 1)',
  $$INSERT INTO public.review_assignments (request_id, attempt_id, expert_id, due_at) SELECT 'a0000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000e1', now() + interval '48 hours'$$);

-- Expert evaluation (bản nháp) gắn vào assignment
INSERT INTO public.evaluations (id, attempt_id, skill, evaluator_type, status) VALUES
  ('90000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001', 'writing', 'expert', 'draft');
SELECT pg_temp.expect_fail('C9 assignment → AI evaluation',
  $$UPDATE public.review_assignments SET evaluation_id = '90000000-0000-0000-0000-000000000001' WHERE id = 'b0000000-0000-0000-0000-000000000001'$$);
SELECT pg_temp.expect_ok('C9 assignment → expert evaluation of same attempt',
  $$UPDATE public.review_assignments SET evaluation_id = '90000000-0000-0000-0000-000000000002', started_at = now() WHERE id = 'b0000000-0000-0000-0000-000000000001'$$);

-- RLS: Expert chưa nộp → không thấy điểm AI (C13); Learner chưa thấy bản không chính thức
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', true);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.evaluations WHERE id = '90000000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'FAIL C13 expert sees AI before submit'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.evaluations WHERE id = '90000000-0000-0000-0000-000000000002') THEN RAISE EXCEPTION 'FAIL expert cannot see own draft'; END IF;
  RAISE NOTICE 'PASS  C13 expert cannot read AI evaluation before submitting';
END $$;
RESET ROLE;

-- Expert nộp (giống finalize_expert_evaluation): Expert thành chính thức
UPDATE public.criterion_scores SET band = band;  -- no-op
UPDATE public.evaluations SET status = 'done', overall_band = 7.0, submitted_at = now(), is_official = true
WHERE id = '90000000-0000-0000-0000-000000000002';
UPDATE public.review_assignments SET ended_at = now(), end_reason = 'completed' WHERE id = 'b0000000-0000-0000-0000-000000000001';
UPDATE public.review_requests SET status = 'completed' WHERE id = 'a0000000-0000-0000-0000-000000000001';
UPDATE public.attempts SET status = 'scored' WHERE id = '70000000-0000-0000-0000-000000000001';

-- C5: AI không thể thành chính thức khi đã có Expert chính thức
SELECT pg_temp.expect_fail('C5a AI official while Expert official',
  $$UPDATE public.evaluations SET is_official = true WHERE id = '90000000-0000-0000-0000-000000000001'$$);
SELECT pg_temp.expect_fail('C5b two official evaluations',
  $$INSERT INTO public.evaluations (attempt_id, skill, evaluator_type, status, overall_band, is_official) VALUES ('70000000-0000-0000-0000-000000000001', 'writing', 'expert', 'done', 6, true)$$);

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', true);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.evaluations WHERE id = '90000000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'FAIL C13 expert cannot see AI after submit'; END IF;
  RAISE NOTICE 'PASS  C13 expert reads AI evaluation after submitting';
END $$;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.evaluations) <> 1 THEN RAISE EXCEPTION 'FAIL learner should see only the official evaluation'; END IF;
  IF EXISTS (SELECT 1 FROM public.question_keys) THEN RAISE EXCEPTION 'FAIL C8 learner reads answer keys'; END IF;
  IF (SELECT band FROM public.attempt_results WHERE attempt_id = '70000000-0000-0000-0000-000000000001') <> 7.0 THEN RAISE EXCEPTION 'FAIL attempt_results band'; END IF;
  RAISE NOTICE 'PASS  learner RLS: own official evaluation only, no question_keys (C8), attempt_results';
END $$;
SELECT pg_temp.expect_fail('NFR-11 learner cannot write',
  $$UPDATE public.profiles SET role = 'admin' WHERE id = '00000000-0000-0000-0000-0000000000b1'$$);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b2', true);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.attempts WHERE learner_id = '00000000-0000-0000-0000-0000000000b1') THEN RAISE EXCEPTION 'FAIL other learner sees attempts'; END IF;
  RAISE NOTICE 'PASS  learner cannot read another learner''s attempts';
END $$;
RESET ROLE;

-- C15: khoảng quy đổi band không chồng nhau
DELETE FROM public.band_conversions WHERE skill = 'reading';   -- seed có sẵn; transaction sẽ rollback
INSERT INTO public.band_conversions (skill, raw_min, raw_max, band) VALUES ('reading', 39, 40, 9);
SELECT pg_temp.expect_fail('C15 overlapping band range',
  $$INSERT INTO public.band_conversions (skill, raw_min, raw_max, band) VALUES ('reading', 37, 39, 8.5)$$);

-- C16: audit actor
SELECT pg_temp.expect_ok('C16 system audit entry',
  $$INSERT INTO public.audit_logs (actor_type, action, entity) VALUES ('system', 'auto_submit', 'attempts')$$);
SELECT pg_temp.expect_fail('C16a system entry with an admin id',
  $$INSERT INTO public.audit_logs (actor_type, admin_id, admin_role, action, entity) VALUES ('system', '00000000-0000-0000-0000-00000000000a', 'admin', 'x', 'y')$$);
SELECT pg_temp.expect_fail('C16b admin entry by a learner',
  $$INSERT INTO public.audit_logs (actor_type, admin_id, admin_role, action, entity) VALUES ('admin', '00000000-0000-0000-0000-0000000000b1', 'admin', 'x', 'y')$$);

SELECT public.ielts_round(6.125) = 6.0 AND public.ielts_round(6.25) = 6.5 AND public.ielts_round(6.625) = 6.5
       AND public.ielts_round(6.75) = 7.0 AS "BR-02 ielts_round ok";

ROLLBACK;
