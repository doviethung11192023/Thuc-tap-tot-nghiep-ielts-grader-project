"use client";

import { useEffect, useState } from "react";
import { getAttemptSummary } from "@/services/student-test-practice";
import { supabase } from "@/lib/supabase";

export interface SpeakingCriterionScore {
  code: "FC" | "LR" | "GRA" | "P";
  name: string;
  band: number;
  comment: string | null;
}

export interface SpeakingPronunciationEvidence {
  band: number;
  reliable: boolean;
  reliability_notes: string[];
  rubric_version: string;
  word_confidence?: number;     // thiếu ở bài chấm bằng rubric provisional-1
  phoneme_usable?: boolean;
  phoneme_accuracy: number;
  clear_word_ratio: number;
  final_consonant_deletions: number;
  th_substitutions: number;
  words_possibly_mispronounced: { word: string; substitutions: string[]; missing: string[] }[];
}

export interface SpeakingOverallReport {
  overall_summary?: string;
  priority_actions?: { focus: string; why: string; practice_activity: string }[];
  seven_day_plan?: { day: number; task: string }[];
}

export interface SpeakingAttemptSummary {
  title: string;
  status: string;
  mode: string;
  overall_band: number | null;
  speaking: {
    grading_done: boolean;
    criteria: SpeakingCriterionScore[];
    feedback: string | null;
    overall: SpeakingOverallReport | null;
    pronunciation: SpeakingPronunciationEvidence | null;
    speech_metrics: Record<string, number> | null;
  };
}

/** Polling chỉ để dự phòng: Realtime mới là đường báo chính (ADR-02). */
const POLL_INTERVAL_MS = 10_000;

export function useSpeakingAttemptSummary(attemptId?: string) {
  const [data, setData] = useState<SpeakingAttemptSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!attemptId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      if (timer) clearTimeout(timer);
      try {
        const next: SpeakingAttemptSummary = await getAttemptSummary(attemptId);
        if (cancelled) return;
        setData(next);
        setError(null);
        if (!next.speaking?.grading_done) timer = setTimeout(load, POLL_INTERVAL_MS);
      } catch (err) {
        if (cancelled) return;
        console.warn("Không tải được kết quả Speaking:", err);
        setError("Không tải được kết quả. Đang thử lại...");
        timer = setTimeout(load, POLL_INTERVAL_MS);
      }
    };

    const channel = supabase
      .channel(`speaking-attempt-${attemptId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "attempts", filter: `id=eq.${attemptId}` },
        () => void load(),
      )
      .subscribe();

    void load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [attemptId]);

  return { data, error };
}
