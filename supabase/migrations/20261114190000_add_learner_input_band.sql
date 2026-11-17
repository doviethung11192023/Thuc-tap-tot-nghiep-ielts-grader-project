ALTER TABLE public.learner_profiles
  ADD COLUMN IF NOT EXISTS input_band public.band DEFAULT 4.0;

NOTIFY pgrst, 'reload schema';
