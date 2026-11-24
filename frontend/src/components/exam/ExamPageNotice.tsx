"use client";

import React from "react";
import Link from "next/link";

/** Thông báo thay cho phòng thi: không mở được bài, bài đã kết thúc, không tải được đề. */
export function ExamPageNotice({ message, href = "/test-practice", linkLabel = "Quay lại trang luyện thi" }:
  { message: string; href?: string; linkLabel?: string }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm text-zinc-700 max-w-md">{message}</p>
      <Link href={href} className="text-sm font-semibold text-[#932120] hover:underline">{linkLabel}</Link>
    </div>
  );
}

/** Lỗi khi nộp bài, hiện trên phòng thi để Learner thử nộp lại. */
export function SubmitErrorBanner({ message, onClose }: { message: string | null; onClose: () => void }) {
  if (!message) return null;
  return (
    <div role="alert" className="fixed top-4 left-1/2 -translate-x-1/2 z-[120] max-w-lg w-[calc(100%-2rem)] rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-lg flex items-start gap-3">
      <span className="flex-1">{message}</span>
      <button type="button" onClick={onClose} className="font-semibold text-red-900 hover:underline">Đóng</button>
    </div>
  );
}
