-- =====================================================================
-- 20261010150400 — Hàm giao dịch, backend gọi qua supabase.rpc()
-- ---------------------------------------------------------------------
-- supabase-py đi qua REST nên không mở được transaction nhiều bước.
-- Bốn thao tác cần chạy trọn vẹn được viết thành hàm PostgreSQL.
-- Chỉ backend (service role key) được gọi: quyền EXECUTE bị thu hồi
-- khỏi anon và authenticated ở cuối file.
--
-- Cách gọi từ Python (supabase-py):
--   supabase.rpc("submit_attempt", {"p_attempt_id": aid, "p_user_id": uid}).execute()
--   supabase.rpc("save_answers", {"p_attempt_id": aid, "p_user_id": uid,
--                                 "p_answers": [{"question_id": qid, "answer": "library"}]}).execute()
--   supabase.rpc("create_review_request", {"p_user_id": uid, "p_essay_id": eid,
--                                          "p_attempt_id": None, "p_source": "learner_request"}).execute()
--   supabase.rpc("assign_pending_reviews", {}).execute()      # cron của ARQ, mỗi 10 phút
-- =====================================================================

-- Tạo yêu cầu Expert nếu còn hạn mức tuần; trả về id, hoặc NULL khi hết lượt
CREATE OR REPLACE FUNCTION public.create_review_request(
  p_user_id    UUID,
  p_essay_id   UUID,
  p_attempt_id UUID,
  p_source     review_source
) RETURNS UUID
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_quota INTEGER;
  v_used  INTEGER;
  v_id    UUID;
BEGIN
  -- Khóa theo người dùng để hai yêu cầu đồng thời không vượt hạn mức
  PERFORM 1 FROM public.users WHERE id = p_user_id FOR UPDATE;

  SELECT (value #>> '{}')::INTEGER INTO v_quota
  FROM public.system_settings
  WHERE key = CASE WHEN p_source = 'mock_auto'
                   THEN 'mock_expert_weekly_quota'
                   ELSE 'practice_review_weekly_quota' END;

  SELECT count(*) INTO v_used
  FROM public.review_requests
  WHERE requested_by = p_user_id
    AND source = p_source
    AND status <> 'cancelled'
    AND requested_at >= date_trunc('week', now());

  IF v_used >= v_quota THEN
    RETURN NULL;                                             -- hết lượt: backend chỉ chấm AI
  END IF;

  INSERT INTO public.review_requests (essay_id, attempt_id, requested_by, source)
  VALUES (p_essay_id, p_attempt_id, p_user_id, p_source)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_review_request(UUID, UUID, UUID, review_source) FROM PUBLIC, anon, authenticated;

-- Nộp bài: chỉ lần đầu có hiệu lực; bài Mock có Writing/Speaking tự tạo yêu cầu Expert
CREATE OR REPLACE FUNCTION public.submit_attempt(p_attempt_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_att    public.test_attempts%ROWTYPE;
  v_review UUID;
BEGIN
  UPDATE public.test_attempts
     SET status = 'submitted', submitted_at = now()
   WHERE id = p_attempt_id AND user_id = p_user_id AND status = 'in_progress'
  RETURNING * INTO v_att;

  IF NOT FOUND THEN
    SELECT * INTO v_att FROM public.test_attempts WHERE id = p_attempt_id AND user_id = p_user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'attempt_not_found';
    END IF;
    RETURN jsonb_build_object('status', v_att.status, 'already_submitted', true);
  END IF;

  IF v_att.mode = 'mock' AND v_att.skill IN ('writing', 'speaking') THEN
    v_review := public.create_review_request(p_user_id, NULL, p_attempt_id, 'mock_auto');
  END IF;

  RETURN jsonb_build_object('status', v_att.status, 'already_submitted', false,
                            'review_request_id', v_review);
END;
$$;

-- Tự lưu câu trả lời: chỉ khi bài còn in_progress, chưa quá hạn 30 s, câu hỏi thuộc đúng đề
CREATE OR REPLACE FUNCTION public.save_answers(p_attempt_id UUID, p_user_id UUID, p_answers JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_att   public.test_attempts%ROWTYPE;
  v_count INTEGER;
BEGIN
  SELECT * INTO v_att FROM public.test_attempts
   WHERE id = p_attempt_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'attempt_not_found';
  END IF;
  IF v_att.status <> 'in_progress'
     OR (v_att.deadline_at IS NOT NULL AND now() > v_att.deadline_at + interval '30 seconds') THEN
    RAISE EXCEPTION 'attempt_closed';
  END IF;

  INSERT INTO public.attempt_answers (attempt_id, question_id, answer, updated_at)
  SELECT p_attempt_id, a.question_id, a.answer, now()
    FROM jsonb_to_recordset(p_answers) AS a(question_id UUID, answer JSONB)
    JOIN public.questions q        ON q.id = a.question_id
    JOIN public.question_groups g  ON g.id = q.group_id
    JOIN public.test_sections s    ON s.id = g.section_id
   WHERE s.test_id = v_att.test_id
  ON CONFLICT (attempt_id, question_id)
  DO UPDATE SET answer = EXCLUDED.answer, updated_at = now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Phân công: thu hồi yêu cầu quá hạn, rồi gán yêu cầu đang chờ cho Expert ít việc nhất
CREATE OR REPLACE FUNCTION public.assign_pending_reviews()
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_req      RECORD;
  v_expert   UUID;
  v_due_hrs  INTEGER;
  v_assigned INTEGER := 0;
BEGIN
  SELECT (value #>> '{}')::INTEGER INTO v_due_hrs FROM public.system_settings WHERE key = 'review_due_hours';

  UPDATE public.review_requests
     SET status = 'requested', expert_id = NULL, assigned_by = NULL, assigned_at = NULL, due_at = NULL
   WHERE status IN ('assigned', 'in_review') AND due_at < now();

  FOR v_req IN
    SELECT id FROM public.review_requests
     WHERE status = 'requested'
     ORDER BY (source = 'mock_auto') DESC, requested_at
     FOR UPDATE SKIP LOCKED
  LOOP
    SELECT e.user_id INTO v_expert
      FROM public.expert_profiles e
      JOIN public.users u ON u.id = e.user_id AND u.is_active
      LEFT JOIN public.review_requests r
             ON r.expert_id = e.user_id AND r.status IN ('assigned', 'in_review')
     WHERE e.is_available
     GROUP BY e.user_id, e.max_active_reviews
    HAVING count(r.id) < e.max_active_reviews
     ORDER BY count(r.id), e.user_id
     LIMIT 1;

    EXIT WHEN v_expert IS NULL;

    UPDATE public.review_requests
       SET status = 'assigned', expert_id = v_expert, assigned_by = 'system',
           assigned_at = now(), due_at = now() + make_interval(hours => v_due_hrs)
     WHERE id = v_req.id;
    v_assigned := v_assigned + 1;
  END LOOP;

  RETURN v_assigned;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_attempt(UUID, UUID)        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.save_answers(UUID, UUID, JSONB)   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_pending_reviews()          FROM PUBLIC, anon, authenticated;

-- Supabase cấp sẵn quyền cho service_role qua default privileges; ghi rõ
-- lại để không phụ thuộc cấu hình mặc định.
GRANT EXECUTE ON FUNCTION public.create_review_request(UUID, UUID, UUID, review_source) TO service_role;
GRANT EXECUTE ON FUNCTION public.submit_attempt(UUID, UUID)      TO service_role;
GRANT EXECUTE ON FUNCTION public.save_answers(UUID, UUID, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.assign_pending_reviews()        TO service_role;
