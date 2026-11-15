-- 20261114220000 — Update submit_lr_attempt to support proportional band on < 40 question attempts
-- Respects p_band computed by Core API (or falls back to proportional lookup on band_conversions when v_count > 0).

CREATE OR REPLACE FUNCTION public.submit_lr_attempt(
  p_attempt_id uuid,
  p_section_ids uuid[],
  p_answers jsonb,
  p_raw_score integer,
  p_question_count integer,
  p_band numeric,
  p_auto boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
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
  IF v_count > 0 THEN
    v_band := p_band;
    IF v_band IS NULL THEN
      SELECT band INTO v_band FROM public.band_conversions
       WHERE skill = v.skill::text
         AND least(40, greatest(0, round(v_raw::numeric * 40 / v_count)::integer)) BETWEEN raw_min AND raw_max;
    END IF;
    IF v_band IS NULL THEN
      RAISE EXCEPTION 'band_conversions has no row for % raw score % (count %)', v.skill, v_raw, v_count
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  UPDATE public.attempts
     SET status = 'scored', submitted_at = v_now, auto_submitted = p_auto,
         raw_score = v_raw, question_count = v_count, lr_band = v_band
   WHERE id = p_attempt_id
  RETURNING * INTO v;
  RETURN to_jsonb(v);
END $function$;
