"use client";

import { useState, useEffect } from "react";
import { startTestAttempt } from "@/services/student-test-practice";
import { getExamContentCache, prefetchExamContent } from "@/services/exam-content-cache";
import {
  mapToReadingTestData,
  mapToListeningTestData,
  mapToWritingExamData,
  mapToSpeakingExamData,
} from "@/utils/exam-content-mapper";
import { mockReadingFullTest } from "@/mocks/exam-reading";
import { mockListeningFullTest, type ListeningTestData } from "@/mocks/exam-listening";
import { mockWritingExamDataset } from "@/mocks/exam-writing";
import { mockSpeakingExamDataset, type MockSpeakingExamDataset } from "@/mocks/exam-speaking";
import type { ReadingTestData } from "@/types/exam";

export function useExamWorkspaceContent(
  testId: string,
  skill: "reading" | "listening" | "writing" | "speaking",
  mode: "exam" | "practice" = "practice"
) {
  // Tận dụng dữ liệu đã prefetch trước khi mở phòng thi
  const cached = getExamContentCache(testId);
  const initR = skill === "reading" && cached ? mapToReadingTestData(cached) : null;
  const initL = skill === "listening" && cached ? mapToListeningTestData(cached) : null;
  const initW = skill === "writing" && cached ? mapToWritingExamData(cached) : null;
  const initS = skill === "speaking" && cached ? mapToSpeakingExamData(cached) : null;

  const [loading, setLoading] = useState<boolean>(!cached);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [readingData, setReadingData] = useState<ReadingTestData>(initR || mockReadingFullTest);
  const [listeningData, setListeningData] = useState<ListeningTestData>(initL || mockListeningFullTest);
  const [writingData, setWritingData] = useState<typeof mockWritingExamDataset>((initW as any) || mockWritingExamDataset);
  const [speakingData, setSpeakingData] = useState<MockSpeakingExamDataset>(initS || mockSpeakingExamDataset);

  useEffect(() => {
    let mounted = true;

    async function loadContent() {
      if (!testId) {
        if (mounted) setLoading(false);
        return;
      }

      // Chạy song song nạp đề và khởi tạo phiên thi
      const contentPromise = cached ? Promise.resolve(cached) : prefetchExamContent(testId);
      const attemptPromise = startTestAttempt(testId, mode === "exam" ? "mock" : "practice", skill).catch((e) => {
        console.warn("Could not start attempt session:", e);
        return null;
      });

      try {
        const [contentData, attemptRes] = await Promise.all([contentPromise, attemptPromise]);

        if (mounted && attemptRes?.attempt_id) {
          setAttemptId(attemptRes.attempt_id);
        }

        if (mounted && contentData && !cached) {
          if (skill === "reading") {
            const mapped = mapToReadingTestData(contentData);
            if (mapped) setReadingData(mapped);
          } else if (skill === "listening") {
            const mapped = mapToListeningTestData(contentData);
            if (mapped) setListeningData(mapped);
          } else if (skill === "writing") {
            const mapped = mapToWritingExamData(contentData);
            if (mapped) setWritingData(mapped as typeof mockWritingExamDataset);
          } else if (skill === "speaking") {
            const mapped = mapToSpeakingExamData(contentData);
            if (mapped) setSpeakingData(mapped);
          }
        }
      } catch (err) {
        console.warn(`Fallback to mock ${skill} workspace data:`, err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadContent();
    return () => {
      mounted = false;
    };
  }, [testId, skill, mode]);

  return {
    loading,
    attemptId,
    readingData,
    listeningData,
    writingData,
    speakingData,
  };
}
