import apiClient from "@/lib/api-client";
import type { ExpertProfile } from "@/types";

// ============================================================
// API SERVICE: EXPERT (CHUYÊN GIA)
// ============================================================

// API: Lấy hồ sơ và trạng thái khả dụng của Expert (GET /api/v1/expert/me) (UC-14)
export async function getExpertProfile(): Promise<ExpertProfile> {
  const res = await apiClient.get("/api/v1/expert/me");
  return res.data;
}

// API: Cập nhật trạng thái nhận bài (PATCH /api/v1/expert/me/availability) (UC-14)
export async function updateExpertAvailability(payload: {
  is_available?: boolean;
  max_active_reviews?: number;
  bio?: string;
}): Promise<ExpertProfile> {
  const res = await apiClient.patch("/api/v1/expert/me/availability", payload);
  return res.data;
}
