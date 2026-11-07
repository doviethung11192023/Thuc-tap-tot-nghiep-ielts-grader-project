-- Bỏ tính năng "Chấm bài tự do" (quyết định 2026-11-07). Dữ liệu đã export ra private/ trước khi chạy.
-- Chỉ chạy sau khi code không còn đọc 5 bảng này đã được triển khai.
-- DROP theo thứ tự phụ thuộc; bảng tự rời publication supabase_realtime, RLS policy mất theo bảng.
DROP TABLE IF EXISTS public.evaluation_logs;
DROP TABLE IF EXISTS public.essay_annotations;
DROP TABLE IF EXISTS public.evaluation_results;
DROP TABLE IF EXISTS public.free_essays;
DROP TABLE IF EXISTS public.topics;
