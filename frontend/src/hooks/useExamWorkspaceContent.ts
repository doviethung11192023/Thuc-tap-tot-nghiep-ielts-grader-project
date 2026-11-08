"use client";

import { useState, useEffect, useRef } from "react";
import { getAttemptExamContent, startTestAttempt } from "@/services/student-test-practice";
import { getExamContentCache, prefetchExamContent } from "@/services/exam-content-cache";
import {
  mapToReadingTestData,
  mapToListeningTestData,
  mapToWritingExamData,
  mapToSpeakingExamData,
} from "@/utils/exam-content-mapper";
import type { ListeningTestData } from "@/mocks/exam-listening";
import type { mockWritingExamDataset } from "@/mocks/exam-writing";
import type { MockSpeakingExamDataset } from "@/mocks/exam-speaking";
import type { ReadingTestData } from "@/types/exam";

export interface SavedWork {
  answers?: Record<string, string | string[]>;   // L/R: số câu -> câu trả lời
  essays?: { "1"?: string; "2"?: string };        // Writing
}

/** Bài Mock của đề này đã kết thúc (tự nộp khi hết giờ, hoặc đóng vì không có bài làm). */
export interface ClosedAttempt {
  attempt_id: string;
  status: string;
  auto_submitted: boolean;
  submitted_at: string | null;
}

export function useExamWorkspaceContent(
  testId: string,
  skill: "reading" | "listening" | "writing" | "speaking",
  mode: "exam" | "practice" = "practice"
) {
  // Tận dụng dữ liệu đã prefetch trước khi mở phòng thi. Đề Mock không prefetch được: chỉ tải qua attempt.
  const cached = mode === "exam" ? null : getExamContentCache(testId);
  const initR = skill === "reading" && cached ? mapToReadingTestData(cached) : null;
  const initL = skill === "listening" && cached ? mapToListeningTestData(cached) : null;
  const initW = skill === "writing" && cached ? mapToWritingExamData(cached) : null;
  const initS = skill === "speaking" && cached ? mapToSpeakingExamData(cached) : null;

  const [loading, setLoading] = useState<boolean>(!cached);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [deadlineMs, setDeadlineMs] = useState<number | null>(null); // hạn nộp của thi thử, theo đồng hồ client
  // Không bao giờ rơi về đề mẫu: làm đề giả trên attempt thật thì server chấm sai và lưu điểm sai
  const [readingData, setReadingData] = useState<ReadingTestData | null>(initR);
  const [listeningData, setListeningData] = useState<ListeningTestData | null>(initL);
  const [writingData, setWritingData] = useState<typeof mockWritingExamDataset | null>(
    (initW as typeof mockWritingExamDataset | null) || null);
  const [closedAttempt, setClosedAttempt] = useState<ClosedAttempt | null>(null);
  // Speaking không bao giờ rơi về đề giả: bài ghi âm phải gắn với câu hỏi thật.
  const [speakingData, setSpeakingData] = useState<MockSpeakingExamDataset | null>(initS);
  const [attemptMode, setAttemptMode] = useState<"practice" | "mock" | null>(null);
  const [attemptError, setAttemptError] = useState<string | null>(null);
  // Bài đã lưu trên server khi làm tiếp bài dở, kể cả trên máy khác (FR-11)
  const [savedWork, setSavedWork] = useState<SavedWork | null>(null);
  // Promise của lần bắt đầu attempt (1 lần duy nhất, kể cả khi StrictMode chạy effect hai lần)
  const startRef = useRef<Promise<{ attempt_id?: string } | null> | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadContent() {
      if (!testId) {
        if (mounted) setLoading(false);
        return;
      }

      // Khởi tạo phiên thi trong nền 1 lần duy nhất, tránh duplicate do React StrictMode
      if (!startRef.current) {
        startRef.current = startTestAttempt(testId, mode === "exam" ? "mock" : "practice", skill)
          .then((attemptRes) => {
            // Không chặn theo `mounted`: StrictMode (dev) chạy cleanup trước khi request xong
            // nhưng hasStartedRef khiến effect lần hai không gọi lại, nên attemptId sẽ mãi null.
            if (attemptRes?.closed) {
              // Quay lại bài Mock đã kết thúc: trang chuyển tới kết quả thay vì mở lại phòng thi
              setClosedAttempt(attemptRes as ClosedAttempt);
              return null;
            }
            if (attemptRes?.attempt_id) {
              setAttemptId(attemptRes.attempt_id);
              setAttemptMode(attemptRes.mode ?? null);   // attempt dở có thể khác mode trên URL
              setSavedWork(attemptRes.saved_work ?? null);
              if (attemptRes.deadline_at) {
                // Quy hạn của server về đồng hồ client để không phụ thuộc lệch giờ máy
                const serverNow = attemptRes.server_time ? Date.parse(attemptRes.server_time) : Date.now();
                setDeadlineMs(Date.now() + (Date.parse(attemptRes.deadline_at) - serverNow));
              }
            }
            return attemptRes;
          })
          .catch((e) => {
            console.warn("Could not start attempt session in background:", e);
            setAttemptError(e?.response?.data?.detail || "Không bắt đầu được bài thi");
            return null;
          });
      }

      // Tải và hiển thị nội dung đề thi ngay lập tức
      try {
        // Thi thử: nội dung chỉ trả cho chủ attempt (đề Mock không xem trước được)
        const contentData = mode === "exam"
          ? await startRef.current.then((a) => (a?.attempt_id ? getAttemptExamContent(a.attempt_id) : null))
          : cached ? cached : await prefetchExamContent(testId);
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
        console.warn(`Could not load ${skill} test content:`, err);
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
    deadlineMs,
    savedWork,
    closedAttempt,
    readingData,
    listeningData,
    writingData,
    speakingData,
  };
}
