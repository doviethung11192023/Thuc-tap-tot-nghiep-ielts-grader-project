"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { saveAttemptWork, type SaveAttemptWorkPayload } from "@/services/student-test-practice";

/**
 * Tự lưu bài lên server trong lúc làm bài (FR-11, NFR-03; spec 004).
 *
 * - Lưu sau khi ngừng gõ ~2 s, cộng độ trễ ngẫu nhiên để Learner bắt đầu cùng lúc không lưu cùng giây
 *   (spec 004 FR-019); gõ liên tục thì vẫn lưu ít nhất mỗi 12 s.
 * - Lỗi mạng: giữ bài trong bộ nhớ, thử lại với thời gian chờ tăng dần, không mất chữ đã gõ.
 * - 409/404 (đã nộp, hoặc quá deadline + 30 s): dừng lưu. Bài được chấm bằng bản đã lưu trước hạn.
 * - Chuyển tab hoặc đóng trang: lưu ngay phần đang chờ.
 */
export type AutosaveStatus = "idle" | "pending" | "saving" | "saved" | "retrying" | "closed";

const DEBOUNCE_MS = 2000;
const JITTER_MS = 1500;
const MAX_WAIT_MS = 12000;
const MAX_RETRY_MS = 30000;

export function useServerAutosave(attemptId: string | null, payload: SaveAttemptWorkPayload | null) {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const attemptRef = useRef(attemptId);
  const latestRef = useRef<string | null>(null);       // bản mới nhất trên màn hình
  const sentRef = useRef<string | null>(null);         // bản server đã nhận
  const firstChangeRef = useRef<number | null>(null);
  const failuresRef = useRef(0);
  const closedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef<() => Promise<void>>(async () => {});

  const schedule = useCallback((delay: number, run: () => void) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(run, delay);
  }, []);

  const save = useCallback(async () => {
    const id = attemptRef.current;
    const body = latestRef.current;
    if (!id || !body || closedRef.current) return;
    if (body === sentRef.current) {
      setStatus("saved");
      return;
    }
    setStatus("saving");
    try {
      await saveAttemptWork(id, JSON.parse(body));
      sentRef.current = body;
      failuresRef.current = 0;
      firstChangeRef.current = null;
      setSavedAt(new Date());
      if (latestRef.current === body) {
        setStatus("saved");
      } else {
        setStatus("pending");
        schedule(DEBOUNCE_MS, () => void saveRef.current());
      }
    } catch (err) {
      const code = isAxiosError(err) ? err.response?.status : undefined;
      if (code === 409 || code === 404) {
        closedRef.current = true;
        setStatus("closed");
        return;
      }
      failuresRef.current += 1;
      setStatus("retrying");
      schedule(Math.min(MAX_RETRY_MS, 2000 * 2 ** failuresRef.current), () => void saveRef.current());
    }
  }, [schedule]);

  useEffect(() => {
    attemptRef.current = attemptId;
    saveRef.current = save;
  }, [attemptId, save]);

  useEffect(() => {
    if (!attemptId || !payload || closedRef.current) return;
    const body = JSON.stringify(payload);
    latestRef.current = body;
    if (body === sentRef.current) return;
    if (sentRef.current === null && firstChangeRef.current === null && !hasContent(payload)) {
      sentRef.current = body;          // bản rỗng lúc mới mở bài: không cần lưu. Có chữ (gõ trước khi
      return;                          // attempt tạo xong, hoặc vừa khôi phục) thì vẫn lưu để chắc chắn
    }
    if (failuresRef.current > 0) return;           // đang chờ thử lại; lần thử sau gửi bản mới nhất
    firstChangeRef.current ??= Date.now();
    const waited = Date.now() - firstChangeRef.current;
    setStatus("pending");
    schedule(Math.max(0, Math.min(DEBOUNCE_MS + Math.random() * JITTER_MS, MAX_WAIT_MS - waited)), save);
  }, [attemptId, payload, save, schedule]);

  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === "hidden" && latestRef.current !== sentRef.current) void save();
    };
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", flush);
      window.removeEventListener("pagehide", flush);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [save]);

  return { status, savedAt };
}

function hasContent(payload: SaveAttemptWorkPayload): boolean {
  const answers = Object.values(payload.answers || {});
  return answers.some((v) => (Array.isArray(v) ? v.length > 0 : String(v ?? "").trim() !== ""))
    || Boolean(payload.task1_text?.trim()) || Boolean(payload.task2_text?.trim());
}

/** Chữ hiển thị cho trạng thái lưu. */
export function autosaveLabel(status: AutosaveStatus, savedAt: Date | null): string {
  const time = savedAt?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  switch (status) {
    case "saving": return "Đang lưu lên máy chủ…";
    case "pending": return "Có thay đổi chưa lưu";
    case "retrying": return "Mất kết nối, đang thử lưu lại (bài vẫn còn trên màn hình)";
    case "closed": return "Bài đã nộp";
    case "saved": return `Đã lưu lên máy chủ lúc ${time}`;
    default: return time ? `Đã lưu lên máy chủ lúc ${time}` : "Chưa có thay đổi";
  }
}
