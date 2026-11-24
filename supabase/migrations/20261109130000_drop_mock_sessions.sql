-- =====================================================================
-- Bỏ mock session (Mock 4 kỹ năng một lượt là Won't từ 2026-11-08; Mock từng kỹ năng, đề ngẫu nhiên).
-- Bảng không có dòng nào, không code nào dùng. Bỏ: bảng mock_sessions, enum session_status,
-- view mock_session_results, cột attempts.mock_session_id cùng FK/UNIQUE/CHECK, ràng buộc 3,
-- nhánh kiểm bộ đề của session trong check_attempt_start. Còn 32 bảng, 2 view.
-- =====================================================================

DROP VIEW public.mock_session_results;

-- attempt_results dùng cột mock_session_id: dựng lại không có cột đó (security_invoker giữ RLS của Learner)
DROP VIEW public.attempt_results;
CREATE VIEW public.attempt_results WITH (security_invoker = true) AS
SELECT a.id AS attempt_id, a.learner_id, a.test_id, a.skill, a.mode, a.status,
       a.started_at, a.submitted_at, a.raw_score, a.question_count,
       oe.id AS official_evaluation_id, oe.evaluator_type AS official_evaluator,
       CASE WHEN a.skill IN ('listening', 'reading') THEN a.lr_band ELSE oe.overall_band END AS band,
       CASE WHEN a.status = 'waiting_expert' THEN ai.overall_band END AS preliminary_band
FROM public.attempts a
LEFT JOIN public.evaluations oe ON oe.attempt_id = a.id AND oe.is_official
LEFT JOIN LATERAL (
  SELECT e.overall_band FROM public.evaluations e
  WHERE e.attempt_id = a.id AND e.evaluator_type = 'ai' AND e.status = 'done'
  ORDER BY e.created_at DESC LIMIT 1) ai ON true;
-- Supabase mặc định cấp ALL cho anon/authenticated trên object mới: thu lại như baseline (NFR-11)
REVOKE ALL ON public.attempt_results FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.attempt_results FROM authenticated;
GRANT SELECT ON public.attempt_results TO authenticated;
GRANT ALL ON public.attempt_results TO service_role;

ALTER TABLE public.attempts
  DROP CONSTRAINT attempts_check1,                              -- mock_session_id chỉ cho Mock
  DROP CONSTRAINT attempts_mock_session_id_learner_id_fkey,
  DROP CONSTRAINT attempts_mock_session_id_skill_key,           -- ràng buộc 3
  DROP COLUMN mock_session_id;

DROP TABLE public.mock_sessions;
DROP TYPE public.session_status;

-- check_attempt_start: đề đã publish, đúng mode, Mock chỉ trên đề chưa từng làm (ràng buộc 12)
CREATE OR REPLACE FUNCTION public.check_attempt_start() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  t record;
BEGIN
  SELECT status, allowed_mode INTO t FROM public.tests WHERE id = NEW.test_id;
  IF t.status <> 'published' THEN
    RAISE EXCEPTION 'Test % is not published', NEW.test_id USING ERRCODE = 'check_violation';
  END IF;
  IF t.allowed_mode <> 'both' AND t.allowed_mode::text <> NEW.mode::text THEN
    RAISE EXCEPTION 'Test % does not allow % mode', NEW.test_id, NEW.mode USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.mode = 'mock' AND EXISTS (SELECT 1 FROM public.attempts
                                    WHERE learner_id = NEW.learner_id AND test_id = NEW.test_id) THEN
    RAISE EXCEPTION 'mock_test_already_taken' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;
