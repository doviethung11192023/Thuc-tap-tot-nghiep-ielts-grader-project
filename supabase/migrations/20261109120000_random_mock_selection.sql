-- =====================================================================
-- Mock: hệ thống chọn đề ngẫu nhiên, Learner không chọn và không xem trước được (UC-08, FR-10, FR-36).
--
-- Trước đây Learner chọn đề và chế độ (?mode=exam), mọi đề để allowed_mode = 'both': luyện Practice một đề,
-- xem đáp án, rồi thi Mock đúng đề đó làm sai band Mock (BR-12 ưu tiên Mock). Từ nay:
--   A. Kho đề Mock = đề thuộc bộ đề Mock. allowed_mode do DB tự đặt theo bộ: trong bộ → 'mock',
--      ngoài bộ → 'practice'. Đề Mock không làm Practice được và ngược lại.
--   B. start_mock_attempt chọn ngẫu nhiên đề Mock của kỹ năng mà Learner chưa từng làm (kể cả bỏ dở).
--      Đang có bài Mock dở của kỹ năng đó thì trả bài đó. Hết đề chưa làm thì từ chối: không lặp đề cũ.
--   C. check_attempt_start chặn Mock trên đề đã làm, kể cả khi gọi thẳng INSERT.
--   D. RLS: Learner chỉ đọc được nội dung đề Mock khi đã có attempt trên đề đó (không xem trước).
-- =====================================================================

-- A. ----------------------------------------------------------------------------------
-- allowed_mode là thuộc tính danh mục (đề dùng ở chế độ nào), không phải nội dung đề: attempt cũ không
-- phụ thuộc nó, nên đề đã publish đổi được (cùng với status và bộ đề). Nội dung vẫn bị khoá (BR-10).
CREATE OR REPLACE FUNCTION public.block_published_edit() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  st public.content_status;
BEGIN
  IF TG_TABLE_NAME = 'tests' THEN
    IF OLD.status = 'draft' THEN
      RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
    END IF;
    -- Đề published chỉ được chuyển sang archived, gắn/bỏ khỏi bộ đề Mock (kéo theo allowed_mode)
    IF TG_OP = 'UPDATE' AND OLD.status = 'published'
       AND (to_jsonb(NEW) - 'status' - 'test_set_id' - 'allowed_mode')
         = (to_jsonb(OLD) - 'status' - 'test_set_id' - 'allowed_mode')
       AND NEW.status IN ('published', 'archived') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Test % is %; copy it to a new version to edit (BR-10)', OLD.id, OLD.status
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT status INTO st FROM public.tests
  WHERE id = public.content_test_id(TG_TABLE_NAME, to_jsonb(CASE WHEN TG_OP = 'INSERT' THEN NEW ELSE OLD END));
  IF st IN ('published', 'archived') THEN
    RAISE EXCEPTION 'Content of a % test cannot be changed (BR-10)', st USING ERRCODE = 'check_violation';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;

CREATE FUNCTION public.sync_test_allowed_mode() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.allowed_mode := CASE WHEN NEW.test_set_id IS NOT NULL THEN 'mock' ELSE 'practice' END::public.allowed_mode;
  RETURN NEW;
END $$;
CREATE TRIGGER sync_test_allowed_mode BEFORE INSERT OR UPDATE OF test_set_id, allowed_mode ON public.tests
  FOR EACH ROW EXECUTE FUNCTION public.sync_test_allowed_mode();

-- Đề archived giữ nguyên (không sửa được, cũng không bắt đầu được bài mới)
UPDATE public.tests SET allowed_mode = allowed_mode WHERE status IN ('draft', 'published');
ALTER TABLE public.tests
  ADD CONSTRAINT tests_mock_pool_mode CHECK (status = 'archived' OR allowed_mode <> 'both');


-- C. ----------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_attempt_start() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  t record;
BEGIN
  SELECT status, allowed_mode, test_set_id INTO t FROM public.tests WHERE id = NEW.test_id;
  IF t.status <> 'published' THEN
    RAISE EXCEPTION 'Test % is not published', NEW.test_id USING ERRCODE = 'check_violation';
  END IF;
  IF t.allowed_mode <> 'both' AND t.allowed_mode::text <> NEW.mode::text THEN
    RAISE EXCEPTION 'Test % does not allow % mode', NEW.test_id, NEW.mode USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.mock_session_id IS NOT NULL AND t.test_set_id IS DISTINCT FROM
     (SELECT test_set_id FROM public.mock_sessions WHERE id = NEW.mock_session_id) THEN
    RAISE EXCEPTION 'Test % is not in the test set of mock session %', NEW.test_id, NEW.mock_session_id
      USING ERRCODE = 'check_violation';
  END IF;
  -- Mock chỉ trên đề Learner chưa từng làm: điểm Mock phản ánh lần gặp đề đầu tiên
  IF NEW.mode = 'mock' AND EXISTS (SELECT 1 FROM public.attempts
                                    WHERE learner_id = NEW.learner_id AND test_id = NEW.test_id) THEN
    RAISE EXCEPTION 'mock_test_already_taken' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;


