-- =====================================================================
-- Nộp bài và kết thúc chấm AI theo transaction (ADR-07), lease cho job chấm (ADR-02).
--
-- Trước đây nộp bài là nhiều lệnh HTTP rời: khoá attempt xong mà lỗi thì attempt kẹt ở `grading`,
-- không có job nào, và nộp lại bị 409. Mỗi function dưới đây chạy trọn trong một transaction.
--
-- grading_runs là nơi giữ trạng thái thật; hàng đợi Redis chỉ là tín hiệu kích hoạt, mất job thì
-- cron quét lại từ bảng này.
--   claimed_at      lúc worker nhận lượt chấm; NULL = chưa ai nhận
--   recovery_count  số lần cron cứu lượt chấm do worker chết giữa chừng
--
-- Chỉ service_role (Core API, worker) được gọi các function này (NFR-11).
-- =====================================================================

ALTER TABLE public.grading_runs
  ADD COLUMN claimed_at     timestamptz,
  ADD COLUMN recovery_count smallint NOT NULL DEFAULT 0 CHECK (recovery_count >= 0);

CREATE INDEX idx_grading_runs_running ON public.grading_runs (started_at) WHERE status = 'running';


-- Một evaluation AI mới (kết quả cũ không bị ghi đè, ADR-13) + 1 lượt chấm cho mỗi task.
-- Speaking truyền p_task_nos NULL: 1 lượt, task_no NULL.
CREATE FUNCTION public.create_ai_grading_job(p_attempt_id uuid, p_skill public.skill, p_task_nos smallint[])
RETURNS jsonb
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_evaluation_id uuid;
  v_runs jsonb;
BEGIN
  INSERT INTO public.evaluations (attempt_id, skill, evaluator_type, status)
  VALUES (p_attempt_id, p_skill, 'ai', 'pending')
  RETURNING id INTO v_evaluation_id;

  WITH created AS (
    INSERT INTO public.grading_runs (evaluation_id, task_no, status)
    SELECT v_evaluation_id, t.task_no, 'running'
      FROM unnest(COALESCE(p_task_nos, ARRAY[NULL]::smallint[])) AS t(task_no)
    RETURNING id, task_no
  )
  SELECT jsonb_agg(jsonb_build_object('run_id', id, 'task_no', task_no) ORDER BY task_no) INTO v_runs
    FROM created;

  RETURN jsonb_build_object('evaluation_id', v_evaluation_id, 'runs', v_runs);
END $$;


-- Nộp Writing: khoá attempt, lưu essay từng task, tạo job chấm.
-- p_tasks: [{"task_no": 1, "section_id": "...", "content": "..."}].
-- Trả NULL nếu attempt không còn in_progress (đã nộp hoặc nộp đồng thời).
CREATE FUNCTION public.submit_writing_attempt(p_attempt_id uuid, p_tasks jsonb)
RETURNS jsonb
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_attempt public.attempts%ROWTYPE;
  v_now timestamptz := now();
  v_job jsonb;
  v_essays jsonb;
BEGIN
  UPDATE public.attempts SET status = 'grading', submitted_at = v_now
   WHERE id = p_attempt_id AND status = 'in_progress'
  RETURNING * INTO v_attempt;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.attempt_sections (attempt_id, section_id, test_id, started_at, finished_at)
  SELECT p_attempt_id, (t ->> 'section_id')::uuid, v_attempt.test_id, v_attempt.started_at, v_now
    FROM jsonb_array_elements(p_tasks) AS t
  ON CONFLICT (attempt_id, section_id) DO UPDATE
    SET test_id = EXCLUDED.test_id, started_at = EXCLUDED.started_at, finished_at = EXCLUDED.finished_at;

  WITH saved AS (
    INSERT INTO public.essays (attempt_id, section_id, content, updated_at)
    SELECT p_attempt_id, (t ->> 'section_id')::uuid, t ->> 'content', v_now
      FROM jsonb_array_elements(p_tasks) AS t
    ON CONFLICT (attempt_id, section_id) DO UPDATE
      SET content = EXCLUDED.content, updated_at = EXCLUDED.updated_at
    RETURNING id, section_id, word_count
  )
  SELECT jsonb_agg(jsonb_build_object('task_no', (t ->> 'task_no')::smallint, 'essay_id', s.id,
                                      'word_count', s.word_count))
    INTO v_essays
    FROM saved s
    JOIN jsonb_array_elements(p_tasks) AS t ON (t ->> 'section_id')::uuid = s.section_id;

  v_job := public.create_ai_grading_job(
    p_attempt_id, 'writing',
    (SELECT array_agg((t ->> 'task_no')::smallint ORDER BY (t ->> 'task_no')::smallint)
       FROM jsonb_array_elements(p_tasks) AS t));

  RETURN v_job || jsonb_build_object('submitted_at', v_now, 'essays', v_essays);
END $$;


