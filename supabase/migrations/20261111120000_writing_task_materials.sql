-- =====================================================================
-- Tài liệu theo đề Writing (spec 006, ADR-30): đáp án số liệu Task 1, dàn ý, bài mẫu.
--
-- AI soạn nháp, Admin duyệt (BR-19 sửa ngày 2026-11-11). Chưa duyệt (*_reviewed_at NULL) thì không dùng để
-- chấm và không hiện cho Learner.
--
-- Bảng riêng, không thêm cột vào writing_tasks, vì:
--   - writing_tasks có policy published_read: mọi người đăng nhập đọc được → lộ đáp án và bài mẫu
--     trước khi làm bài (giống question_keys, Learner không được đọc).
--   - writing_tasks bị trigger block_published_edit khoá khi đề publish (BR-10). Tài liệu này không đổi
--     những gì Learner thấy lúc làm bài nên phải thêm, sửa được cho đề đã publish.
--
-- grading_runs.input_hash: dấu vân tay (đề, bài, phiên bản tài liệu, cấu hình chấm) để dùng lại kết quả
-- của bài nộp trùng y nguyên (spec 006 US4).
-- =====================================================================

CREATE TABLE public.writing_task_materials (
  section_id             uuid PRIMARY KEY REFERENCES public.writing_tasks(section_id) ON DELETE CASCADE,
  answer_key             jsonb CHECK (answer_key IS NULL OR jsonb_typeof(answer_key) = 'object'),  -- chỉ Task 1
  answer_key_reviewed_at timestamptz,                    -- NULL = nháp, chấm vẫn đọc ảnh
  answer_key_reviewer_id uuid REFERENCES public.profiles(id),
  outline                text,
  outline_reviewed_at    timestamptz,
  sample_essay           text,
  sample_reviewed_at     timestamptz,
  reviewer_id            uuid REFERENCES public.profiles(id),  -- người duyệt dàn ý / bài mẫu gần nhất
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CHECK (answer_key_reviewed_at IS NULL OR answer_key IS NOT NULL),
  CHECK (outline_reviewed_at IS NULL OR outline IS NOT NULL),
  CHECK (sample_reviewed_at IS NULL OR sample_essay IS NOT NULL)
);

-- Learner không đọc trực tiếp (giống question_keys); Core API trả phần đã duyệt theo luật FR-007.
ALTER TABLE public.writing_task_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_read ON public.writing_task_materials FOR SELECT TO authenticated USING (public.is_admin());

ALTER TABLE public.grading_runs ADD COLUMN input_hash text;
CREATE INDEX idx_runs_input_hash ON public.grading_runs (input_hash) WHERE status = 'done';
