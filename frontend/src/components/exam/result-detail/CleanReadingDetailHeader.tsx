"use client";

import React from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";

interface CleanReadingDetailHeaderProps {
  onBack?: () => void;
  onRetake: () => void;
}

export function CleanReadingDetailHeader({
  onBack,
  onRetake,
}: CleanReadingDetailHeaderProps) {
  return (
    <header className="bg-white border-b border-zinc-200 px-5 py-2.5 h-14 flex items-center justify-between shadow-2xs shrink-0 z-20">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack || onRetake}
          className="w-9 h-9 flex items-center justify-center hover:bg-zinc-100 rounded-xl transition-colors text-zinc-600 border border-zinc-200 cursor-pointer"
          title="Quay lại bảng kết quả"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#932120] flex items-center justify-center text-white font-black text-sm shadow-xs">
            M
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-tight text-zinc-900 block leading-none">
              MoonLab
            </span>
            <span className="text-[10px] text-zinc-400 font-medium tracking-wider">
              IELTS RESULT DETAIL
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onRetake}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-zinc-300 hover:border-zinc-400 text-zinc-700 bg-white hover:bg-zinc-50 font-semibold text-xs transition-all shadow-2xs cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Làm lại</span>
        </button>
        <button
          type="button"
          onClick={onBack || onRetake}
          className="px-4 py-1.5 rounded-full bg-[#932120] hover:bg-[#7a1a19] text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
        >
          Hoàn thành
        </button>
      </div>
    </header>
  );
}
