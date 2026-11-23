"use client";

import React from "react";
import { X, RotateCcw } from "lucide-react";
import type { SkillType, ContentStatus, AllowedMode, TestSet } from "@/types/exam";

interface TestFilterChipsProps {
  skill?: SkillType;
  status?: ContentStatus;
  testSetId?: string;
  allowedMode?: AllowedMode;
  sortBy: string;
  search: string;
  testSets: TestSet[];
  onRemoveSkill: () => void;
  onRemoveStatus: () => void;
  onRemoveTestSet: () => void;
  onRemoveMode: () => void;
  onRemoveSort: () => void;
  onRemoveSearch: () => void;
  onResetAll: () => void;
}

export function TestFilterChips({
  skill,
  status,
  testSetId,
  allowedMode,
  sortBy,
  search,
  testSets,
  onRemoveSkill,
  onRemoveStatus,
  onRemoveTestSet,
  onRemoveMode,
  onRemoveSort,
  onRemoveSearch,
  onResetAll,
}: TestFilterChipsProps) {
  const activeTestSetName = testSets.find((ts) => ts.id === testSetId)?.name;

  const hasAnyFilter = Boolean(
    skill || status || testSetId || allowedMode || search.trim() || sortBy !== "newest"
  );

  if (!hasAnyFilter) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100 text-xs">
      <span className="text-zinc-400 font-semibold uppercase text-[11px] tracking-wider mr-1">
        Đang lọc:
      </span>

      {skill && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-[#932120] border border-red-200/80 font-bold">
          Kỹ năng: {skill.toUpperCase()}
          <button onClick={onRemoveSkill} className="hover:text-black">
            <X className="w-3.5 h-3.5" />
          </button>
        </span>
      )}

      {status && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/80 font-bold">
          Trạng thái: {status === "published" ? "Đã xuất bản" : status === "draft" ? "Bản nháp" : "Lưu trữ"}
          <button onClick={onRemoveStatus} className="hover:text-black">
            <X className="w-3.5 h-3.5" />
          </button>
        </span>
      )}

      {testSetId && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200/80 font-bold">
          Bộ đề: {activeTestSetName || "Đã chọn"}
          <button onClick={onRemoveTestSet} className="hover:text-black">
            <X className="w-3.5 h-3.5" />
          </button>
        </span>
      )}

      {allowedMode && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-800 border border-zinc-200 font-bold">
          Chế độ: {allowedMode}
          <button onClick={onRemoveMode} className="hover:text-black">
            <X className="w-3.5 h-3.5" />
          </button>
        </span>
      )}

      {sortBy !== "newest" && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-800 border border-zinc-200 font-bold">
          Sắp xếp: {sortBy === "oldest" ? "Cũ nhất" : sortBy === "title_asc" ? "Tên A-Z" : sortBy === "title_desc" ? "Tên Z-A" : "Thời lượng"}
          <button onClick={onRemoveSort} className="hover:text-black">
            <X className="w-3.5 h-3.5" />
          </button>
        </span>
      )}

      {search.trim() && (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-800 border border-zinc-200 font-bold">
          Từ khóa: &ldquo;{search.trim()}&rdquo;
          <button onClick={onRemoveSearch} className="hover:text-black">
            <X className="w-3.5 h-3.5" />
          </button>
        </span>
      )}

      <button
        onClick={onResetAll}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-[#932120] hover:text-[#7a1a19] hover:underline font-bold transition-colors ml-auto"
      >
        <RotateCcw className="w-3.5 h-3.5" /> Đặt lại tất cả
      </button>
    </div>
  );
}
