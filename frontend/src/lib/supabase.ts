import { createClient } from "@supabase/supabase-js";

// Lấy từ file .env.local (bạn sẽ điền vào sau khi có tài khoản Supabase)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Đây là "cánh cổng" duy nhất kết nối Frontend với Supabase
// Được dùng cho: Auth (đăng nhập/đăng ký) và Realtime (nhận kết quả AI)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
