-- =====================================================================
-- 20261010150300 — Tạo hồ sơ public.users bằng trigger trên auth.users
-- ---------------------------------------------------------------------
-- Thay cho việc frontend tự insert vào users sau khi đăng ký (register,
-- login, auth/callback). Vai trò chỉ đọc từ app_metadata, thứ chỉ server
-- (service role) ghi được; KHÔNG BAO GIỜ đọc từ user_metadata vì người
-- dùng tự gửi trường đó khi gọi signUp.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_app_meta_data ->> 'role')::public.user_role, 'student')
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Bù hồ sơ cho tài khoản đã đăng ký trước đây mà frontend chưa kịp tạo
-- dòng users (ví dụ đăng ký cần xác nhận email rồi không đăng nhập lại).
-- Tài khoản đã có hồ sơ được giữ nguyên, kể cả vai trò admin hiện có.
INSERT INTO public.users (id, email, full_name, role)
SELECT u.id,
       u.email,
       COALESCE(NULLIF(u.raw_user_meta_data ->> 'full_name', ''), split_part(u.email, '@', 1)),
       'student'
FROM auth.users u
WHERE u.email IS NOT NULL
ON CONFLICT DO NOTHING;
