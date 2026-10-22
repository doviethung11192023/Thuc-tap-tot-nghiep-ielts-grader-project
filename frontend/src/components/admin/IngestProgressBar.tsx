"use client";

import React from "react";
import { Loader2 } from "lucide-react";

interface IngestProgressBarProps {
  progress: number;
  stageText: string;
}

export function IngestProgressBar({ progress, stageText }: IngestProgressBarProps) {
  return (
    <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
      <div className="flex items-center justify-between font-bold text-zinc-800 text-xs">
        <span className="flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#932120]" />
          Tiến độ nạp dữ liệu:
        </span>
        <span className="text-[#932120]">{progress}%</span>
      </div>
      <div className="w-full h-2 bg-zinc-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#932120] to-[#b91c1c] transition-all duration-300 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-[11px] text-zinc-500 italic truncate">{stageText}</p>
    </div>
  );
}
