"use client";

import React from "react";
import { CheckCircle2, Archive, FileText, X } from "lucide-react";
import type { ContentStatus } from "@/types/exam";

interface TestBulkActionBarProps {
  selectedCount: number;
  onBulkStatus: (status: ContentStatus) => void;
  onClearSelection: () => void;
}

export function TestBulkActionBar({
  selectedCount,
  onBulkStatus,
  onClearSelection,
}: TestBulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="bg-zinc-900 text-white px-5 py-3 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200 w-full">
      <div className="flex items-center gap-3">
        <span className="w-6 h-6 rounded-full bg-[#932120] text-white flex items-center justify-center text-xs font-black shadow-xs">
          {selectedCount}
        </span>
        <span className="text-xs sm:text-sm font-bold text-zinc-100">
          Đã chọn {selectedCount} bài thi
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => onBulkStatus("published")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-2xs"
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> Xuất bản tất cả
        </button>

        <button
          onClick={() => onBulkStatus("draft")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors shadow-2xs"
        >
          <FileText className="w-3.5 h-3.5" /> Chuyển sang Bản nháp
        </button>

        <button
          onClick={() => onBulkStatus("archived")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white text-xs font-bold transition-colors shadow-2xs"
        >
          <Archive className="w-3.5 h-3.5" /> Lưu trữ
        </button>

        <button
          onClick={onClearSelection}
          className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors ml-1"
          title="Bỏ chọn tất cả"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
