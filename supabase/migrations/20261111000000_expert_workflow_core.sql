-- ============================================================================
-- MIGRATION: EXPERT REVIEW WORKFLOW & SPEAKING ANNOTATIONS CORE
-- Phiên bản: 20261111000000
-- Căn cứ nghiệp vụ: docs/source-of-truth.md (BR-11, BR-15, BR-16, BR-20, FR-39..42)
-- Nguyên tắc: Bảo toàn 33 bảng hiện hữu, 0 bảng mới, 0 cột thừa, hoàn toàn không hồi quy.
-- ============================================================================

-- 1. Bổ sung giá trị 'declined' cho enum assignment_end (FR-39: Expert từ chối trong 2h làm việc đầu)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumtypid = 'public.assignment_end'::regtype 
        AND enumlabel = 'declined'
    ) THEN
        ALTER TYPE public.assignment_end ADD VALUE 'declined';
    END IF;
END $$;

-- 2. Tinh chỉnh bảng annotations để hỗ trợ cả bài thi Speaking
ALTER TABLE public.annotations 
    ALTER COLUMN essay_id DROP NOT NULL,
    ALTER COLUMN start_pos DROP NOT NULL,
    ALTER COLUMN end_pos DROP NOT NULL,
    ALTER COLUMN original_text DROP NOT NULL;

-- 3. Bổ sung các cột liên kết âm thanh Speaking vào annotations
ALTER TABLE public.annotations 
    ADD COLUMN IF NOT EXISTS response_id uuid REFERENCES public.speaking_responses(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS start_ms integer,
    ADD COLUMN IF NOT EXISTS end_ms integer;

-- 4. Bổ sung mã danh mục lỗi Speaking (FC - Fluency & Coherence, P - Pronunciation)
ALTER TABLE public.annotations 
    DROP CONSTRAINT IF EXISTS annotations_category_check;
ALTER TABLE public.annotations 
    ADD CONSTRAINT annotations_category_check 
    CHECK (category IN ('TA', 'TR', 'CC', 'LR', 'GRA', 'FC', 'P'));

-- 5. Ràng buộc toàn vẹn: Đúng 1 trong 2 mục tiêu được gán lỗi (Writing Essay hoặc Speaking Response)
ALTER TABLE public.annotations 
    DROP CONSTRAINT IF EXISTS chk_annotation_target;
ALTER TABLE public.annotations 
    ADD CONSTRAINT chk_annotation_target 
    CHECK (
        (essay_id IS NOT NULL AND response_id IS NULL) OR 
        (essay_id IS NULL AND response_id IS NOT NULL)
    );

-- 6. Index tối ưu hóa truy vấn danh sách lỗi Speaking theo từng câu trả lời
CREATE INDEX IF NOT EXISTS idx_annotations_response 
    ON public.annotations (response_id, start_ms) 
    WHERE response_id IS NOT NULL;

-- 7. Cấu hình mặc định hệ thống trong system_settings (BR-20, FR-39)
INSERT INTO public.system_settings (key, value, updated_at)
VALUES 
    ('expert_weekly_capacity', '50', now()),
    ('review_decline_hours', '2', now()),
    ('review_due_hours', '48', now())
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value, updated_at = now();
