import apiClient from "@/lib/api-client";
import type { EssayResultsResponse } from "@/types";

// Xem kết quả chấm điểm (GET /api/v1/essays/{id}/results)
export async function getEssayResults(
  essayId: string
): Promise<EssayResultsResponse["data"]> {
  const res = await apiClient.get<EssayResultsResponse>(
    `/api/v1/essays/${essayId}/results`
  );
  return res.data.data;
}
