"use client";

import React from "react";
import { BookOpen, Layers } from "lucide-react";

export type AdminTestViewMode = "full" | "exercises";

interface AdminModeSwitcherProps {
  viewMode: AdminTestViewMode;
  onChange: (mode: AdminTestViewMode) => void;
  fullCount?: number;
  exercisesCount?: number;
}

export function AdminModeSwitcher({
  viewMode,
  onChange,
  fullCount,
  exercisesCount,
}: AdminModeSwitcherProps) {
  return (
    <div className="flex items-center gap-2 bg-zinc-100 p-1 rounded-2xl w-full sm:w-fit border border-zinc-200">
      <button
        onClick={() => onChange("full")}
        className={`flex-1 sm:flex-initial py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
          viewMode === "full"
            ? "bg-white text-zinc-900 shadow-2xs border border-zinc-200"
            : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60"
        }`}
      >
        <BookOpen className={`w-4 h-4 ${viewMode === "full" ? "text-[#932120]" : "text-zinc-400"}`} />
        <span>Bộ Đề Thi Đầy Đủ (Full Tests)</span>
        {fullCount !== undefined && (
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              viewMode === "full" ? "bg-zinc-100 text-zinc-700" : "bg-zinc-200 text-zinc-500"
            }`}
          >
            {fullCount}
          </span>
        )}
      </button>

      <button
        onClick={() => onChange("exercises")}
        className={`flex-1 sm:flex-initial py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
          viewMode === "exercises"
            ? "bg-[#932120] text-white shadow-xs"
            : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60"
        }`}
      >
        <Layers className={`w-4 h-4 ${viewMode === "exercises" ? "text-white" : "text-zinc-400"}`} />
        <span>Kho Bài Tập Theo Dạng (Micro)</span>
        {exercisesCount !== undefined && (
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
              viewMode === "exercises" ? "bg-white/20 text-white" : "bg-zinc-200 text-zinc-500"
            }`}
          >
            {exercisesCount}
          </span>
        )}
      </button>
    </div>
  );
}
