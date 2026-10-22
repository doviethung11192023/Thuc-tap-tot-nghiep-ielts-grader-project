-- =====================================================================
-- 20261010150600 — Dữ liệu nền: bảng quy đổi số câu đúng sang band
-- ---------------------------------------------------------------------
-- Các mốc từ 10 câu đúng trở lên lấy theo bảng quy đổi tham khảo mà IELTS
-- công bố cho Listening và Academic Reading (số liệu mang tính xấp xỉ, đề
-- thật có thể xê dịch). Các mốc dưới 10 câu đúng là GIẢ ĐỊNH của nhóm để
-- hệ thống luôn tra được band; cần đối chiếu lại và Admin sửa được trong
-- màn quản lý dữ liệu nền.
-- Chạy lại an toàn: dòng đã có (cùng skill, raw_min) được giữ nguyên.
-- =====================================================================

INSERT INTO public.band_conversions (skill, raw_min, raw_max, band) VALUES
  -- Listening
  ('listening', 39, 40, 9.0),
  ('listening', 37, 38, 8.5),
  ('listening', 35, 36, 8.0),
  ('listening', 32, 34, 7.5),
  ('listening', 30, 31, 7.0),
  ('listening', 26, 29, 6.5),
  ('listening', 23, 25, 6.0),
  ('listening', 18, 22, 5.5),
  ('listening', 16, 17, 5.0),
  ('listening', 13, 15, 4.5),
  ('listening', 10, 12, 4.0),
  ('listening',  8,  9, 3.5),  -- giả định của nhóm
  ('listening',  6,  7, 3.0),  -- giả định của nhóm
  ('listening',  4,  5, 2.5),  -- giả định của nhóm
  ('listening',  2,  3, 2.0),  -- giả định của nhóm
  ('listening',  1,  1, 1.0),  -- giả định của nhóm
  ('listening',  0,  0, 0.0),  -- giả định của nhóm
  -- Academic Reading
  ('reading', 39, 40, 9.0),
  ('reading', 37, 38, 8.5),
  ('reading', 35, 36, 8.0),
  ('reading', 33, 34, 7.5),
  ('reading', 30, 32, 7.0),
  ('reading', 27, 29, 6.5),
  ('reading', 23, 26, 6.0),
  ('reading', 19, 22, 5.5),
  ('reading', 15, 18, 5.0),
  ('reading', 13, 14, 4.5),
  ('reading', 10, 12, 4.0),
  ('reading',  8,  9, 3.5),    -- giả định của nhóm
  ('reading',  6,  7, 3.0),    -- giả định của nhóm
  ('reading',  4,  5, 2.5),    -- giả định của nhóm
  ('reading',  2,  3, 2.0),    -- giả định của nhóm
  ('reading',  1,  1, 1.0),    -- giả định của nhóm
  ('reading',  0,  0, 0.0)     -- giả định của nhóm
ON CONFLICT (skill, raw_min) DO NOTHING;
