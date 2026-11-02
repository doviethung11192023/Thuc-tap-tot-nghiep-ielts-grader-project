-- =====================================================================
-- Chuyển dữ liệu public (schema cũ) → v2 (thiết kế 33 bảng)
-- ---------------------------------------------------------------------
-- Chạy SAU migration 20261102100000_v2_schema.sql, khi v2 chưa có đề nào.
--   Chạy thử (rollback):  psql "$SUPABASE_DB_URL" -v mode=dry -f supabase/scripts/v2_migrate_data_from_public.sql
--   Ghi thật:             psql "$SUPABASE_DB_URL" -v mode=commit -f ...
-- Chỉ ĐỌC public, chỉ GHI v2. Giữ nguyên UUID của user, đề, section, câu hỏi,
-- attempt, essay để đối chiếu với dữ liệu cũ.
-- Quyết định đã chốt với người dùng (2026-11-03):
--   * n22dccn050@student.ptithcm.edu.vn, test1@gmail.com: admin → learner (giữ bài làm)
--   * Attempt của Expert/Admin không chuyển (thiết kế: chỉ Learner làm bài)
--   * Writing: chỉ 6 đề cũ; ảnh Task 1 trỏ sang R2 (dataset/writing/tests/<id>/task1.jpg)
--   * 53 essay không có attempt (luồng topics cũ) không chuyển
--   * Không chuyển test_sets (bộ cũ gom 31 đề, không phải bộ Mock 4 kỹ năng),
--     system_settings cũ, content_generation_logs, evaluation_logs (lỗi gộp vào grading_runs.error)
-- =====================================================================
\set ON_ERROR_STOP on
\if :{?mode}
\else
  \set mode dry
\endif
BEGIN;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM v2.tests) THEN
    RAISE EXCEPTION 'v2 already has tests; this script must run on an empty v2';
  END IF;
END $$;

-- Tạm tắt các trigger chặn: đề được chép kèm trạng thái published, bài làm cũ có thể trỏ đề draft.
ALTER TABLE v2.attempts DISABLE TRIGGER check_attempt_start;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['tests', 'sections', 'lr_sections', 'writing_tasks', 'speaking_parts', 'question_groups',
                           'group_options', 'questions', 'question_options', 'question_keys', 'speaking_questions'] LOOP
    EXECUTE format('ALTER TABLE v2.%I DISABLE TRIGGER block_published_edit', t);
  END LOOP;
END $$;

-- ---------- bảng ánh xạ ----------
CREATE TEMP TABLE m_role_override (email text PRIMARY KEY, role v2.user_role) ON COMMIT DROP;
INSERT INTO m_role_override VALUES
  ('n22dccn050@student.ptithcm.edu.vn', 'learner'),
  ('test1@gmail.com', 'learner');

CREATE TEMP TABLE m_chart (source_url text PRIMARY KEY, r2_key text NOT NULL) ON COMMIT DROP;
INSERT INTO m_chart VALUES
  ('https://storage.googleapis.com/prep-storage-service/elements/elements/80e1f6d37efff7048ea34a35c2fd2ecd-1740709716.jpeg', 'dataset/writing/tests/10239/task1.jpg'),
  ('https://storage.googleapis.com/prep-storage-service/elements/elements/f0588a3ff13842ac4e01d16bbfe3ab9b-1741258652.jpeg', 'dataset/writing/tests/10346/task1.jpg'),
  ('https://storage.googleapis.com/prep-storage-service/elements/elements/50ecddf2374b91a639cb9473213964d9-1741919385.jpeg', 'dataset/writing/tests/10496/task1.jpg'),
  ('https://storage.googleapis.com/prep-storage-service/elements/elements/44911b7fc5ba4a25373c14ce720454a5-1742546695.jpeg', 'dataset/writing/tests/10647/task1.jpg'),
  ('https://storage.googleapis.com/prep-storage-service/elements/elements/4983380ba7ed6e73e4ab655d4adbea7e-1743154331.jpeg', 'dataset/writing/tests/10683/task1.jpg'),
  ('https://storage.googleapis.com/prep-storage-service/elements/elements/1be115d284bb4b030bcdd45de5f3dbce-1760002402.jpeg', 'dataset/writing/tests/19296/task1.jpg');

