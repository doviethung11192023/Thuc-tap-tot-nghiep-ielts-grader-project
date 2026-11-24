"use client";

import React, { useEffect } from "react";
import { RefreshCw, Home, AlertTriangle } from "lucide-react";
import { isChunkLoadError, tryAutoRecoverChunkError } from "@/lib/chunk-error-recovery";

export default function AppErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunk = isChunkLoadError(error);

  useEffect(() => {
    if (isChunk) {
      tryAutoRecoverChunkError();
    }
  }, [isChunk]);

  return (
    <div className="min-h-[70vh] w-full flex items-center justify-center bg-[#FAF8F5] px-4 py-12 text-zinc-900">
      <div className="max-w-md w-full rounded-2xl bg-white border border-zinc-200 shadow-lg p-6 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-black text-zinc-900">
            {isChunk ? "Đang cập nhật phiên bản mới..." : "Trang vừa gặp gián đoạn tạm thời"}
          </h2>
          <p className="text-xs leading-relaxed text-zinc-600">
            {isChunk
              ? "Hệ thống vừa cập nhật mã nguồn mới. Trình duyệt đang tự động tải lại phiên làm việc."
              : "Có thể kết nối mạng hoặc bộ nhớ trình duyệt vừa bị gián đoạn. Bài làm nháp của bạn vẫn được giữ an toàn."}
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-50 text-xs font-bold text-zinc-700 cursor-pointer"
          >
            Thử lại
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#932120] hover:bg-[#7a1a19] text-xs font-bold text-white shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Tải lại trang
          </button>
          <button
            type="button"
            onClick={() => { window.location.href = "/test-practice"; }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-xs font-bold text-zinc-700 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            Trang chủ
          </button>
        </div>
      </div>
    </div>
  );
}
