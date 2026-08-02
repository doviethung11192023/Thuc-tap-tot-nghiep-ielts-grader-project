import axios from "axios";

// Tất cả API call đều đi qua instance này
// baseURL trỏ đến FastAPI backend
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor: Tự động gắn JWT token vào mọi request
// (Token lấy từ Supabase session)
apiClient.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("supabase_access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