-- ---------- 1. NGƯỜI DÙNG ----------
-- Chỉ user có tài khoản Supabase Auth (profiles.id FK auth.users). 5 dòng public.users không có auth bị bỏ.
INSERT INTO v2.profiles (id, email, full_name, avatar_key, role, is_active, created_at)
SELECT u.id, coalesce(a.email, u.email), u.full_name, u.avatar_url,
       coalesce(o.role, CASE u.role::text WHEN 'student' THEN 'learner' ELSE u.role::text END::v2.user_role),
       coalesce(u.is_active, true), coalesce(u.created_at, now())
FROM public.users u
JOIN auth.users a ON a.id = u.id
LEFT JOIN m_role_override o ON o.email = u.email
ON CONFLICT (id) DO NOTHING;                         -- đã được trigger v2 tạo (đăng ký sau khi có v2)

INSERT INTO v2.learner_profiles (user_id, target_overall, target_listening, target_reading, target_writing,
                                 target_speaking, test_date, voice_consent_at)
SELECT p.id, g.target_overall, g.target_listening, g.target_reading, g.target_writing, g.target_speaking,
       g.test_date, u.voice_consent_at
FROM v2.profiles p
JOIN public.users u ON u.id = p.id
LEFT JOIN public.learner_goals g ON g.user_id = p.id
WHERE p.role = 'learner'
ON CONFLICT (user_id) DO UPDATE SET
  target_overall = EXCLUDED.target_overall, target_listening = EXCLUDED.target_listening,
  target_reading = EXCLUDED.target_reading, target_writing = EXCLUDED.target_writing,
  target_speaking = EXCLUDED.target_speaking, test_date = EXCLUDED.test_date,
  voice_consent_at = EXCLUDED.voice_consent_at;

INSERT INTO v2.expert_profiles (user_id, is_available, max_active_reviews, bio)
SELECT p.id, coalesce(e.is_available, false), coalesce(e.max_active_reviews, 5), e.bio
FROM v2.profiles p
LEFT JOIN public.expert_profiles e ON e.user_id = p.id
WHERE p.role = 'expert'
ON CONFLICT (user_id) DO UPDATE SET
  is_available = EXCLUDED.is_available, max_active_reviews = EXCLUDED.max_active_reviews, bio = EXCLUDED.bio;

-- Admin thay thế khi tác giả/người duyệt cũ không còn là admin trong v2
CREATE TEMP TABLE m_admin ON COMMIT DROP AS
SELECT coalesce(
  (SELECT p.id FROM v2.profiles p JOIN public.tests t ON t.reviewed_by = p.id WHERE p.role = 'admin' LIMIT 1),
  (SELECT id FROM v2.profiles WHERE role = 'admin' ORDER BY created_at LIMIT 1)) AS id;

-- ---------- 2. ĐỀ ----------
INSERT INTO v2.tests (id, title, skill, allowed_mode, status, version, duration_minutes, source_type,
                      source_name, license, author_id, author_role, reviewer_id, reviewer_role, reviewed_at, created_at)
SELECT t.id, t.title, t.skill::text::v2.skill, t.allowed_mode::text::v2.allowed_mode, st.status,
       coalesce(t.version, 1), t.duration_min,
       CASE t.origin::text WHEN 'open_license' THEN 'open_licence' ELSE 'original' END::v2.source_type,
       t.source_name, t.license,
       coalesce(au.id, (SELECT id FROM m_admin)), 'admin',
       CASE WHEN st.status <> 'draft' THEN coalesce(rv.id, (SELECT id FROM m_admin)) END,
       CASE WHEN st.status <> 'draft' THEN 'admin'::v2.user_role END,
       CASE WHEN st.status <> 'draft' THEN coalesce(t.reviewed_at, t.created_at, now()) END,
       coalesce(t.created_at, now())
FROM public.tests t
CROSS JOIN LATERAL (SELECT CASE t.status::text WHEN 'pending_review' THEN 'draft' ELSE t.status::text END::v2.content_status AS status) st
LEFT JOIN v2.profiles au ON au.id = t.created_by  AND au.role = 'admin'
LEFT JOIN v2.profiles rv ON rv.id = t.reviewed_by AND rv.role = 'admin';

UPDATE v2.tests n SET previous_version_id = t.parent_test_id
FROM public.tests t WHERE t.id = n.id AND t.parent_test_id IS NOT NULL;