-- Nộp Speaking: chỉ các câu đã confirm được chấm; không có câu nào thì no_speech, không tạo job.
-- Trả NULL nếu attempt không còn in_progress.
CREATE FUNCTION public.submit_speaking_attempt(p_attempt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_now timestamptz := now();
  v_has_speech boolean;
  v_status public.attempt_status;
  v_job jsonb := NULL;
BEGIN
  v_has_speech := EXISTS (SELECT 1 FROM public.speaking_responses
                           WHERE attempt_id = p_attempt_id AND confirmed_at IS NOT NULL);
  v_status := CASE WHEN v_has_speech THEN 'grading' ELSE 'no_speech' END;

  UPDATE public.attempts SET status = v_status, submitted_at = v_now
   WHERE id = p_attempt_id AND status = 'in_progress';
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_has_speech THEN
    UPDATE public.attempt_sections SET finished_at = v_now
     WHERE attempt_id = p_attempt_id
       AND section_id IN (SELECT section_id FROM public.speaking_responses
                           WHERE attempt_id = p_attempt_id AND confirmed_at IS NOT NULL);
    v_job := public.create_ai_grading_job(p_attempt_id, 'speaking', NULL);
  END IF;

  RETURN jsonb_build_object('status', v_status, 'submitted_at', v_now, 'job', v_job);
END $$;


-- Nộp Listening/Reading: Core API đã tính sẵn điểm từ đáp án (BR-14), function ghi tất cả một lần.
-- p_section_ids: các phần được chấm. p_answers: [{"question_id", "section_id", "answer", "is_correct"}].
-- Trả NULL nếu attempt không còn in_progress.
CREATE FUNCTION public.submit_lr_attempt(p_attempt_id uuid, p_section_ids uuid[], p_answers jsonb,
                                         p_raw_score integer, p_question_count integer, p_band numeric)
RETURNS jsonb
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_attempt public.attempts%ROWTYPE;
  v_now timestamptz := now();
BEGIN
  UPDATE public.attempts
     SET status = 'scored', submitted_at = v_now, raw_score = p_raw_score,
         question_count = p_question_count, lr_band = p_band
   WHERE id = p_attempt_id AND status = 'in_progress'
  RETURNING * INTO v_attempt;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.attempt_sections (attempt_id, section_id, test_id, started_at, finished_at)
  SELECT p_attempt_id, s.section_id, v_attempt.test_id, v_attempt.started_at, v_now
    FROM unnest(p_section_ids) AS s(section_id)
  ON CONFLICT (attempt_id, section_id) DO UPDATE
    SET test_id = EXCLUDED.test_id, started_at = EXCLUDED.started_at, finished_at = EXCLUDED.finished_at;

  INSERT INTO public.answers (attempt_id, question_id, section_id, answer, is_correct, updated_at)
  SELECT p_attempt_id, (a ->> 'question_id')::uuid, (a ->> 'section_id')::uuid, a ->> 'answer',
         (a ->> 'is_correct')::boolean, v_now
    FROM jsonb_array_elements(p_answers) AS a
  ON CONFLICT (attempt_id, question_id) DO UPDATE
    SET section_id = EXCLUDED.section_id, answer = EXCLUDED.answer,
        is_correct = EXCLUDED.is_correct, updated_at = EXCLUDED.updated_at;

  RETURN to_jsonb(v_attempt);
END $$;


-- Worker nhận lượt chấm: chỉ một worker thắng. Lượt đã xong, hoặc đang được worker khác giữ
-- (lease chưa hết hạn) thì trả false và job bỏ qua, nên job trùng trong hàng đợi vô hại.
CREATE FUNCTION public.claim_grading_run(p_run_id uuid, p_lease_seconds integer)
RETURNS boolean
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  UPDATE public.grading_runs SET claimed_at = now()
   WHERE id = p_run_id AND status = 'running'
     AND (claimed_at IS NULL OR claimed_at < now() - make_interval(secs => p_lease_seconds));
  RETURN FOUND;
END $$;


-- Công bố điểm AI (BR-08). Có điểm Expert chính thức thì điểm AI chỉ lưu lại, không chính thức.
-- Chạy lại AI: bản AI mới thay bản AI chính thức cũ trong cùng transaction, nên không có lúc nào
-- attempt mất kết quả chính thức.
CREATE FUNCTION public.publish_ai_evaluation(p_evaluation_id uuid, p_attempt_id uuid, p_band numeric)
RETURNS void
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v_has_expert boolean;
BEGIN
  v_has_expert := EXISTS (SELECT 1 FROM public.evaluations
                           WHERE attempt_id = p_attempt_id AND evaluator_type = 'expert' AND is_official);
  IF NOT v_has_expert THEN
    UPDATE public.evaluations SET is_official = false
     WHERE attempt_id = p_attempt_id AND evaluator_type = 'ai' AND is_official AND id <> p_evaluation_id;
  END IF;
  UPDATE public.evaluations SET status = 'done', overall_band = p_band, is_official = NOT v_has_expert
   WHERE id = p_evaluation_id;
  UPDATE public.attempts SET status = 'scored' WHERE id = p_attempt_id AND status = 'grading';
END $$;


-- Evaluation AI thất bại. p_attempt_status: grading_failed (Admin chạy lại, UC-24) hoặc
-- no_speech (mọi câu đều im lặng).
CREATE FUNCTION public.fail_ai_evaluation(p_evaluation_id uuid, p_attempt_id uuid,
                                          p_attempt_status public.attempt_status DEFAULT 'grading_failed')
RETURNS void
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  UPDATE public.evaluations SET status = 'failed' WHERE id = p_evaluation_id;
  UPDATE public.attempts SET status = p_attempt_status WHERE id = p_attempt_id AND status = 'grading';
END $$;


-- Mặc định Postgres cho PUBLIC quyền EXECUTE, và Supabase cấp thêm cho anon/authenticated qua
-- default privileges. Thu lại cả hai: gọi được thì Learner tự chấm điểm cho mình.
DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.create_ai_grading_job(uuid, public.skill, smallint[])',
    'public.submit_writing_attempt(uuid, jsonb)',
    'public.submit_speaking_attempt(uuid)',
    'public.submit_lr_attempt(uuid, uuid[], jsonb, integer, integer, numeric)',
    'public.claim_grading_run(uuid, integer)',
    'public.publish_ai_evaluation(uuid, uuid, numeric)',
    'public.fail_ai_evaluation(uuid, uuid, public.attempt_status)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END $$;
