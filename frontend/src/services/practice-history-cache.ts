import apiClient from "@/lib/api-client";
import { getLearningProfileOverview, getLearningProfileTestPractice } from "@/services/learning-profile";
import type { SkillScore } from "@/types/learning-profile";

export interface TimelineHistoryItem {
  id: string;
  test_id: string;
  title: string;
  skill: "Listening" | "Reading" | "Writing" | "Speaking";
  mode: "practice" | "mock";
  status: "scored" | "in_progress" | "completed";
  band: number;
  raw_score?: number;
  submitted_at: string;
  duration_min: number;
  sub_type?: string;
  month_label: string;
}

export interface PracticeHistorySummaryData {
  overall_score: number;
  radar_data: SkillScore[];
  question_types: Array<{
    type_name: string;
    skill: string;
    total_questions: number;
    correct: number;
    accuracy: number;
    last_practiced: string;
  }>;
  timeline_groups: Record<string, TimelineHistoryItem[]>;
  total_attempts: number;
}

let cachedSummary: PracticeHistorySummaryData | null = null;
let lastFetchedTs = 0;
const CACHE_TTL_MS = 60 * 1000;

function formatMonthLabel(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "Gần đây";
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `Tháng ${month}, ${year}`;
  } catch {
    return "Gần đây";
  }
}

export function getCachedPracticeHistory(): PracticeHistorySummaryData | null {
  if (cachedSummary && (Date.now() - lastFetchedTs < CACHE_TTL_MS) && cachedSummary.total_attempts > 0) {
    return cachedSummary;
  }
  return null;
}

export async function fetchPracticeHistoryData(force = false): Promise<PracticeHistorySummaryData> {
  if (!force && cachedSummary && (Date.now() - lastFetchedTs < CACHE_TTL_MS) && cachedSummary.total_attempts > 0) {
    return cachedSummary;
  }

  try {
    const [overviewData, practiceData, historyRes] = await Promise.all([
      getLearningProfileOverview().catch(() => null),
      getLearningProfileTestPractice().catch(() => null),
      apiClient.get<{ meta: { code: number }; data: { items: any[]; total: number } }>(
        "/api/v1/student/history?page=1&limit=50"
      ).catch(() => null),
    ]);

    const radar = overviewData?.radar_data || [
      { skill: "Writing", score: 5.0 },
      { skill: "Overview", score: 4.5 },
      { skill: "Listening", score: 5.5 },
      { skill: "Reading", score: 5.5 },
      { skill: "Speaking", score: 5.0 },
    ];

    const overall = overviewData?.goals?.predicted_band || overviewData?.dashboard_stats?.avg_band || 4.5;
    const rawItems = historyRes?.data?.data?.items || [];

    const timelineGroups: Record<string, TimelineHistoryItem[]> = {};
    for (const item of rawItems) {
      const dateStr = item.submitted_at || new Date().toISOString();
      const mLabel = formatMonthLabel(dateStr);
      if (!timelineGroups[mLabel]) {
        timelineGroups[mLabel] = [];
      }
      timelineGroups[mLabel].push({
        id: item.id,
        test_id: item.test_id,
        title: item.title,
        skill: item.skill,
        mode: item.mode || "practice",
        status: item.status || "scored",
        band: item.band ?? 0.0,
        raw_score: item.raw_score,
        submitted_at: dateStr,
        duration_min: item.duration_min || 60,
        sub_type: item.skill === "Reading" ? "Reading Passage" : `${item.skill} Practice`,
        month_label: mLabel,
      });
    }

    const summary: PracticeHistorySummaryData = {
      overall_score: Number(overall.toFixed(1)),
      radar_data: radar,
      question_types: practiceData?.question_type_report || [],
      timeline_groups: timelineGroups,
      total_attempts: historyRes?.data?.data?.total || rawItems.length,
    };

    if (rawItems.length > 0 || historyRes) {
      cachedSummary = summary;
      lastFetchedTs = Date.now();
    }
    return summary;
  } catch (err) {
    console.warn("Lỗi khi tải Practice History:", err);
    if (cachedSummary) return cachedSummary;
    throw err;
  }
}
