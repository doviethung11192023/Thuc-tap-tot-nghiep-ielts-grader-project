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

  useEffect(() => {
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
  }, []);

  async function fetchUserProfile(userId: string) {
    const { data } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();
    setUser(data);
    setLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    localStorage.removeItem("supabase_access_token");
  }

  return { user, loading, signOut };
}
