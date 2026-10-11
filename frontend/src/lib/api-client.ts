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

// Interceptor: Tự động gắn JWT token vào mọi request
// (Lấy token trực tiếp từ Supabase session để đảm bảo luôn cập nhật khi token refresh)
apiClient.interceptors.request.use(async (config) => {
  if (typeof window !== "undefined") {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || localStorage.getItem("supabase_access_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      const token = localStorage.getItem("supabase_access_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  }
  return config;
});

// Interceptor: Xử lý lỗi toàn cục
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token hết hạn → redirect về login
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;
