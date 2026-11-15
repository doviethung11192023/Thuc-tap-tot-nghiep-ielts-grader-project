import axios from "axios";
import { supabase } from "@/lib/supabase";

// Tất cả API call đều đi qua instance này
// baseURL trỏ đến FastAPI backend
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

function isTokenFresh(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" && payload.exp * 1000 > Date.now() + 30_000;
  } catch {
    return false;
  }
}

// Interceptor: Tự động gắn JWT token vào mọi request
// Ưu tiên đọc token còn hạn từ localStorage trước khi gọi supabase.auth.getSession()
apiClient.interceptors.request.use(async (config) => {
  if (typeof window !== "undefined") {
    const cachedToken = localStorage.getItem("supabase_access_token");
    if (cachedToken && isTokenFresh(cachedToken)) {
      config.headers.Authorization = `Bearer ${cachedToken}`;
      return config;
    }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || cachedToken;
      if (token) {
        if (session?.access_token) {
          localStorage.setItem("supabase_access_token", session.access_token);
        }
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      if (cachedToken) {
        config.headers.Authorization = `Bearer ${cachedToken}`;
      }
    }
  }
  return config;
});

// Interceptor: Xử lý lỗi toàn cục
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        // Chỉ redirect nếu không ở các trang auth công khai và phiên Supabase đã thực sự mất
        if (path !== "/login" && path !== "/register" && !path.startsWith("/auth")) {
          try {
            const { data } = await supabase.auth.getSession();
            if (!data?.session) {
              window.location.href = "/login";
            }
          } catch {
            window.location.href = "/login";
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