INSERT INTO v2.sections (id, test_id, skill, kind, order_no, title)
SELECT s.id, s.test_id, t.skill,
       CASE t.skill WHEN 'writing' THEN 'writing' WHEN 'speaking' THEN 'speaking' ELSE 'lr' END::v2.section_kind,
       s.order_no, s.title
FROM public.test_sections s JOIN v2.tests t ON t.id = s.test_id;

INSERT INTO v2.lr_sections (section_id, passage, audio_key, transcript)
SELECT s.id, s.passage_text, s.audio_key, s.transcript
FROM public.test_sections s JOIN v2.sections n ON n.id = s.id AND n.kind = 'lr';

-- Writing: mỗi section có 1 nhóm writing_task1/2 với 1 câu hỏi chứa đề
INSERT INTO v2.writing_tasks (section_id, task_type, prompt_category, task_prompt, chart_image_key, min_words)
SELECT n.id, tt.task_type,
       nullif(btrim(substring(t.title FROM CASE tt.task_type WHEN 'task1' THEN 'WT1:\s*([^(+]+)' ELSE 'WT2:\s*([^(+]+)' END)), ''),
       q.prompt,
       CASE WHEN tt.task_type = 'task1' THEN coalesce(mc.r2_key, src.url) END,
       coalesce((g.content ->> 'min_words')::smallint, CASE tt.task_type WHEN 'task1' THEN 150 ELSE 250 END)
FROM v2.sections n
JOIN v2.tests t ON t.id = n.test_id
JOIN public.question_groups g ON g.section_id = n.id AND g.question_type::text IN ('writing_task1', 'writing_task2')
JOIN LATERAL (SELECT prompt FROM public.questions WHERE group_id = g.id ORDER BY number LIMIT 1) q ON true
CROSS JOIN LATERAL (SELECT (CASE WHEN g.question_type::text = 'writing_task1' THEN 'task1' ELSE 'task2' END)::v2.writing_task_type AS task_type) tt
CROSS JOIN LATERAL (SELECT coalesce(g.image_key, g.content ->> 'diagram_image_url') AS url) src
LEFT JOIN m_chart mc ON mc.source_url = src.url
WHERE n.kind = 'writing';

-- Speaking: section → part; thời gian lấy từ câu hỏi, mặc định theo BR-13
INSERT INTO v2.speaking_parts (section_id, topic, prep_seconds, answer_seconds)
SELECT n.id, n.title,
       coalesce(max(q.prep_time_sec), CASE WHEN bool_or(g.question_type::text = 'speaking_part2') THEN 60 ELSE 0 END),
       coalesce(max(q.answer_time_sec), CASE WHEN bool_or(g.question_type::text = 'speaking_part2') THEN 120
                                             WHEN bool_or(g.question_type::text = 'speaking_part3') THEN 90 ELSE 45 END)
FROM v2.sections n
LEFT JOIN public.question_groups g ON g.section_id = n.id
LEFT JOIN public.questions q ON q.group_id = g.id
WHERE n.kind = 'speaking'
GROUP BY n.id, n.title;

INSERT INTO v2.speaking_questions (id, speaking_part_id, order_no, prompt, audio_key)
SELECT q.id, g.section_id, row_number() OVER (PARTITION BY g.section_id ORDER BY g.order_no, q.number),
       q.prompt, q.prompt_audio_key
FROM public.questions q
JOIN public.question_groups g ON g.id = q.group_id
JOIN v2.speaking_parts p ON p.section_id = g.section_id;

-- Listening/Reading
INSERT INTO v2.question_groups (id, lr_section_id, order_no, question_type, subtype, instructions, template,
                                image_key, allow_reuse, max_words)
SELECT g.id, g.section_id, g.order_no, g.question_type::text::v2.question_type,
       coalesce(g.question_subtype, g.content ->> 'ui_question_type'), g.instructions, g.content ->> 'template',
       coalesce(g.image_key, g.content ->> 'diagram_image_url'),
       coalesce(g.content ->> 'ui_question_type', '') = 'matching_features',
       (SELECT max(max_words) FROM public.questions q WHERE q.group_id = g.id)
FROM public.question_groups g
JOIN v2.lr_sections l ON l.section_id = g.section_id
WHERE g.question_type::text IN ('multiple_choice', 'true_false_not_given', 'matching', 'completion', 'short_answer');