-- B. ----------------------------------------------------------------------------------
-- Kho đề Mock của một kỹ năng: đề published trong bộ đề Mock published.
CREATE FUNCTION public.mock_pool(p_skill public.skill) RETURNS SETOF public.tests
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT t.* FROM public.tests t JOIN public.test_sets s ON s.id = t.test_set_id
   WHERE t.skill = p_skill AND t.status = 'published' AND t.allowed_mode = 'mock' AND s.status = 'published'
$$;

-- Bắt đầu bài Mock: trả bài Mock dở của kỹ năng nếu có, nếu không chọn ngẫu nhiên một đề chưa làm.
-- Khoá theo (Learner, kỹ năng) để hai lần bấm cùng lúc không tạo hai bài.
CREATE FUNCTION public.start_mock_attempt(p_learner_id uuid, p_skill public.skill) RETURNS jsonb
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  v public.attempts%ROWTYPE;
  v_test public.tests%ROWTYPE;
  v_minutes integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('mock:' || p_learner_id || ':' || p_skill, 0));

  SELECT * INTO v FROM public.attempts
   WHERE learner_id = p_learner_id AND skill = p_skill AND mode = 'mock' AND status = 'in_progress'
   ORDER BY started_at DESC LIMIT 1;
  IF FOUND THEN
    RETURN to_jsonb(v) || jsonb_build_object('resumed', true);
  END IF;

  SELECT * INTO v_test FROM public.mock_pool(p_skill) t
   WHERE NOT EXISTS (SELECT 1 FROM public.attempts a WHERE a.learner_id = p_learner_id AND a.test_id = t.id)
   ORDER BY random() LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'mock_pool_exhausted' USING ERRCODE = 'check_violation';
  END IF;

  SELECT coalesce(v_test.duration_minutes, (value ->> p_skill::text)::integer, 60) INTO v_minutes
    FROM public.system_settings WHERE key = 'mock_duration_minutes';
  INSERT INTO public.attempts (learner_id, test_id, skill, mode, status, started_at, deadline_at)
  VALUES (p_learner_id, v_test.id, p_skill, 'mock', 'in_progress', now(),
          now() + make_interval(mins => coalesce(v_minutes, v_test.duration_minutes, 60)))
  RETURNING * INTO v;
  RETURN to_jsonb(v) || jsonb_build_object('resumed', false);
END $$;

-- Số đề Mock còn lại của Learner theo kỹ năng, và bài Mock đang dở (nếu có), cho trang Thi thử.
CREATE FUNCTION public.mock_pool_summary(p_learner_id uuid)
RETURNS TABLE (skill public.skill, total integer, remaining integer, open_attempt_id uuid, open_test_id uuid,
               open_deadline_at timestamptz)
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT k.skill,
         (SELECT count(*)::integer FROM public.mock_pool(k.skill)),
         (SELECT count(*)::integer FROM public.mock_pool(k.skill) t
           WHERE NOT EXISTS (SELECT 1 FROM public.attempts a WHERE a.learner_id = p_learner_id AND a.test_id = t.id)),
         o.id, o.test_id, o.deadline_at
    FROM unnest(enum_range(NULL::public.skill)) AS k(skill)
    LEFT JOIN LATERAL (SELECT a.id, a.test_id, a.deadline_at FROM public.attempts a
                        WHERE a.learner_id = p_learner_id AND a.skill = k.skill AND a.mode = 'mock'
                          AND a.status = 'in_progress'
                        ORDER BY a.started_at DESC LIMIT 1) o ON true
$$;


-- D. ----------------------------------------------------------------------------------
-- Learner đọc được đề đã publish; riêng đề Mock thì chỉ khi đã có attempt trên đề đó.
CREATE OR REPLACE FUNCTION public.test_is_published(p_test uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.tests t
                  WHERE t.id = p_test AND t.status = 'published'
                    AND (t.allowed_mode <> 'mock' OR EXISTS (
                         SELECT 1 FROM public.attempts a WHERE a.test_id = t.id AND a.learner_id = auth.uid())))
$$;
CREATE OR REPLACE FUNCTION public.section_is_published(p_section uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.test_is_published((SELECT test_id FROM public.sections WHERE id = p_section))
$$;
DROP POLICY published_read ON public.tests;
CREATE POLICY published_read ON public.tests FOR SELECT TO authenticated USING (public.test_is_published(id));


-- Quyền: chỉ service_role gọi được (NFR-11)
DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.mock_pool(public.skill)',
    'public.start_mock_attempt(uuid, public.skill)',
    'public.mock_pool_summary(uuid)'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END $$;
