-- =====================================================================
-- 20261020000000 — BỔ SUNG BẢNG CẤU HÌNH HỆ THỐNG (SYSTEM_SETTINGS)
-- ---------------------------------------------------------------------
-- Hỗ trợ UC-A05: Quản trị Dữ liệu Lõi Hệ thống & Cấu hình tham số
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Bật RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Mọi người dùng có thể đọc cấu hình công khai
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'system_settings' AND policyname = 'Public read system settings'
  ) THEN
    CREATE POLICY "Public read system settings" ON public.system_settings
      FOR SELECT USING (true);
  END IF;
END $$;

-- Policy: Chỉ Quản trị viên (Admin) được phép ghi/sửa/xóa cấu hình
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'system_settings' AND policyname = 'Admin write system settings'
  ) THEN
    CREATE POLICY "Admin write system settings" ON public.system_settings
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid() AND users.role = 'admin'
        )
      );
  END IF;
END $$;

-- Seed dữ liệu cấu hình mặc định
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('upload_limits', '{"max_audio_mb": 25, "max_image_mb": 5}'::jsonb, 'Giới hạn dung lượng tải lên file âm thanh và hình ảnh'),
  ('exam_rules', '{"reading_duration_min": 60, "listening_duration_min": 30, "writing_duration_min": 60, "speaking_duration_min": 14}'::jsonb, 'Thời gian làm bài thi mặc định từng kỹ năng'),
  ('ai_model_config', '{"writing_model": "gemini-1.5-flash", "speaking_model": "gemini-1.5-flash", "temperature": 0.2}'::jsonb, 'Cấu hình tham số mô hình AI chấm điểm')
ON CONFLICT (key) DO NOTHING;
