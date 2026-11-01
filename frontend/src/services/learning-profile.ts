import apiClient from "@/lib/api-client";
import type {
  LearningProfileOverviewData,
  LearningProfileTestPracticeData,
  GoalUpdatePayload,
} from "@/types/learning-profile";

export async function getLearningProfileOverview(): Promise<LearningProfileOverviewData> {
  const res = await apiClient.get<{ meta: { code: number }; data: LearningProfileOverviewData }>(
    "/api/v1/test-practice/learning-profile"
  );
  return res.data.data;
}

export async function getLearningProfileTestPractice(): Promise<LearningProfileTestPracticeData> {
  const res = await apiClient.get<{ meta: { code: number }; data: LearningProfileTestPracticeData }>(
    "/api/v1/test-practice/learning-profile/test-practice"
  );
  return res.data.data;
}

export async function updateLearningProfileGoals(payload: GoalUpdatePayload): Promise<any> {
  const res = await apiClient.put<{ meta: { code: number }; data: any }>(
    "/api/v1/test-practice/learning-profile/goals",
    payload
  );
  return res.data.data;
}
