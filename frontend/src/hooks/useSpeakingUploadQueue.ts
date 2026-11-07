"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RecordedAnswer } from "@/hooks/useSpeakingRecorder";
import {
  confirmSpeakingUpload,
  getConfirmedAnswers,
  putAudioToStorage,
  requestSpeakingUpload,
} from "@/services/speaking-room";

const MAX_TRIES = 3;

export interface AnswerState {
  status: "uploading" | "saved" | "failed";
  durationMs: number | null;
  /** Chỉ có với bản ghi trong phiên này; câu khôi phục sau khi tải lại trang không có. */
  blobUrl?: string;
  error?: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function httpStatus(err: unknown): number | undefined {
  return (err as { response?: { status?: number } })?.response?.status;
}

function errorDetail(err: unknown): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof detail === "string" ? detail : "Không lưu được câu trả lời";
}

/** 4xx là lỗi nghiệp vụ, thử lại không có ích. Lỗi mạng và 5xx thì tự thử lại (UC-10). */
function isPermanent(err: unknown): boolean {
  const status = httpStatus(err);
  return status !== undefined && status >= 400 && status < 500 && status !== 408 && status !== 429;
}

export function useSpeakingUploadQueue(attemptId: string) {
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [loaded, setLoaded] = useState(false);
  const recordings = useRef(new Map<string, RecordedAnswer>());
  const tails = useRef(new Map<string, Promise<void>>());
  const versions = useRef(new Map<string, number>());
  const blobUrls = useRef(new Set<string>());

  useEffect(() => {
    let active = true;
    getConfirmedAnswers(attemptId)
      .then((confirmed) => {
        if (!active) return;
        setAnswers((current) => {
          const restored: Record<string, AnswerState> = {};
          for (const item of confirmed) restored[item.question_id] = { status: "saved", durationMs: item.duration_ms };
          return { ...restored, ...current };
        });
      })
      .catch((err) => console.warn("Không tải được các câu đã lưu:", err))
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [attemptId]);

  useEffect(() => {
    const urls = blobUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const send = useCallback(
    async (questionId: string, recording: RecordedAnswer, version: number) => {
      const isStale = () => versions.current.get(questionId) !== version;
      let lastError: unknown;
      for (let attempt = 0; attempt < MAX_TRIES; attempt += 1) {
        if (isStale()) return;
        try {
          const ticket = await requestSpeakingUpload(attemptId, questionId, recording.mimeType);
          await putAudioToStorage(ticket, recording.blob);
          await confirmSpeakingUpload(attemptId, ticket.response_id, recording.durationMs);
          if (!isStale()) setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], status: "saved" } }));
          return;
        } catch (err) {
          lastError = err;
          if (isPermanent(err)) break;
          await sleep(1000 * 2 ** attempt);
        }
      }
      if (!isStale()) {
        const error = errorDetail(lastError);
        setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], status: "failed", error } }));
      }
    },
    [attemptId],
  );

  const enqueue = useCallback(
    (questionId: string, recording: RecordedAnswer) => {
      const version = (versions.current.get(questionId) ?? 0) + 1;
      versions.current.set(questionId, version);
      recordings.current.set(questionId, recording);
      const blobUrl = URL.createObjectURL(recording.blob);
      blobUrls.current.add(blobUrl);
      setAnswers((prev) => ({
        ...prev,
        [questionId]: { status: "uploading", durationMs: recording.durationMs, blobUrl },
      }));
      // Nối đuôi theo từng câu: PUT cũ không thể đè lên bản ghi mới hơn của cùng câu.
      const previous = tails.current.get(questionId) ?? Promise.resolve();
      tails.current.set(questionId, previous.then(() => send(questionId, recording, version)));
    },
    [send],
  );

  const retry = useCallback(
    (questionId: string) => {
      const recording = recordings.current.get(questionId);
      if (recording) enqueue(questionId, recording);
    },
    [enqueue],
  );

  /** Chờ mọi file được xử lý xong (trạng thái `uploading` của ST_speaking_room). */
  const waitForAll = useCallback(async () => {
    await Promise.all(tails.current.values());
  }, []);

  return { answers, loaded, enqueue, retry, waitForAll };
}
