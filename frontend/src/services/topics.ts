import apiClient from "@/lib/api-client";
import type { Topic, PaginatedResponse } from "@/types";

// ============================================================
// API SERVICE: TOPICS (Đề thi)
// ============================================================

// API 5: Xem ngân hàng đề thi (GET /api/v1/topics)
export async function getTopics(params?: {
  page?: number;
  limit?: number;
  task_type?: "task1" | "task2";
  difficulty?: "easy" | "medium" | "hard";
  category?: string;
}): Promise<PaginatedResponse<Topic>["data"]> {
  const res = await apiClient.get<PaginatedResponse<Topic>>(
    "/api/v1/topics",
    { params }
  );
  return res.data.data;
}

// API 3: Tạo đề thi mới (POST /api/v1/topics) — Admin only
export async function createTopic(payload: {
  title: string;
  description?: string;
  prompt_content: string;
  task_type: "task1" | "task2";
  difficulty: "easy" | "medium" | "hard";
  category?: string;
}): Promise<{ topic_id: string }> {
  const res = await apiClient.post("/api/v1/topics", payload);
  return res.data.data;
}

// API 8: Sửa đề thi (PUT /api/v1/topics/{id}) — Admin only
export async function updateTopic(
  topicId: string,
  payload: Partial<{
    title: string;
    description: string;
    prompt_content: string;
    task_type: "task1" | "task2";
    difficulty: "easy" | "medium" | "hard";
    category: string;
  }>
): Promise<void> {
  await apiClient.put(`/api/v1/topics/${topicId}`, payload);
}

// API 8: Xóa đề thi (soft delete) — Admin only
export async function deleteTopic(topicId: string): Promise<void> {
  await apiClient.delete(`/api/v1/topics/${topicId}`);
}
