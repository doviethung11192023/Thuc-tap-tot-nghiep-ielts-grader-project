"use client";

import React from "react";
import { CheckCircle2, Archive, FileText, X, FolderKanban } from "lucide-react";
import type { ContentStatus } from "@/types/exam";

interface TestBulkActionBarProps {
  selectedCount: number;
  onBulkStatus: (status: ContentStatus) => void;
  onClearSelection: () => void;
  testSets?: { id: string; name: string }[];
  onBulkAssignSet?: (setId: string | null) => void;
}

export function TestBulkActionBar({
  selectedCount,
  onBulkStatus,
  onClearSelection,
  testSets,
  onBulkAssignSet,
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

        {testSets && testSets.length > 0 && onBulkAssignSet && (
          <div className="flex items-center gap-1.5 border-l border-zinc-700 pl-2">
            <FolderKanban className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <select
              defaultValue=""
              onChange={(e) => {
                const val = e.target.value;
                if (val === "__none__") onBulkAssignSet(null);
                else if (val) onBulkAssignSet(val);
                e.target.value = "";
              }}
              className="bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#932120] font-medium"
            >
              <option value="" disabled>Gán vào Bộ Đề...</option>
              {testSets.map((ts) => (
                <option key={ts.id} value={ts.id}>{ts.name}</option>
              ))}
              <option value="__none__">-- Gỡ khỏi bộ đề --</option>
            </select>
          </div>
        )}

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
