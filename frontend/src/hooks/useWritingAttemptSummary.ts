"use client";

import { useEffect, useState } from "react";
import { getAttemptSummary } from "@/services/student-test-practice";

// Shape of `data.writing` returned by GET /api/v1/test-practice/attempts/{id}/summary
export interface WritingTaskSummary {
  task: "task1" | "task2" | string;
  essay_id: string;
  status: "pending" | "evaluating" | "completed" | "failed" | string;
  word_count: number;
  scores: {
    overall_band: number;
    task_response: number;
    coherence_cohesion: number;
    lexical_resource: number;
    grammatical_range_and_accuracy: number;
  } | null;
  task_subtype: string | null;
  strengths: string[];
  areas_to_improve: string[];
}

export interface WritingAttemptSummary {
  title: string;
  status: string;
  overallBand: number;
  submittedAt?: string;
  gradingDone: boolean;
  tasks: WritingTaskSummary[];
}

const POLL_INTERVAL_MS = 5000;

/**
 * Loads the Writing attempt summary and keeps polling while the AI is still grading
 * (each task takes ~1 minute and tasks are graded one after another).
 */
export function useWritingAttemptSummary(attemptId?: string) {
  const [data, setData] = useState<WritingAttemptSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!attemptId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      try {
        const res = await getAttemptSummary(attemptId);
        if (cancelled) return;
        const writing = res?.writing ?? { grading_done: false, tasks: [] };
        const next: WritingAttemptSummary = {
          title: res?.title ?? "",
          status: res?.status ?? "",
          overallBand: Number(res?.overall_band ?? 0),
          submittedAt: res?.submitted_at,
          gradingDone: Boolean(writing.grading_done) && res?.status !== "scoring",
          tasks: writing.tasks ?? [],
        };
        setData(next);
        setError(null);
        if (!next.gradingDone) timer = setTimeout(load, POLL_INTERVAL_MS);
      } catch (err) {
        if (cancelled) return;
        console.warn("Could not load writing attempt summary:", err);
        setError("Không tải được kết quả chấm. Đang thử lại...");
        timer = setTimeout(load, POLL_INTERVAL_MS);
      }
    };

    load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [attemptId]);

  return { data, error };
}
