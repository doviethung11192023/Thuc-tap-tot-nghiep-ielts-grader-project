"use client";

import React from "react";
import type { TestDifficulty } from "@/types/exam";

interface DifficultySelectorBarProps {
  difficulty: TestDifficulty;
  onSelect: (diff: TestDifficulty) => void;
  selectedCount: number;
  forceOverwrite?: boolean;
  onToggleOverwrite?: (val: boolean) => void;
}

export function DifficultySelectorBar({
  difficulty,
  onSelect,
  selectedCount,
  forceOverwrite = false,
  onToggleOverwrite,
}: DifficultySelectorBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs">
        <div className="text-zinc-600 font-semibold flex items-center gap-1">
          <span>Gán độ khó cho</span>
          <strong className="text-[#932120] font-bold">
            {selectedCount > 0 ? `${selectedCount} đề đang chọn` : "toàn bộ đề"}
          </strong>:
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onSelect("easy")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
              difficulty === "easy"
                ? "bg-emerald-700 text-white border-emerald-700 shadow-2xs"
                : "bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50"
            }`}
          >
            Dễ (Easy)
          </button>
          <button
            type="button"
            onClick={() => onSelect("medium")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
              difficulty === "medium"
                ? "bg-amber-700 text-white border-amber-700 shadow-2xs"
                : "bg-white text-amber-700 border-amber-300 hover:bg-amber-50"
            }`}
          >
            Vừa (Medium)
          </button>
          <button
            type="button"
            onClick={() => onSelect("hard")}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
              difficulty === "hard"
                ? "bg-[#932120] text-white border-[#932120] shadow-2xs"
                : "bg-white text-[#932120] border-red-300 hover:bg-red-50"
            }`}
          >
            Khó (Hard)
          </button>
        </div>
      </div>

      {onToggleOverwrite && (
        <label className="flex items-center justify-between gap-2 px-3 py-2 bg-amber-50/70 border border-amber-200 rounded-xl text-xs cursor-pointer select-none">
          <span className="text-amber-900 font-medium">
            Cho phép <strong className="font-bold text-[#932120]">nạp đè / cập nhật lại</strong> cả những đề đã tồn tại trong CSDL (cập nhật passage, câu hỏi & độ khó mới)
          </span>
          <input
            type="checkbox"
            checked={forceOverwrite}
            onChange={(e) => onToggleOverwrite(e.target.checked)}
            className="w-4 h-4 accent-[#932120] rounded cursor-pointer"
          />
        </label>
      )}
    </div>
  );
}
