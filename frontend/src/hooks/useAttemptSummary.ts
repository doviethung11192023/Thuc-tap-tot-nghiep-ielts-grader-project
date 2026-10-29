import { useState, useEffect } from "react";
import { getAttemptSummary } from "@/services/student-test-practice";
import { cleanReadingTest1Data } from "@/mocks/clean-dataset/reading-test-1-clean";
import { cleanListeningTest1Data } from "@/mocks/clean-dataset/listening-test-1-clean";

export interface CleanSummaryData {
  title: string;
  overall_band: number;
  correct_count: number;
  total_questions: number;
  time_spent: string;
  submitted_at: string;
  task_formats_result: any[];
}

function formatSubmittedDate(dateStr?: string): string {
  if (!dateStr) return "Hôm nay";
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const hours = d.getHours().toString().padStart(2, '0');
      const mins = d.getMinutes().toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      return `${hours}:${mins} ${day}/${month}/${year}`;
    }
  } catch (err) {
    console.warn("Date format error:", err);
  }
  return dateStr;
}

export function useAttemptSummary(attemptId: string | undefined, skill: string) {
  const isReading = skill === "reading";
  const defaultData = isReading ? cleanReadingTest1Data : cleanListeningTest1Data;

  const [data, setData] = useState<CleanSummaryData | null>(attemptId ? null : defaultData);
  const [loading, setLoading] = useState<boolean>(Boolean(attemptId));

  useEffect(() => {
    if (!attemptId) {
      setData(defaultData);
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);

    getAttemptSummary(attemptId)
      .then((res) => {
        if (!mounted || !res) return;
        setData({
          title: res.title || defaultData.title,
          overall_band: Number(res.overall_band ?? defaultData.overall_band),
          correct_count: Number(res.correct_count ?? defaultData.correct_count),
          total_questions: Number(res.total_questions || defaultData.total_questions),
          time_spent: res.time_spent_sec ? `${Math.round(res.time_spent_sec / 60)} phút` : defaultData.time_spent,
          submitted_at: formatSubmittedDate(res.submitted_at || defaultData.submitted_at),
          task_formats_result: res.task_formats_result?.length ? res.task_formats_result : defaultData.task_formats_result,
        });
      })
      .catch((err) => {
        console.warn("Could not load backend attempt summary, using fallback:", err);
        if (mounted) setData(defaultData);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [attemptId, skill]);

  return { data, loading };
}
