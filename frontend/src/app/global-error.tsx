"use client";

import React, { useEffect } from "react";
import { isChunkLoadError, tryAutoRecoverChunkError } from "@/lib/chunk-error-recovery";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (isChunkLoadError(error)) {
      tryAutoRecoverChunkError();
    }
  }, [error]);

  return (
    <html lang="vi">
      <body className="min-h-screen flex items-center justify-center bg-[#FAF8F5] text-zinc-900 font-sans p-4">
        <div className="max-w-md w-full rounded-2xl bg-white border border-zinc-200 shadow-lg p-6 text-center space-y-4">
          <h2 className="text-lg font-bold text-zinc-900">Hệ thống cần tải lại trang</h2>
          <p className="text-xs leading-relaxed text-zinc-600">
            Trình duyệt vừa gặp lỗi tải tài nguyên hoặc bộ nhớ tạm. Bấm nút bên dưới để khôi phục nhanh mà không mất dữ liệu đã lưu.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => reset()}
              className="px-4 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-bold text-zinc-700 cursor-pointer"
            >
              Thử lại
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-[#932120] text-xs font-bold text-white cursor-pointer"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
