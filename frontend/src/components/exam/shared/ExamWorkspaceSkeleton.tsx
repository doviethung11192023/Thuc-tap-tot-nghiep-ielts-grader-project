"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface ExamWorkspaceSkeletonProps {
  skill?: "reading" | "listening" | "writing" | "speaking";
}

export function ExamWorkspaceSkeleton({ skill = "reading" }: ExamWorkspaceSkeletonProps) {
  const [progress, setProgress] = useState(25);

  useEffect(() => {
    const timer1 = setTimeout(() => setProgress(65), 180);
    const timer2 = setTimeout(() => setProgress(88), 450);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  const skillLabel =
    skill === "reading" ? "Reading" : skill === "listening" ? "Listening" : skill === "writing" ? "Writing" : "Speaking";

  return (
    <div className="fixed inset-0 z-40 bg-zinc-50 flex flex-col overflow-hidden select-none animate-in fade-in duration-150">
      {/* Top Animated Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-200 overflow-hidden z-50">
        <div
          className="h-full bg-gradient-to-r from-[#932120] via-rose-600 to-[#932120] transition-all duration-300 ease-out shadow-[0_0_8px_rgba(147,33,32,0.6)]"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Mock Header */}
      <header className="h-14 bg-white border-b border-zinc-200 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-zinc-200 animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-4 w-36 sm:w-48 bg-zinc-200 rounded animate-pulse" />
            <div className="h-2.5 w-24 bg-zinc-100 rounded animate-pulse hidden sm:block" />
          </div>
        </div>

        {/* Center Part Pills */}
        <div className="hidden md:flex items-center gap-1.5 bg-zinc-100 p-1 rounded-xl">
          <div className="px-3 py-1 bg-white rounded-lg text-xs font-bold text-[#932120] shadow-2xs">
            Phần 1
          </div>
          <div className="px-3 py-1 text-xs text-zinc-400 font-medium">Phần 2</div>
          <div className="px-3 py-1 text-xs text-zinc-400 font-medium">Phần 3</div>
        </div>

        {/* Right Timer & Exit Skeleton */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-20 bg-zinc-100 rounded-xl animate-pulse hidden sm:block" />
          <div className="h-8 w-24 bg-zinc-200 rounded-xl animate-pulse" />
        </div>
      </header>

      {/* Main Workspace Split Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Floating Center Status Badge */}
        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
          <div className="bg-white/95 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-zinc-200/80 shadow-xl flex items-center gap-3 animate-in zoom-in-95 duration-200">
            <Loader2 className="w-5 h-5 animate-spin text-[#932120]" />
            <div>
              <p className="text-xs sm:text-sm font-bold text-zinc-800">
                Đang thiết lập phòng thi {skillLabel}...
              </p>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Đang chuẩn bị đoạn văn & đồng bộ câu hỏi ({progress}%)
              </p>
            </div>
          </div>
        </div>

        {/* Left Column: Passage / Media Skeleton */}
        <div className="flex-1 p-6 sm:p-8 bg-white border-r border-zinc-200 overflow-y-auto space-y-5 opacity-60">
          <div className="space-y-2">
            <div className="h-6 w-3/5 bg-zinc-200 rounded-lg animate-pulse" />
            <div className="h-4 w-2/5 bg-zinc-100 rounded-lg animate-pulse" />
          </div>

          <div className="space-y-3 pt-3">
            <div className="h-3.5 w-full bg-zinc-100 rounded animate-pulse" />
            <div className="h-3.5 w-[96%] bg-zinc-100 rounded animate-pulse" />
            <div className="h-3.5 w-[92%] bg-zinc-100 rounded animate-pulse" />
            <div className="h-3.5 w-[85%] bg-zinc-100 rounded animate-pulse" />
          </div>

          <div className="space-y-3 pt-2">
            <div className="h-3.5 w-full bg-zinc-100 rounded animate-pulse" />
            <div className="h-3.5 w-[94%] bg-zinc-100 rounded animate-pulse" />
            <div className="h-3.5 w-[88%] bg-zinc-100 rounded animate-pulse" />
            <div className="h-3.5 w-[75%] bg-zinc-100 rounded animate-pulse" />
          </div>

          <div className="space-y-3 pt-2">
            <div className="h-3.5 w-full bg-zinc-100 rounded animate-pulse" />
            <div className="h-3.5 w-[90%] bg-zinc-100 rounded animate-pulse" />
            <div className="h-3.5 w-[80%] bg-zinc-100 rounded animate-pulse" />
          </div>
        </div>

        {/* Right Column: Question Panel Skeleton */}
        <div className="hidden lg:flex flex-1 flex-col bg-zinc-50/60 overflow-hidden opacity-60">
          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
            {/* Instructions box */}
            <div className="p-4 bg-white rounded-2xl border border-zinc-200/80 shadow-2xs space-y-2">
              <div className="h-4 w-40 bg-zinc-200 rounded animate-pulse" />
              <div className="h-3 w-5/6 bg-zinc-100 rounded animate-pulse" />
            </div>

            {/* Question Group Card */}
            <div className="p-5 bg-white rounded-2xl border border-zinc-200/80 shadow-2xs space-y-4">
              <div className="h-4 w-4/5 bg-zinc-200 rounded animate-pulse" />
              <div className="space-y-2.5 pt-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl border border-zinc-100 bg-zinc-50/50">
                    <div className="w-4 h-4 rounded-full bg-zinc-200 shrink-0" />
                    <div className="h-3.5 w-3/4 bg-zinc-200 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Question Palette Skeleton */}
          <div className="h-14 bg-white border-t border-zinc-200 px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((num) => (
                <div key={num} className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-400 text-xs font-bold flex items-center justify-center">
                  {num}
                </div>
              ))}
            </div>
            <div className="h-8 w-24 bg-zinc-200 rounded-xl shrink-0 animate-pulse ml-3" />
          </div>
        </div>
      </div>
    </div>
  );
}
