-- =====================================================================
-- 20261010150100 — Thêm vai trò expert vào enum user_role có sẵn
-- ---------------------------------------------------------------------
-- Tách riêng một file vì giá trị enum mới phải được COMMIT trước khi
-- được dùng (trigger ở file 20261010150300 dùng tới nó).
-- Lưu ý: PostgreSQL không cho xóa giá trị enum, nên bước này không
-- hoàn tác được; giá trị thừa cũng không ảnh hưởng gì tới code cũ.
-- =====================================================================

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'expert';
