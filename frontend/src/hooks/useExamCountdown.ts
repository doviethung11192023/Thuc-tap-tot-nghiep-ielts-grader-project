"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Đồng hồ phòng thi dùng chung cho Reading, Listening, Writing.
 *
 * - Thi thử: đếm ngược từ initialSeconds, không bao giờ vượt hạn server (deadlineMs, BR-07). Thời gian còn
 *   lại tính từ mốc kết thúc mỗi giây, không cộng trừ dồn, nên tab bị trình duyệt làm chậm cũng không lệch.
 * - Luyện tập: đếm tiến từ lúc mở bài.
 * - Hết giờ: gọi onExpire đúng một lần, với bài làm mới nhất (đọc qua ref).
 *
 * Interval chỉ dựng lại khi chế độ hoặc hạn đổi, không phải mỗi lần gõ phím hay chọn đáp án; trước đây
 * effect phụ thuộc vào bài làm nên gõ liên tục làm đồng hồ đứng.
 */
export function useExamCountdown(
  mode: "exam" | "practice",
  initialSeconds: number,
  deadlineMs: number | null | undefined,
  onExpire: () => void
): number {
  const [seconds, setSeconds] = useState<number>(mode === "exam" ? initialSeconds : 0);
  const startRef = useRef<number | null>(null);
  const onExpireRef = useRef(onExpire);
  const firedRef = useRef(false);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (startRef.current === null) startRef.current = Date.now();
    const start = startRef.current;
    const tick = () => {
      if (mode !== "exam") {
        setSeconds(Math.floor((Date.now() - start) / 1000));
        return;
      }
      const endAt = Math.min(start + initialSeconds * 1000, deadlineMs ?? Number.POSITIVE_INFINITY);
      const left = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setSeconds(left);
      if (left === 0 && !firedRef.current) {
        firedRef.current = true;
        onExpireRef.current();
      }
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [mode, initialSeconds, deadlineMs]);

  return seconds;
}
