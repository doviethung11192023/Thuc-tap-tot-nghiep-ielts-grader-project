import apiClient from "@/lib/api-client";
import type { UserProgress } from "@/types";

// ============================================================
// API SERVICE: USERS
// ============================================================

// API 4: Xem tiến trình học tập (GET /api/v1/users/me/progress)
export async function getUserProgress(): Promise<UserProgress> {
  const res = await apiClient.get("/api/v1/users/me/progress");
  return res.data.data;
}

// API 7: Cập nhật hồ sơ (PUT /api/v1/users/me)
export async function updateProfile(payload: {
  full_name?: string;
  avatar_url?: string;
}): Promise<{ id: string; email: string; full_name: string; avatar_url: string }> {
  const res = await apiClient.put("/api/v1/users/me", payload);
  return res.data.data;
}

// ============================================================
// API SERVICE: ADMIN
// ============================================================

// API 9: Xem log AI (GET /api/v1/admin/evaluations/logs) — Admin only
export async function getEvaluationLogs(params?: {
  essay_id?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const res = await apiClient.get("/api/v1/admin/evaluations/logs", { params });
  return res.data.data;
}

// API 10: Danh sách user (GET /api/v1/admin/users) — Admin only
export async function getAdminUsers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
}) {
  const res = await apiClient.get("/api/v1/admin/users", { params });
  return res.data.data;
}

// API 10: Khóa/mở khóa tài khoản — Admin only
export async function updateUserStatus(
  userId: string,
  payload: { is_active: boolean; reason?: string }
): Promise<void> {
  await apiClient.put(`/api/v1/admin/users/${userId}/status`, payload);
}

// API 11: Thống kê hệ thống (GET /api/v1/admin/statistics) — Admin only
export async function getSystemStatistics() {
  const res = await apiClient.get("/api/v1/admin/statistics");
  return res.data.data;
}
