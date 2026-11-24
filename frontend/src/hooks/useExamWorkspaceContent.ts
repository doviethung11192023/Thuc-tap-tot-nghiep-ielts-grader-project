"use client";

import { useState, useEffect, useRef } from "react";
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
import type { MockSpeakingExamDataset } from "@/mocks/exam-speaking";
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
  const [deadlineMs, setDeadlineMs] = useState<number | null>(null); // hạn nộp của thi thử, theo đồng hồ client
  const [readingData, setReadingData] = useState<ReadingTestData>(initR || mockReadingFullTest);
  const [listeningData, setListeningData] = useState<ListeningTestData>(initL || mockListeningFullTest);
  const [writingData, setWritingData] = useState<typeof mockWritingExamDataset>((initW as typeof mockWritingExamDataset | null) || mockWritingExamDataset);
  // Speaking không bao giờ rơi về đề giả: bài ghi âm phải gắn với câu hỏi thật.
  const [speakingData, setSpeakingData] = useState<MockSpeakingExamDataset | null>(initS);
  const [attemptMode, setAttemptMode] = useState<"practice" | "mock" | null>(null);
  const [attemptError, setAttemptError] = useState<string | null>(null);
  const [attemptErrorStatus, setAttemptErrorStatus] = useState<number | null>(null);
  const startedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const startKey = `${testId}:${skill}:${mode}`;

    async function loadContent() {
      if (!testId) {
        if (mounted) setLoading(false);
        return;
      }

      // Khởi tạo phiên thi 1 lần cho mỗi cặp (testId, skill, mode); tự reset khi chuyển chế độ
      if (startedKeyRef.current !== startKey) {
        startedKeyRef.current = startKey;
        setAttemptId(null);
        setAttemptMode(null);
        setAttemptError(null);
        setAttemptErrorStatus(null);
        setDeadlineMs(null);
        startTestAttempt(testId, mode === "exam" ? "mock" : "practice", skill)
          .then((attemptRes) => {
            if (startedKeyRef.current !== startKey) return;
            if (attemptRes?.attempt_id) {
              setAttemptId(attemptRes.attempt_id);
              setAttemptMode(attemptRes.mode ?? null);   // attempt dở có thể khác mode trên URL
              if (attemptRes.deadline_at) {
                // Quy hạn của server về đồng hồ client để không phụ thuộc lệch giờ máy
                const serverNow = attemptRes.server_time ? Date.parse(attemptRes.server_time) : Date.now();
                setDeadlineMs(Date.now() + (Date.parse(attemptRes.deadline_at) - serverNow));
              }
            }
          })
          .catch((e) => {
            if (startedKeyRef.current !== startKey) return;
            console.warn("Could not start attempt session in background:", e);
            setAttemptErrorStatus(e?.response?.status ?? null);
            setAttemptError(e?.response?.data?.detail || "Không bắt đầu được bài thi");
          });
      }

      // Tải và hiển thị nội dung đề thi ngay lập tức
      try {
        const currentCached = getExamContentCache(testId);
        const contentData = currentCached ? currentCached : await prefetchExamContent(testId);
        if (mounted && contentData && !currentCached) {
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
    attemptMode,
    attemptError,
    attemptErrorStatus,
    deadlineMs,
    readingData,
    listeningData,
    writingData,
    speakingData,
  };
}
