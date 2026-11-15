-- Cho phép lưu lr_band quy đổi tỷ lệ tương đương (round(raw_score * 40 / question_count))
-- cho các đề Reading 39 câu (Test 6, Test 8) và bài luyện tập từng phần (1-2 Passages, question_count > 0).
ALTER TABLE public.attempts DROP CONSTRAINT IF EXISTS attempts_check5;
ALTER TABLE public.attempts DROP CONSTRAINT IF EXISTS attempts_lr_band_requires_questions;
ALTER TABLE public.attempts
  ADD CONSTRAINT attempts_lr_band_requires_questions
  CHECK (lr_band IS NULL OR question_count > 0);
