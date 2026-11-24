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

function notifySubscribers() {
  subscribers.forEach((cb) => cb());
}

async function fetchUserProfileOnce(userId: string, authUser?: SupabaseUser | null): Promise<User | null> {
  if (cachedAuthUser && cachedAuthUser.id === userId) {
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
        let voiceConsentAt: string | null = null;
        if (data.role === "learner") {
          const { data: lp } = await supabase
            .from("learner_profiles")
            .select("voice_consent_at")
            .eq("user_id", userId)
            .maybeSingle();
          voiceConsentAt = lp?.voice_consent_at ?? null;
        }
        cachedAuthUser = {
          ...data,
          avatar_url: data.avatar_key ?? null,
          voice_consent_at: voiceConsentAt,
          updated_at: data.created_at,
        } as User;
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
          return fetchUserProfileOnce(session.user.id, session.user);
        }
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
    notifySubscribers();
  }

  return { user, loading, signOut };
}