INSERT INTO v2.group_options (group_id, label, text)
SELECT g.id, o ->> 'key', coalesce(o ->> 'text', o ->> 'key')
FROM public.question_groups g
JOIN v2.question_groups n ON n.id = g.id
CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(g.content -> 'options_pool') = 'array'
                                             THEN g.content -> 'options_pool' ELSE '[]' END) o
WHERE o ->> 'key' IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO v2.questions (id, group_id, number, prompt)          -- lr_section_id: trigger fill_question_section
SELECT q.id, q.group_id, q.number, q.prompt
FROM public.questions q JOIN v2.question_groups g ON g.id = q.group_id;

INSERT INTO v2.question_options (question_id, label, text)
SELECT q.id, o ->> 'key', coalesce(o ->> 'text', o ->> 'key')
FROM public.questions q
JOIN v2.questions n ON n.id = q.id
CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(q.options) = 'array' THEN q.options ELSE '[]' END) o
WHERE o ->> 'key' IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO v2.question_keys (question_id, accepted_answers, explanation, evidence)
SELECT k.question_id, ARRAY(SELECT jsonb_array_elements_text(k.accepted_answers)), k.explanation, k.evidence
FROM public.question_answer_keys k JOIN v2.questions n ON n.id = k.question_id;

-- ---------- 3. BÀI LÀM (chỉ của Learner) ----------
CREATE TEMP TABLE m_attempt ON COMMIT DROP AS
SELECT a.*,
       CASE a.status::text WHEN 'scoring' THEN 'grading' WHEN 'scoring_failed' THEN 'grading_failed'
                           WHEN 'pending_expert' THEN 'waiting_expert' ELSE a.status::text END AS new_status,
       row_number() OVER (PARTITION BY a.user_id, a.test_id, (a.status = 'in_progress')
                          ORDER BY a.started_at DESC) AS open_rank
FROM public.test_attempts a
JOIN v2.learner_profiles l ON l.user_id = a.user_id;
-- uq_open_attempt: chỉ giữ 1 attempt in_progress / (learner, đề); bản cũ hơn → abandoned
UPDATE m_attempt SET new_status = 'abandoned' WHERE new_status = 'in_progress' AND open_rank > 1;

CREATE TEMP TABLE m_answer_stats ON COMMIT DROP AS
SELECT attempt_id, count(*) AS answered, count(*) FILTER (WHERE is_correct) AS correct
FROM public.attempt_answers GROUP BY attempt_id;

INSERT INTO v2.attempts (id, learner_id, test_id, skill, mode, status, started_at, deadline_at, submitted_at,
                         raw_score, question_count, lr_band)
SELECT a.id, a.user_id, a.test_id, a.skill::text::v2.skill, a.mode::text::v2.test_mode, a.new_status::v2.attempt_status,
       a.started_at, a.deadline_at, a.submitted_at,
       CASE WHEN a.skill IN ('listening', 'reading') AND s.answered IS NOT NULL THEN s.correct END,
       CASE WHEN a.skill IN ('listening', 'reading') AND s.answered IS NOT NULL THEN s.answered END,
       CASE WHEN a.skill IN ('listening', 'reading') AND s.answered = 40 THEN a.band END
FROM m_attempt a LEFT JOIN m_answer_stats s ON s.attempt_id = a.id;

-- Section mà mỗi attempt làm: L/R theo câu đã trả lời; Writing theo essay; còn lại: mọi section của đề
CREATE TEMP TABLE m_essay ON COMMIT DROP AS
SELECT e.*, r.raw_ai_response, r.overall_band AS r_band, r.task_response_score, r.coherence_cohesion_score,
       r.lexical_resource_score, r.grammar_accuracy_score, r.criteria_analysis, r.model, r.prompt_versions,
       r.trace_id, r.created_at AS r_created_at, r.id AS result_id,
       count(*) OVER (PARTITION BY e.attempt_id) AS n_in_attempt,
       row_number() OVER (PARTITION BY e.attempt_id ORDER BY e.submitted_at, e.word_count DESC, e.id) AS ord
