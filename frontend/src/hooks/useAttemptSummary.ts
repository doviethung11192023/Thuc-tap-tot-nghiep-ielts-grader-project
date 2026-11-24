import { useState, useEffect } from "react";
import { getAttemptSummary } from "@/services/student-test-practice";

export interface CleanSummaryData {
  title: string;
  overall_band: number | null; // null: chưa đủ 40 câu nên không quy ra band (BR-03)
  correct_count: number;
  total_questions: number;
  time_spent: string;
  submitted_at: string;
  task_formats_result: any[];
}

function formatSubmittedDate(dateStr?: string): string {
  if (!dateStr) return "—";
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
  const [data, setData] = useState<CleanSummaryData | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(attemptId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!attemptId) {
      setData(null);
      setError("Không tìm thấy mã bài làm (attemptId). Vui lòng mở lại từ Lịch sử làm bài.");
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    getAttemptSummary(attemptId)
      .then((res) => {
        if (!mounted) return;
        if (!res) {
          setData(null);
          setError("Không tìm thấy bảng điểm cho bài làm này.");
          return;
        }
        setData({
          title: res.title || `IELTS ${skill === 'reading' ? 'Reading' : 'Listening'} Test`,
          overall_band: res.overall_band == null ? null : Number(res.overall_band),
          correct_count: Number(res.correct_count ?? 0),
          total_questions: Number(res.total_questions || 0),
          time_spent: res.time_spent_sec ? `${Math.round(res.time_spent_sec / 60)} phút` : "—",
          submitted_at: formatSubmittedDate(res.submitted_at),
          task_formats_result: Array.isArray(res.task_formats_result) ? res.task_formats_result : [],
        });
      })
      .catch((err) => {
        if (!mounted) return;
        setData(null);
        setError(err?.response?.data?.detail || "Không thể tải bảng điểm bài làm. Vui lòng thử lại sau.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [attemptId, skill]);

  return { data, loading, error };
}
