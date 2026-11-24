-- =====================================================================
-- Lưu bài lên server, tự nộp khi hết giờ, và các ràng buộc toàn vẹn còn thiếu (rà soát 2026-11-09).
--
--   A. Practice không có trạng thái abandoned (máy trạng thái attempts.status)
--   B. Lưu bài lên server (FR-11, NFR-03) + đánh dấu bài tự nộp (FR-12, BR-21; spec 004)
--   C. Nộp bài: khoá attempt → ghi bài → đổi trạng thái; nộp không kèm bài thì chấm bài đã lưu
--   D. Đáp án và bài viết không đổi được sau khi nộp
--   E. Kết quả chấm và audit log không bị ghi đè (BR-08, FR-37)
--   F. Learner không đọc được transcript Listening trước khi nộp (ràng buộc 8)
--   G. Mock có yêu cầu Expert đang mở: điểm AI chỉ là preliminary (BR-08, BR-15)
--
-- Chạy: psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -1 -f <file này>
-- =====================================================================

-- A. ----------------------------------------------------------------------------------
-- Practice đang dở mà Learner huỷ thì xoá hẳn; chỉ Mock mới có abandoned. Dòng cũ là dữ liệu của code
-- trước khi sửa luồng huỷ, chưa nộp nên không có kết quả chấm nào bị mất.
DELETE FROM public.attempts WHERE mode = 'practice' AND status = 'abandoned';
ALTER TABLE public.attempts
  ADD CONSTRAINT attempts_abandoned_mock_only CHECK (status <> 'abandoned' OR mode = 'mock');


-- B. ----------------------------------------------------------------------------------
ALTER TABLE public.attempts
  ADD COLUMN auto_submitted boolean NOT NULL DEFAULT false,
  ADD CONSTRAINT attempts_auto_submit_mock_only CHECK (NOT auto_submitted OR mode = 'mock');

CREATE INDEX idx_answers_attempt ON public.answers (attempt_id);

-- Khoá attempt và kiểm còn nhận bài: đang làm, chưa quá deadline + ân hạn (BR-07).
CREATE FUNCTION public.lock_attempt_for_work(p_attempt_id uuid) RETURNS public.attempts
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v public.attempts%ROWTYPE;
  v_grace integer;