FROM public.essays e
JOIN v2.attempts a ON a.id = e.attempt_id
LEFT JOIN public.evaluation_results r ON r.essay_id = e.id;
ALTER TABLE m_essay ADD COLUMN task_type v2.writing_task_type, ADD COLUMN section_id uuid, ADD COLUMN keep boolean;
-- Task: theo kết quả AI; không có thì theo thứ tự nộp (2 bài: task1 rồi task2; 1 bài: task2)
UPDATE m_essay SET task_type = coalesce(raw_ai_response ->> 'task_type',
                                        CASE WHEN n_in_attempt >= 2 AND ord = 1 THEN 'task1' ELSE 'task2' END)::v2.writing_task_type;
UPDATE m_essay e SET section_id = w.section_id
FROM v2.attempts a JOIN v2.sections s ON s.test_id = a.test_id JOIN v2.writing_tasks w ON w.section_id = s.id
WHERE a.id = e.attempt_id AND w.task_type = e.task_type;
-- Mỗi (attempt, task) giữ bản mới nhất
UPDATE m_essay e SET keep = (e.id = (SELECT x.id FROM m_essay x WHERE x.attempt_id = e.attempt_id AND x.section_id = e.section_id
                                     ORDER BY x.submitted_at DESC, x.id DESC LIMIT 1));

INSERT INTO v2.attempt_sections (attempt_id, section_id, test_id, started_at)
SELECT DISTINCT a.id, src.section_id, a.test_id, a.started_at
FROM v2.attempts a
CROSS JOIN LATERAL (
  SELECT g.section_id FROM public.attempt_answers aa
  JOIN public.questions q ON q.id = aa.question_id JOIN public.question_groups g ON g.id = q.group_id
  WHERE aa.attempt_id = a.id AND a.skill IN ('listening', 'reading')
  UNION
  SELECT e.section_id FROM m_essay e WHERE e.attempt_id = a.id AND e.keep AND e.section_id IS NOT NULL
  UNION
  SELECT s.id FROM v2.sections s
  WHERE s.test_id = a.test_id
    AND NOT EXISTS (SELECT 1 FROM public.attempt_answers aa WHERE aa.attempt_id = a.id)
    AND NOT EXISTS (SELECT 1 FROM m_essay e WHERE e.attempt_id = a.id AND e.keep AND e.section_id IS NOT NULL)
) src;

INSERT INTO v2.answers (attempt_id, question_id, section_id, answer, is_correct, updated_at)
SELECT aa.attempt_id, aa.question_id, n.lr_section_id,
       CASE jsonb_typeof(aa.answer)
         WHEN 'string' THEN aa.answer #>> '{}'
         WHEN 'array'  THEN (SELECT string_agg(x, ',') FROM jsonb_array_elements_text(aa.answer) x)
         ELSE aa.answer::text END,
       aa.is_correct, aa.updated_at
FROM public.attempt_answers aa
JOIN v2.attempts a ON a.id = aa.attempt_id
JOIN v2.questions n ON n.id = aa.question_id;

INSERT INTO v2.essays (id, attempt_id, section_id, content, updated_at)
SELECT id, attempt_id, section_id, coalesce(content, ''), coalesce(evaluated_at, submitted_at, now())
FROM m_essay WHERE keep AND section_id IS NOT NULL;

-- ---------- 4. KẾT QUẢ CHẤM (Writing, AI) ----------
-- 1 evaluation AI / attempt Writing có essay; 1 grading_run / essay
CREATE TEMP TABLE m_eval ON COMMIT DROP AS
SELECT a.id AS attempt_id, gen_random_uuid() AS evaluation_id, a.status, a.mode,
       bool_and(e.result_id IS NOT NULL) AS all_graded,
       bool_or(e.status::text = 'failed') AS any_failed,
       min(coalesce(e.r_created_at, e.submitted_at)) AS created_at,
       (SELECT band FROM public.test_attempts t WHERE t.id = a.id) AS old_band,
       v2.ielts_round(CASE WHEN count(*) FILTER (WHERE e.result_id IS NOT NULL) = 2
                           THEN (sum(e.r_band) FILTER (WHERE e.task_type = 'task1')
                                 + 2 * sum(e.r_band) FILTER (WHERE e.task_type = 'task2'))::numeric / 3
                           ELSE max(e.r_band)::numeric END) AS computed_band
FROM v2.attempts a JOIN m_essay e ON e.attempt_id = a.id AND e.keep AND e.section_id IS NOT NULL
WHERE a.skill = 'writing'
GROUP BY a.id, a.status, a.mode;

