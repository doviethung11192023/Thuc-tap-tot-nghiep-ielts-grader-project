"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@/types";

// ============================================================
// HOOK: useAuth
// Quản lý trạng thái đăng nhập toàn ứng dụng
// ============================================================

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // --- [MÃ MỚI BỞI AGENT] ---
  // === [DEMO MODE] ===
  // Đổi giá trị này thành `true` để chạy giao diện mà không cần Backend (bỏ qua màn Login).
  // Đổi lại thành `false` khi có Backend/Supabase.
  const IS_DEMO_MODE = true;
  // ---------------------------

  async function fetchUserProfile(userId: string) {
    // --- [MÃ MỚI BỞI AGENT] ---
    if (IS_DEMO_MODE) return; // Bỏ qua nếu đang chạy demo
    // ---------------------------
    
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();
    setUser(data);
    setLoading(false);
  }

  useEffect(() => {
    // --- [MÃ MỚI BỞI AGENT] ---
    if (IS_DEMO_MODE) {
      // Set User giả lập ngay lập tức để vượt qua AuthGuard
      setUser({
        id: "demo-user-id",
        email: "demo@example.com",
        full_name: "Học viên Demo",
        role: "student",
        avatar_url: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      setLoading(false);
      return;
    }
    // ---------------------------

    // Lấy session hiện tại khi trang load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Lấy thông tin user từ bảng public.users (không phải auth.users)
        fetchUserProfile(session.user.id);
        // Lưu token để axios interceptor dùng
        localStorage.setItem("supabase_access_token", session.access_token);
      } else {
        setLoading(false);
      }
    });

    // Lắng nghe thay đổi auth state (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          fetchUserProfile(session.user.id);
          localStorage.setItem("supabase_access_token", session.access_token);
        } else {
          setUser(null);
          localStorage.removeItem("supabase_access_token");
        }
      }
    );

    return () => subscription.unsubscribe();
    // --- [MÃ MỚI BỞI AGENT: Đổi dependency array thêm IS_DEMO_MODE] ---
  }, [IS_DEMO_MODE]);
  // --- [MÃ GỐC BỊ THAY THẾ] ---
  // }, []);
  // ---------------------------
  
  async function signOut() {
    await supabase.auth.signOut();
    localStorage.removeItem("supabase_access_token");
  }

  return { user, loading, signOut };
}
