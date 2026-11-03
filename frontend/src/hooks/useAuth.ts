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

  async function fetchUserProfile(userId: string, authUser?: any) {
    try {
      // profiles: chỉ đọc hồ sơ của chính mình (RLS own_read); avatar_key là ảnh đại diện
      const { data } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, avatar_key, is_active, created_at")
        .eq("id", userId)
        .single();
      if (data) {
        setUser({ ...data, avatar_url: data.avatar_key ?? null, updated_at: data.created_at } as User);
      } else if (authUser) {
        setUser({
          id: authUser.id,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "User",
          role: authUser.app_metadata?.role || "learner",
          is_active: true,
          created_at: authUser.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as User);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("fetchUserProfile error:", err);
      if (authUser) {
        setUser({
          id: authUser.id,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "User",
          role: authUser.app_metadata?.role || "learner",
          is_active: true,
          created_at: authUser.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as User);
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Lấy session hiện tại khi trang load
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Lấy thông tin user từ bảng public.users (kèm fallback authUser)
        fetchUserProfile(session.user.id, session.user);
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
          fetchUserProfile(session.user.id, session.user);
          localStorage.setItem("supabase_access_token", session.access_token);
        } else {
          setUser(null);
          localStorage.removeItem("supabase_access_token");
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    localStorage.removeItem("supabase_access_token");
  }

  return { user, loading, signOut };
}