-- Attempt kẹt ở grading mà essay đã lỗi → grading_failed
UPDATE v2.attempts a SET status = 'grading_failed'
FROM m_eval m WHERE m.attempt_id = a.id AND a.status = 'grading' AND m.any_failed AND NOT m.all_graded;

INSERT INTO v2.evaluations (id, attempt_id, skill, evaluator_type, status, overall_band, is_official, created_at)
SELECT m.evaluation_id, m.attempt_id, 'writing', 'ai',
       st.status,
       CASE WHEN st.status = 'done' THEN coalesce(m.old_band, m.computed_band) END,
       st.status = 'done' AND a.status = 'scored',
       coalesce(m.created_at, now())
FROM m_eval m
JOIN v2.attempts a ON a.id = m.attempt_id
CROSS JOIN LATERAL (SELECT (CASE WHEN m.all_graded THEN 'done'
                                 WHEN a.status IN ('grading_failed') OR m.any_failed THEN 'failed'
                                 ELSE 'pending' END)::v2.evaluation_status AS status) st;

INSERT INTO v2.grading_runs (evaluation_id, task_no, status, model, prompt_versions, trace_id, error,
                             started_at, finished_at, output)
SELECT m.evaluation_id, CASE e.task_type WHEN 'task1' THEN 1 ELSE 2 END,
       CASE WHEN e.result_id IS NOT NULL THEN 'done' WHEN e.status::text = 'failed' THEN 'failed' ELSE 'running' END::v2.run_status,
       e.model, e.prompt_versions, e.trace_id,
       CASE WHEN e.result_id IS NULL THEN
         (SELECT l.error_message FROM public.evaluation_logs l WHERE l.essay_id = e.id AND l.error_message IS NOT NULL
          ORDER BY l.created_at DESC LIMIT 1) END,
       coalesce(e.r_created_at, e.submitted_at), CASE WHEN e.result_id IS NOT NULL OR e.status::text = 'failed'
                                                     THEN coalesce(e.r_created_at, e.evaluated_at, e.submitted_at) END,
       e.raw_ai_response
FROM m_essay e JOIN m_eval m ON m.attempt_id = e.attempt_id
WHERE e.keep AND e.section_id IS NOT NULL;

-- Nhận xét tiêu chí: gộp strengths / areas_to_improve
CREATE FUNCTION pg_temp.crit_comment(j jsonb) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT nullif(concat_ws(E'\n',
    CASE WHEN jsonb_typeof(j -> 'strengths') = 'array' AND jsonb_array_length(j -> 'strengths') > 0
         THEN 'Strengths: ' || (SELECT string_agg(x, '; ') FROM jsonb_array_elements_text(j -> 'strengths') x) END,
    CASE WHEN jsonb_typeof(j -> 'areas_to_improve') = 'array' AND jsonb_array_length(j -> 'areas_to_improve') > 0
         THEN 'To improve: ' || (SELECT string_agg(x, '; ') FROM jsonb_array_elements_text(j -> 'areas_to_improve') x) END), '')
$$;

INSERT INTO v2.criterion_scores (evaluation_id, criterion_id, task_no, skill, band, comment)
SELECT m.evaluation_id, c.id, CASE e.task_type WHEN 'task1' THEN 1 ELSE 2 END, 'writing',
       round(x.score::numeric * 2) / 2, pg_temp.crit_comment(x.analysis)
FROM m_essay e
JOIN m_eval m ON m.attempt_id = e.attempt_id
CROSS JOIN LATERAL (VALUES
  (CASE e.task_type WHEN 'task1' THEN 'TA' ELSE 'TR' END, e.task_response_score, e.criteria_analysis -> 'task_response'),
  ('CC',  e.coherence_cohesion_score, e.criteria_analysis -> 'coherence_cohesion'),
  ('LR',  e.lexical_resource_score,   e.criteria_analysis -> 'lexical_resource'),
  ('GRA', e.grammar_accuracy_score,   coalesce(e.criteria_analysis -> 'grammatical_range_and_accuracy',
                                               e.criteria_analysis -> 'grammar_accuracy'))
) x(code, score, analysis)
JOIN v2.criteria c ON c.skill = 'writing' AND c.code = x.code
WHERE e.keep AND e.result_id IS NOT NULL AND x.score IS NOT NULL;

INSERT INTO v2.annotations (evaluation_id, attempt_id, essay_id, type, category, title, original_text,
                            corrected_text, explanation, start_pos, end_pos)
