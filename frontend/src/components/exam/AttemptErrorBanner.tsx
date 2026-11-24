"use client";

import React from "react";
import { AlertTriangle, ArrowLeftRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface AttemptErrorBannerProps {
  skill: "reading" | "listening";
  testId: string;
  mode: "exam" | "practice";
  attemptError?: string | null;
  attemptErrorStatus?: number | null;
  returnUrl?: string;
}

export function AttemptErrorBanner({
  skill,
  testId,
  mode,
  attemptError,
  attemptErrorStatus,
  returnUrl,
}: AttemptErrorBannerProps) {
  const router = useRouter();
  if (!attemptError) return null;

  const switchMode = mode === "exam" ? "practice" : "exam";
  const allParts = skill === "listening" ? "1,2,3,4" : "1,2,3";
  const switchHref = `/test-practice/${skill}/${testId}?mode=${switchMode}&parts=${allParts}${
    returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : ""
  }`;

  return (
    <div
      role="alert"
      className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-2 shrink-0"
    >
      <div className="flex items-center gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <span className="font-bold">
          {attemptErrorStatus === 403 ? "Lưu ý phân quyền:" : "Chưa thể khởi tạo phiên làm bài:"}
        </span>
        <span className="truncate">
          {attemptErrorStatus === 403
            ? "Tài khoản Quản trị/Chuyên gia không thể nộp bài Học viên. Hãy đăng nhập tài khoản Học viên."
            : attemptError}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {attemptErrorStatus === 400 && (
          <button
            type="button"
            onClick={() => router.replace(switchHref)}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#932120] hover:bg-[#7a1a19] text-white font-bold text-xs transition-colors cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            Chuyển sang {switchMode === "exam" ? "Thi thử (Mock)" : "Luyện tập (Practice)"}
          </button>
        )}
        <button
          type="button"
          onClick={() => router.push("/test-practice")}
          className="px-3 py-1 rounded-lg border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 font-bold text-xs transition-colors cursor-pointer"
        >
          Chọn đề khác
        </button>
      </div>
    </div>
  );
}
