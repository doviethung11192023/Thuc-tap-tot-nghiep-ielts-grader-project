import apiClient from "@/lib/api-client";
import type {
  LearningProfileOverviewData,
  LearningProfileTestPracticeData,
  GoalUpdatePayload,
  StreakSummaryData,
  StudyPlanUpdatePayload,
  LearnerNextStep,
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

/** Thẻ "Bước tiếp theo": tính lại mỗi lần xem (spec 005) */
export async function getLearnerNextStep(): Promise<LearnerNextStep> {
  const res = await apiClient.get<{ meta: { code: number }; data: LearnerNextStep }>(
    "/api/v1/test-practice/learning-profile/next-step"
  );
  return res.data.data;
}

export async function updateLearningProfileGoals(payload: GoalUpdatePayload): Promise<unknown> {
  const res = await apiClient.put<{ meta: { code: number }; data: unknown }>(
    "/api/v1/test-practice/learning-profile/goals",
    payload
  );
  return res.data.data;
}

export async function getStreakSummary(): Promise<StreakSummaryData> {
  const res = await apiClient.get<{ meta: { code: number }; data: StreakSummaryData }>(
    "/api/v1/test-practice/learning-profile/streak-summary"
  );
  return res.data.data;
}

export async function updateStudyPlan(payload: StudyPlanUpdatePayload): Promise<unknown> {
  const res = await apiClient.put<{ meta: { code: number }; data: unknown }>(
    "/api/v1/test-practice/learning-profile/study-plan",
    payload
  );
  return res.data.data;
}

export async function claimStreakRepair(): Promise<{
  restored: boolean;
  current_streak: number;
  longest_streak: number;
}> {
  const res = await apiClient.post<{
    meta: { code: number };
    data: { restored: boolean; current_streak: number; longest_streak: number };
  }>("/api/v1/test-practice/learning-profile/streak/repair", {});
  return res.data.data;
}