SELECT m.evaluation_id, e.attempt_id, e.id, an.type::text::v2.annotation_type,
       CASE WHEN an.category::text = 'TR' AND e.task_type = 'task1' THEN 'TA' ELSE an.category::text END,
       an.title, an.original_text, an.corrected_text, an.explanation, an.position_start, an.position_end
FROM public.essay_annotations an
JOIN m_essay e ON e.id = an.essay_id AND e.keep AND e.result_id IS NOT NULL
JOIN m_eval m ON m.attempt_id = e.attempt_id
WHERE an.position_start >= 0 AND an.position_end >= an.position_start;

-- ---------- 5. HỆ THỐNG ----------
INSERT INTO v2.band_conversions (skill, raw_min, raw_max, band)
SELECT skill::text, raw_min, raw_max, band FROM public.band_conversions;

INSERT INTO v2.audit_logs (actor_type, admin_id, admin_role, action, entity, entity_id, before, after, created_at)
SELECT CASE WHEN p.id IS NOT NULL THEN 'admin' ELSE 'system' END::v2.actor_type,
       p.id, CASE WHEN p.id IS NOT NULL THEN 'admin'::v2.user_role END,
       l.action, l.entity, l.entity_id::text, l.before,
       CASE WHEN p.id IS NULL AND l.actor_id IS NOT NULL
            THEN coalesce(l.after, '{}'::jsonb) || jsonb_build_object('_legacy_actor_id', l.actor_id) ELSE l.after END,
       l.created_at
FROM public.audit_logs l
LEFT JOIN v2.profiles p ON p.id = l.actor_id AND p.role = 'admin';

-- Bật lại trigger
ALTER TABLE v2.attempts ENABLE TRIGGER check_attempt_start;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['tests', 'sections', 'lr_sections', 'writing_tasks', 'speaking_parts', 'question_groups',
                           'group_options', 'questions', 'question_options', 'question_keys', 'speaking_questions'] LOOP
    EXECUTE format('ALTER TABLE v2.%I ENABLE TRIGGER block_published_edit', t);
  END LOOP;
END $$;

-- ---------- 6. BÁO CÁO ----------
SELECT rpad(t, 22) || lpad(n::text, 6) AS "v2 rows"
FROM (VALUES
  ('profiles', (SELECT count(*) FROM v2.profiles)), ('learner_profiles', (SELECT count(*) FROM v2.learner_profiles)),
  ('expert_profiles', (SELECT count(*) FROM v2.expert_profiles)), ('tests', (SELECT count(*) FROM v2.tests)),
  ('sections', (SELECT count(*) FROM v2.sections)), ('lr_sections', (SELECT count(*) FROM v2.lr_sections)),
  ('writing_tasks', (SELECT count(*) FROM v2.writing_tasks)), ('speaking_parts', (SELECT count(*) FROM v2.speaking_parts)),
  ('speaking_questions', (SELECT count(*) FROM v2.speaking_questions)), ('question_groups', (SELECT count(*) FROM v2.question_groups)),
  ('group_options', (SELECT count(*) FROM v2.group_options)), ('questions', (SELECT count(*) FROM v2.questions)),
  ('question_options', (SELECT count(*) FROM v2.question_options)), ('question_keys', (SELECT count(*) FROM v2.question_keys)),
  ('attempts', (SELECT count(*) FROM v2.attempts)), ('attempt_sections', (SELECT count(*) FROM v2.attempt_sections)),
  ('answers', (SELECT count(*) FROM v2.answers)), ('essays', (SELECT count(*) FROM v2.essays)),
  ('evaluations', (SELECT count(*) FROM v2.evaluations)), ('grading_runs', (SELECT count(*) FROM v2.grading_runs)),
  ('criterion_scores', (SELECT count(*) FROM v2.criterion_scores)), ('annotations', (SELECT count(*) FROM v2.annotations)),
  ('band_conversions', (SELECT count(*) FROM v2.band_conversions)), ('audit_logs', (SELECT count(*) FROM v2.audit_logs))
) v(t, n);

SELECT :'mode' = 'commit' AS do_commit \gset
\if :do_commit
  COMMIT;
  \echo '>>> COMMITTED'
\else
  ROLLBACK;
  \echo '>>> DRY RUN: rolled back (run with -v mode=commit to keep)'
\endif
