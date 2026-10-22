import apiClient from "@/lib/api-client";
import type { UserProgress, LearnerGoal, User } from "@/types";

// ============================================================
// API SERVICE: USERS & LEARNER
// ============================================================

// API: Xem tiến trình học tập (GET /api/v1/users/me/progress)
export async function getUserProgress(): Promise<UserProgress> {
  const res = await apiClient.get("/api/v1/users/me/progress");
  return res.data.data;
}

// API: Cập nhật hồ sơ cá nhân (PUT /api/v1/users/me)
export async function updateProfile(payload: {
  full_name?: string;
  avatar_url?: string;
  voice_consent?: boolean;
}): Promise<User> {
  const res = await apiClient.put("/api/v1/users/me", payload);
  return res.data.data;
}

// API: Lấy mục tiêu IELTS của học viên (GET /api/v1/users/me/goals) (UC-05)
export async function getLearnerGoals(): Promise<LearnerGoal | null> {
  const res = await apiClient.get("/api/v1/users/me/goals");
  return res.data.data;
}

// API: Cập nhật mục tiêu IELTS của học viên (PUT /api/v1/users/me/goals) (UC-05)
export async function updateLearnerGoals(payload: {
  target_overall?: number;
  target_listening?: number;
  target_reading?: number;
  target_writing?: number;
  target_speaking?: number;
  test_date?: string;
}): Promise<LearnerGoal> {
  const res = await apiClient.put("/api/v1/users/me/goals", payload);
  return res.data.data;
}

// ============================================================
// API SERVICE: ADMIN
// ============================================================

// API: Xem log AI (GET /api/v1/admin/evaluations/logs) — Admin only
export async function getEvaluationLogs(params?: {
  essay_id?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const res = await apiClient.get("/api/v1/admin/evaluations/logs", { params });
  return res.data.data;
}

// API: Danh sách người dùng có phân trang, tìm kiếm và lọc theo role (GET /api/v1/admin/users) — Admin only (UC-19)
export async function getAdminUsers(params?: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}) {
  const res = await apiClient.get("/api/v1/admin/users", { params });
  return res.data.data;
}

// API: Khóa/mở khóa tài khoản (PUT /api/v1/admin/users/{userId}/status) — Admin only (UC-19)
export async function updateUserStatus(
  userId: string,
  payload: { is_active: boolean; reason?: string }
): Promise<void> {
  await apiClient.put(`/api/v1/admin/users/${userId}/status`, payload);
}

// API: Tạo tài khoản Expert (POST /api/v1/admin/experts) — Admin only (UC-19, FR-03)
export async function adminCreateExpert(payload: {
  email: string;
  full_name: string;
  bio?: string;
  max_active_reviews?: number;
}) {
  const res = await apiClient.post("/api/v1/admin/experts", payload);
  return res.data;
}

// API: Tạo / Phân quyền tài khoản Admin (POST /api/v1/admin/admins) — Admin only (UC-19)
export async function adminCreateAdmin(payload: {
  email: string;
  full_name: string;
}) {
  const res = await apiClient.post("/api/v1/admin/admins", payload);
  return res.data;
}

// API: Gửi lại email kích hoạt & tạo mật khẩu (POST /api/v1/admin/users/{userId}/resend-invite) — Admin only
export async function resendUserInvite(userId: string) {
  const res = await apiClient.post(`/api/v1/admin/users/${userId}/resend-invite`);
  return res.data;
}

// API: Kích hoạt tài khoản người dùng sau khi đặt mật khẩu (POST /api/v1/users/me/activate)
export async function activateAccount(): Promise<void> {
  await apiClient.post("/api/v1/users/me/activate");
}

// API: Thống kê hệ thống (GET /api/v1/admin/statistics) — Admin only
export async function getSystemStatistics() {
  const res = await apiClient.get("/api/v1/admin/statistics");
  return res.data.data;
}
