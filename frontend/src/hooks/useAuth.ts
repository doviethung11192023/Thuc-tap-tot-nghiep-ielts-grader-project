"use client";

import { useEffect, useState } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { User } from "@/types";

// ============================================================
// HOOK: useAuth
// Quản lý trạng thái đăng nhập toàn ứng dụng (kèm module cache tránh fetch 3x)
// ============================================================

let cachedAuthUser: User | null = null;
let authResolved = false;
let initPromise: Promise<User | null> | null = null;
const profileFetchMap = new Map<string, Promise<User | null>>();
let authListenerBound = false;
const subscribers = new Set<() => void>();

// Object hồ sơ đã phát cho component lần gần nhất (để giữ nguyên tham chiếu khi làm mới ra cùng nội dung)
let publishedUser: User | null = null;

function notifySubscribers() {
  publishedUser = cachedAuthUser;
  subscribers.forEach((cb) => cb());
}

// Hồ sơ lần trước lưu ở localStorage: reload trang hiển thị ngay, không chờ truy vấn profiles (~200–400 ms tới
// Supabase) rồi làm mới ngầm. Chỉ dùng cho giao diện; quyền thật do Core API và RLS kiểm.
const PROFILE_CACHE_KEY = "moonlab_profile_cache";

function readCachedProfile(userId: string): User | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    const parsed = raw ? (JSON.parse(raw) as User) : null;
    return parsed && parsed.id === userId ? parsed : null;
  } catch {
    return null;
  }
}

function writeCachedProfile(user: User | null) {
  try {
    if (user) localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(user));
    else localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {
    // localStorage đầy hoặc bị chặn: bỏ qua, lần sau lại chờ truy vấn như cũ
  }
}

async function fetchUserProfileOnce(userId: string, authUser?: SupabaseUser | null, force = false): Promise<User | null> {
  if (!force && cachedAuthUser && cachedAuthUser.id === userId) {
    return cachedAuthUser;
  }
  const existing = profileFetchMap.get(userId);
  if (existing) return existing;

  const task = (async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, avatar_key, is_active, created_at")
        .eq("id", userId)
        .single();
      if (data) {
        cachedAuthUser = { ...data, avatar_url: data.avatar_key ?? null, updated_at: data.created_at } as User;
      } else if (authUser) {
        cachedAuthUser = {
          id: authUser.id,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "User",
          role: authUser.app_metadata?.role || "learner",
          is_active: true,
          created_at: authUser.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as User;
      } else {
        cachedAuthUser = null;
      }
    } catch (err) {
      console.error("fetchUserProfile error:", err);
      if (authUser) {
        cachedAuthUser = {
          id: authUser.id,
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || authUser.email?.split("@")[0] || "User",
          role: authUser.app_metadata?.role || "learner",
          is_active: true,
          created_at: authUser.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as User;
      } else {
        cachedAuthUser = null;
      }
    } finally {
      // Làm mới ngầm ra đúng hồ sơ cũ thì giữ nguyên object: trang dùng `user` làm dependency không tải lại lần hai
      // (bỏ updated_at vì nhánh dự phòng đặt nó theo giờ hiện tại)
      const sameAsBefore = (u: User | null) => JSON.stringify({ ...u, updated_at: undefined });
      if (publishedUser && cachedAuthUser && sameAsBefore(publishedUser) === sameAsBefore(cachedAuthUser)) {
        cachedAuthUser = publishedUser;
      }
      writeCachedProfile(cachedAuthUser);
      authResolved = true;
      profileFetchMap.delete(userId);
      notifySubscribers();
    }
    return cachedAuthUser;
  })();

  profileFetchMap.set(userId, task);
  return task;
}

function ensureAuthInitialized() {
  if (!authListenerBound && typeof window !== "undefined") {
    authListenerBound = true;
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        localStorage.setItem("supabase_access_token", session.access_token);
        void fetchUserProfileOnce(session.user.id, session.user);
      } else {
        cachedAuthUser = null;
        authResolved = true;
        localStorage.removeItem("supabase_access_token");
        writeCachedProfile(null);
        notifySubscribers();
      }
    });
  }

  if (!initPromise && !authResolved) {
    initPromise = supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (session?.user) {
          localStorage.setItem("supabase_access_token", session.access_token);
          const remembered = readCachedProfile(session.user.id);
          if (remembered) {
            // Mở trang ngay bằng hồ sơ đã nhớ, rồi đọc lại profiles để cập nhật tên, vai trò, trạng thái
            cachedAuthUser = remembered;
            authResolved = true;
            notifySubscribers();
            return fetchUserProfileOnce(session.user.id, session.user, true);
          }
          return fetchUserProfileOnce(session.user.id, session.user);
        }
        writeCachedProfile(null);
        cachedAuthUser = null;
        authResolved = true;
        notifySubscribers();
        return null;
      })
      .finally(() => {
        initPromise = null;
      });
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(() => cachedAuthUser);
  const [loading, setLoading] = useState<boolean>(() => !authResolved);

  useEffect(() => {
    const sync = () => {
      setUser(cachedAuthUser);
      setLoading(!authResolved);
    };
    subscribers.add(sync);
    ensureAuthInitialized();
    sync();

    return () => {
      subscribers.delete(sync);
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    cachedAuthUser = null;
    authResolved = true;
    localStorage.removeItem("supabase_access_token");
    writeCachedProfile(null);
    notifySubscribers();
  }

  return { user, loading, signOut };
}
