import apiClient from "@/lib/api-client";
import type {
  SubmitEssayResponse,
  EssayResultsResponse,
  EssayHistoryItem,
  PaginatedResponse,
} from "@/types";

// ============================================================
// API SERVICE: ESSAYS
// Tất cả các hàm gọi API liên quan đến bài viết
// Dựa theo file api_design_specification.md
// ============================================================

// API 1: Nộp bài viết (POST /api/v1/essays/evaluate)
// Trả về HTTP 202 + essay_id để theo dõi realtime
export async function submitEssay(payload: {
  content: string;
  topic_id: string | null;
  task_type: "task1" | "task2";
}): Promise<SubmitEssayResponse["data"]> {
  const res = await apiClient.post<SubmitEssayResponse>(
    "/api/v1/essays/evaluate",
    payload
  );
  return res.data.data;
}

// API 2: Xem kết quả chấm điểm (GET /api/v1/essays/{id}/results)
export async function getEssayResults(
  essayId: string
): Promise<EssayResultsResponse["data"]> {
  const res = await apiClient.get<EssayResultsResponse>(
    `/api/v1/essays/${essayId}/results`
  );
  return res.data.data;
}

// API 6: Lịch sử bài viết (GET /api/v1/essays)
export async function getEssayHistory(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<PaginatedResponse<EssayHistoryItem>["data"]> {
  const res = await apiClient.get<PaginatedResponse<EssayHistoryItem>>(
    "/api/v1/essays",
    { params }
  );
  return res.data.data;
}
