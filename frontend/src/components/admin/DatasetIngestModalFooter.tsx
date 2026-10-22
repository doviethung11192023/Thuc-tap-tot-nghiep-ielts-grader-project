"use client";

import React from "react";
import { Loader2, CheckCircle2, ArrowRight, RefreshCw } from "lucide-react";
import type { IngestResponse } from "@/types/exam";

interface DatasetIngestModalFooterProps {
  result: IngestResponse | null;
  loading: boolean;
  selectedCount: number;
  onResetResult: () => void;
  onClose: () => void;
  onIngest: () => void;
}

export function DatasetIngestModalFooter({
  result,
  loading,
  selectedCount,
  onResetResult,
  onClose,
  onIngest
}: DatasetIngestModalFooterProps) {
  if (result) {
    return (
      <div className="mt-4 flex items-center justify-between pt-3.5 border-t border-zinc-100">
        <button
          type="button"
          onClick={onResetResult}
          className="text-xs text-zinc-500 hover:text-zinc-800 flex items-center gap-1 font-medium"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Nạp thêm các đề khác
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold flex items-center gap-2 shadow-sm text-xs transition-colors"
        >
          <CheckCircle2 className="w-4 h-4" /> Hoàn tất & Xem danh sách đề thi
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 flex items-center justify-between pt-3.5 border-t border-zinc-100">
      <div className="w-full flex items-center justify-between">
        <div className="text-xs text-zinc-500 font-medium">
          {selectedCount > 0 ? (
            <span>Đã chọn <strong className="text-[#932120] font-bold">{selectedCount}</strong> đề thi để nạp</span>
          ) : (
            <span>Chưa chọn đề nào (hãy tích chọn các đề bạn muốn nạp)</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border border-zinc-300 rounded-xl text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onIngest}
            disabled={loading || selectedCount === 0}
            className="px-5 py-2.5 bg-[#932120] text-white rounded-xl text-xs font-bold hover:bg-[#7a1a19] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-40"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Đang nạp {selectedCount} đề...
              </>
            ) : (
              <>
                Nạp {selectedCount} Đề Đã Chọn <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