BEGIN
  SELECT * INTO v FROM public.attempts WHERE id = p_attempt_id FOR UPDATE;
  IF NOT FOUND OR v.status <> 'in_progress' THEN
    RAISE EXCEPTION 'attempt_closed' USING ERRCODE = 'check_violation';
  END IF;
  SELECT (value #>> '{}')::integer INTO v_grace FROM public.system_settings WHERE key = 'late_answer_grace_seconds';
  IF v.deadline_at IS NOT NULL AND now() > v.deadline_at + make_interval(secs => coalesce(v_grace, 30)) THEN
    RAISE EXCEPTION 'deadline_passed' USING ERRCODE = 'check_violation';
  END IF;
  RETURN v;
END $$;

-- Tự lưu đáp án L/R. p_answers: [{"question_id", "section_id", "answer"}]; is_correct chỉ có khi nộp.
CREATE FUNCTION public.save_lr_answers(p_attempt_id uuid, p_answers jsonb) RETURNS timestamptz
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v public.attempts%ROWTYPE := public.lock_attempt_for_work(p_attempt_id);
BEGIN
  INSERT INTO public.attempt_sections (attempt_id, section_id, test_id, started_at)
  SELECT DISTINCT p_attempt_id, (a ->> 'section_id')::uuid, v.test_id, v.started_at
    FROM jsonb_array_elements(p_answers) AS a
  ON CONFLICT (attempt_id, section_id) DO NOTHING;

  INSERT INTO public.answers (attempt_id, question_id, section_id, answer, is_correct, updated_at)
  SELECT p_attempt_id, (a ->> 'question_id')::uuid, (a ->> 'section_id')::uuid, a ->> 'answer', NULL, now()
    FROM jsonb_array_elements(p_answers) AS a
  ON CONFLICT (attempt_id, question_id) DO UPDATE
    SET answer = EXCLUDED.answer, section_id = EXCLUDED.section_id, updated_at = EXCLUDED.updated_at;
  RETURN now();
END $$;

-- Tự lưu bài viết. p_tasks: [{"section_id", "content"}].
CREATE FUNCTION public.save_writing_essays(p_attempt_id uuid, p_tasks jsonb) RETURNS timestamptz
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v public.attempts%ROWTYPE := public.lock_attempt_for_work(p_attempt_id);
BEGIN
  INSERT INTO public.attempt_sections (attempt_id, section_id, test_id, started_at)
  SELECT p_attempt_id, (t ->> 'section_id')::uuid, v.test_id, v.started_at
    FROM jsonb_array_elements(p_tasks) AS t
  ON CONFLICT (attempt_id, section_id) DO NOTHING;

  INSERT INTO public.essays (attempt_id, section_id, content, updated_at)
  SELECT p_attempt_id, (t ->> 'section_id')::uuid, coalesce(t ->> 'content', ''), now()
    FROM jsonb_array_elements(p_tasks) AS t
  ON CONFLICT (attempt_id, section_id) DO UPDATE
    SET content = EXCLUDED.content, updated_at = EXCLUDED.updated_at;
  RETURN now();
END $$;


-- C. ----------------------------------------------------------------------------------
-- Thứ tự mới trong mọi function nộp: khoá dòng attempt đang in_progress (lần nộp thứ hai hoặc nộp đồng
-- thời nhận NULL) → ghi bài → đổi trạng thái. Ghi bài trước khi đóng attempt để trigger ở mục D chặn được
-- mọi lần ghi sau khi đóng. p_auto = true khi cron tự nộp bài Mock quá hạn.
DROP FUNCTION public.submit_writing_attempt(uuid, jsonb);
DROP FUNCTION public.submit_speaking_attempt(uuid);
DROP FUNCTION public.submit_lr_attempt(uuid, uuid[], jsonb, integer, integer, numeric);

-- p_tasks NULL: chấm các bài đã lưu (tự nộp, hoặc nộp muộn). Chấm mọi task có nội dung.
-- Không task nào có chữ: Mock thành abandoned (không có gì để chấm), Practice báo lỗi.
CREATE FUNCTION public.submit_writing_attempt(p_attempt_id uuid, p_tasks jsonb, p_auto boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v public.attempts%ROWTYPE;
  v_now timestamptz := now();
  v_task_nos smallint[];
  v_essays jsonb;
  v_job jsonb;
BEGIN
  SELECT * INTO v FROM public.attempts WHERE id = p_attempt_id AND status = 'in_progress' FOR UPDATE;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF p_tasks IS NOT NULL THEN
    INSERT INTO public.attempt_sections (attempt_id, section_id, test_id, started_at)
    SELECT p_attempt_id, (t ->> 'section_id')::uuid, v.test_id, v.started_at
      FROM jsonb_array_elements(p_tasks) AS t
    ON CONFLICT (attempt_id, section_id) DO NOTHING;
    INSERT INTO public.essays (attempt_id, section_id, content, updated_at)
    SELECT p_attempt_id, (t ->> 'section_id')::uuid, coalesce(t ->> 'content', ''), v_now
      FROM jsonb_array_elements(p_tasks) AS t
    ON CONFLICT (attempt_id, section_id) DO UPDATE
      SET content = EXCLUDED.content, updated_at = EXCLUDED.updated_at;
  END IF;

  SELECT array_agg(CASE w.task_type WHEN 'task1' THEN 1 ELSE 2 END::smallint ORDER BY w.task_type),
         jsonb_agg(jsonb_build_object('task_no', CASE w.task_type WHEN 'task1' THEN 1 ELSE 2 END,
                                      'essay_id', e.id, 'word_count', e.word_count) ORDER BY w.task_type)
    INTO v_task_nos, v_essays
    FROM public.essays e JOIN public.writing_tasks w ON w.section_id = e.section_id
   WHERE e.attempt_id = p_attempt_id AND btrim(e.content) <> '';

  UPDATE public.attempt_sections SET finished_at = v_now WHERE attempt_id = p_attempt_id;

  IF v_task_nos IS NULL THEN
    IF v.mode = 'practice' THEN
      RAISE EXCEPTION 'empty_submission' USING ERRCODE = 'check_violation';
    END IF;
    UPDATE public.attempts SET status = 'abandoned', auto_submitted = p_auto WHERE id = p_attempt_id;
    RETURN jsonb_build_object('status', 'abandoned', 'essays', '[]'::jsonb, 'runs', '[]'::jsonb);
  END IF;

  UPDATE public.attempts SET status = 'grading', submitted_at = v_now, auto_submitted = p_auto
   WHERE id = p_attempt_id;
  v_job := public.create_ai_grading_job(p_attempt_id, 'writing', v_task_nos);
  RETURN v_job || jsonb_build_object('status', 'grading', 'submitted_at', v_now, 'essays', v_essays);
END $$;

-- Chỉ các câu đã confirm được chấm; không có câu nào thì no_speech, không tạo job.
CREATE FUNCTION public.submit_speaking_attempt(p_attempt_id uuid, p_auto boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_now timestamptz := now();
  v_has_speech boolean;
  v_status public.attempt_status;
  v_job jsonb := NULL;
BEGIN
  PERFORM 1 FROM public.attempts WHERE id = p_attempt_id AND status = 'in_progress' FOR UPDATE;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_has_speech := EXISTS (SELECT 1 FROM public.speaking_responses
                           WHERE attempt_id = p_attempt_id AND confirmed_at IS NOT NULL);
  v_status := CASE WHEN v_has_speech THEN 'grading' ELSE 'no_speech' END;
  UPDATE public.attempts SET status = v_status, submitted_at = v_now, auto_submitted = p_auto
   WHERE id = p_attempt_id;

  IF v_has_speech THEN
    UPDATE public.attempt_sections SET finished_at = v_now
     WHERE attempt_id = p_attempt_id
       AND section_id IN (SELECT section_id FROM public.speaking_responses
                           WHERE attempt_id = p_attempt_id AND confirmed_at IS NOT NULL);
    v_job := public.create_ai_grading_job(p_attempt_id, 'speaking', NULL);
  END IF;
  RETURN jsonb_build_object('status', v_status, 'submitted_at', v_now, 'job', v_job);
END $$;

-- Core API chuẩn hoá và so đáp án (BR-14) rồi gửi is_correct. Điểm thô, số câu và band do DB tự tính
-- từ chính các dòng vừa ghi và bảng quy đổi (BR-03), không tin số do bên gọi truyền vào.
-- p_raw_score, p_question_count, p_band giữ trong chữ ký để Core API bản cũ vẫn gọi được.
CREATE FUNCTION public.submit_lr_attempt(p_attempt_id uuid, p_section_ids uuid[], p_answers jsonb,
                                         p_raw_score integer, p_question_count integer, p_band numeric,
                                         p_auto boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v public.attempts%ROWTYPE;
  v_now timestamptz := now();
  v_raw integer;
  v_count integer;
  v_band numeric;
BEGIN
  SELECT * INTO v FROM public.attempts WHERE id = p_attempt_id AND status = 'in_progress' FOR UPDATE;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.attempt_sections (attempt_id, section_id, test_id, started_at, finished_at)
  SELECT p_attempt_id, s.section_id, v.test_id, v.started_at, v_now
    FROM unnest(p_section_ids) AS s(section_id)
  ON CONFLICT (attempt_id, section_id) DO UPDATE SET finished_at = EXCLUDED.finished_at;

  INSERT INTO public.answers (attempt_id, question_id, section_id, answer, is_correct, updated_at)
  SELECT p_attempt_id, (a ->> 'question_id')::uuid, (a ->> 'section_id')::uuid, a ->> 'answer',
         (a ->> 'is_correct')::boolean, v_now
    FROM jsonb_array_elements(p_answers) AS a
  ON CONFLICT (attempt_id, question_id) DO UPDATE
    SET section_id = EXCLUDED.section_id, answer = EXCLUDED.answer,
        is_correct = EXCLUDED.is_correct, updated_at = EXCLUDED.updated_at;

  SELECT count(*) INTO v_count FROM public.questions WHERE lr_section_id = ANY (p_section_ids);
  SELECT count(*) FILTER (WHERE is_correct) INTO v_raw
    FROM public.answers WHERE attempt_id = p_attempt_id AND section_id = ANY (p_section_ids);
  IF v_count = 40 THEN
    SELECT band INTO v_band FROM public.band_conversions
     WHERE skill = v.skill::text AND v_raw BETWEEN raw_min AND raw_max;
    IF v_band IS NULL THEN
      RAISE EXCEPTION 'band_conversions has no row for % raw score %', v.skill, v_raw
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  UPDATE public.attempts
     SET status = 'scored', submitted_at = v_now, auto_submitted = p_auto,
         raw_score = v_raw, question_count = v_count, lr_band = v_band
   WHERE id = p_attempt_id
  RETURNING * INTO v;
  RETURN to_jsonb(v);
END $$;


-- D. ----------------------------------------------------------------------------------
-- Đáp án và bài viết chỉ ghi được khi attempt còn in_progress. Khi xoá attempt (Practice đang dở),
-- dòng cha đã bị xoá trước khi cascade chạy nên không bị chặn.
CREATE FUNCTION public.block_closed_attempt_work() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_attempt uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.attempt_id ELSE NEW.attempt_id END;
BEGIN
  IF EXISTS (SELECT 1 FROM public.attempts WHERE id = v_attempt AND status <> 'in_progress') THEN
    RAISE EXCEPTION '% of attempt % cannot change after submission', TG_TABLE_NAME, v_attempt
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER block_closed_attempt_work BEFORE INSERT OR UPDATE OR DELETE ON public.answers
  FOR EACH ROW EXECUTE FUNCTION public.block_closed_attempt_work();
CREATE TRIGGER block_closed_attempt_work BEFORE INSERT OR UPDATE OR DELETE ON public.essays
  FOR EACH ROW EXECUTE FUNCTION public.block_closed_attempt_work();


-- E. ----------------------------------------------------------------------------------
-- Evaluation đã kết thúc (done/failed) chỉ được đổi cờ is_official (bản mới thay bản cũ, Expert thay AI).
-- Chấm lại thì tạo evaluation mới (ADR-13).
CREATE FUNCTION public.block_finished_evaluation_edit() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF OLD.status IN ('done', 'failed') AND
     (TG_OP = 'DELETE' OR (to_jsonb(NEW) - 'is_official') IS DISTINCT FROM (to_jsonb(OLD) - 'is_official')) THEN
    RAISE EXCEPTION 'Evaluation % is %; create a new evaluation instead (BR-08)', OLD.id, OLD.status
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER block_finished_evaluation_edit BEFORE UPDATE OR DELETE ON public.evaluations
  FOR EACH ROW EXECUTE FUNCTION public.block_finished_evaluation_edit();

-- Điểm tiêu chí và lỗi đánh dấu thuộc evaluation đã kết thúc thì không thêm, sửa, xoá được.
CREATE FUNCTION public.block_finished_evaluation_detail() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_eval uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.evaluation_id ELSE NEW.evaluation_id END;
BEGIN
  IF EXISTS (SELECT 1 FROM public.evaluations WHERE id = v_eval AND status IN ('done', 'failed')) THEN
    RAISE EXCEPTION '% of evaluation % cannot change after it is finished (BR-08)', TG_TABLE_NAME, v_eval
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER block_finished_evaluation_detail BEFORE INSERT OR UPDATE OR DELETE ON public.criterion_scores
  FOR EACH ROW EXECUTE FUNCTION public.block_finished_evaluation_detail();
CREATE TRIGGER block_finished_evaluation_detail BEFORE INSERT OR UPDATE OR DELETE ON public.annotations
  FOR EACH ROW EXECUTE FUNCTION public.block_finished_evaluation_detail();

-- Audit log chỉ được thêm, kể cả với service_role.
CREATE FUNCTION public.block_audit_log_change() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only' USING ERRCODE = 'insufficient_privilege';
END $$;
CREATE TRIGGER block_audit_log_change BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.block_audit_log_change();
CREATE TRIGGER block_audit_log_truncate BEFORE TRUNCATE ON public.audit_logs
  FOR EACH STATEMENT EXECUTE FUNCTION public.block_audit_log_change();


-- F. ----------------------------------------------------------------------------------
-- Transcript Listening chứa đáp án; Core API (service_role) trả nó sau khi nộp (FR-14).
-- Quyền theo cột: cột mới thêm vào lr_sections phải được GRANT riêng thì Learner mới đọc được.
REVOKE SELECT ON public.lr_sections FROM authenticated;
GRANT SELECT (section_id, kind, passage, audio_key) ON public.lr_sections TO authenticated;


-- G. ----------------------------------------------------------------------------------
-- Mock có yêu cầu Expert đang mở (waiting/assigned): điểm AI không chính thức, attempt chờ Expert.
CREATE FUNCTION public.awaits_expert(p_attempt_id uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.attempts a JOIN public.review_requests r ON r.attempt_id = a.id
                  WHERE a.id = p_attempt_id AND a.mode = 'mock' AND r.status IN ('waiting', 'assigned'))
$$;

CREATE OR REPLACE FUNCTION public.publish_ai_evaluation(p_evaluation_id uuid, p_attempt_id uuid, p_band numeric)
RETURNS void
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_has_expert boolean;
  v_waiting boolean := public.awaits_expert(p_attempt_id);
  v_official boolean;
BEGIN
  v_has_expert := EXISTS (SELECT 1 FROM public.evaluations
                           WHERE attempt_id = p_attempt_id AND evaluator_type = 'expert' AND is_official);
  v_official := NOT v_has_expert AND NOT v_waiting;
  IF v_official THEN    -- chạy lại AI: bản mới thay bản AI chính thức cũ trong cùng transaction
    UPDATE public.evaluations SET is_official = false
     WHERE attempt_id = p_attempt_id AND evaluator_type = 'ai' AND is_official AND id <> p_evaluation_id;
  END IF;
  UPDATE public.evaluations SET status = 'done', overall_band = p_band, is_official = v_official
   WHERE id = p_evaluation_id;
  UPDATE public.attempts SET status = CASE WHEN v_waiting THEN 'waiting_expert' ELSE 'scored' END::public.attempt_status
   WHERE id = p_attempt_id AND status = 'grading';
END $$;

-- AI lỗi trên bài Mock đang chờ Expert: Expert chấm từ bản trống (BR-11), attempt vẫn chờ Expert.
CREATE OR REPLACE FUNCTION public.fail_ai_evaluation(p_evaluation_id uuid, p_attempt_id uuid,
                                                     p_attempt_status public.attempt_status DEFAULT 'grading_failed')
RETURNS void
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  UPDATE public.evaluations SET status = 'failed' WHERE id = p_evaluation_id;
  UPDATE public.attempts
     SET status = CASE WHEN p_attempt_status = 'grading_failed' AND public.awaits_expert(p_attempt_id)
                       THEN 'waiting_expert' ELSE p_attempt_status END::public.attempt_status
   WHERE id = p_attempt_id AND status = 'grading';
END $$;


-- Quyền: chỉ service_role (Core API, worker) gọi được các function ghi (NFR-11).
DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.lock_attempt_for_work(uuid)',
    'public.save_lr_answers(uuid, jsonb)',
    'public.save_writing_essays(uuid, jsonb)',
    'public.submit_writing_attempt(uuid, jsonb, boolean)',
    'public.submit_speaking_attempt(uuid, boolean)',
    'public.submit_lr_attempt(uuid, uuid[], jsonb, integer, integer, numeric, boolean)',
    'public.awaits_expert(uuid)',
    'public.publish_ai_evaluation(uuid, uuid, numeric)',
    'public.fail_ai_evaluation(uuid, uuid, public.attempt_status)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END $$;
