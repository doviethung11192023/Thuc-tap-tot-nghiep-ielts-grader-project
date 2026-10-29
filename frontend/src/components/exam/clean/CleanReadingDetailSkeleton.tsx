"use client";

import React, { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";

export function CleanReadingDetailSkeleton() {
  const [progress, setProgress] = useState(20);
  const [stage, setStage] = useState("Đang tải dữ liệu bài thi...");

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setProgress(55);
      setStage("Đang trích xuất dẫn chứng và bảng đối chiếu từ khóa...");
    }, 250);

    const timer2 = setTimeout(() => {
      setProgress(88);
      setStage("Đang hoàn tất phân tích chi tiết kết quả...");
    }, 600);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-4.25rem)] w-full bg-zinc-100 overflow-hidden font-sans">
      {/* 1. TOP PROGRESS BAR */}
      <div className="bg-white border-b border-zinc-200 px-6 py-3 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#932120] flex items-center justify-center text-white font-black text-sm">
            M
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-zinc-900">MoonLab</span>
              <span className="text-[10px] bg-red-50 text-[#932120] font-bold px-2 py-0.5 rounded-full border border-red-200">
                AI ANALYZER
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-medium">{stage}</p>
          </div>
        </div>

        <div className="w-64 max-w-xs space-y-1">
          <div className="flex justify-between text-[11px] font-bold text-zinc-600">
            <span className="flex items-center gap-1 text-[#932120]">
              <Sparkles className="w-3 h-3 text-[#932120]" />
              Tiến trình tải
            </span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200">
            <div
              className="h-full bg-gradient-to-r from-[#932120] to-red-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. SPLIT SKELETON: Left Passage / Right Questions */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Passage Skeleton */}
        <div className="w-1/2 h-full bg-white p-6 md:p-8 border-r border-zinc-200 space-y-5 animate-pulse overflow-hidden">
          <div className="h-4 bg-red-100/70 rounded w-1/4" />
          <div className="h-7 bg-zinc-200 rounded w-3/4 mx-auto" />
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <div className="h-4 bg-zinc-200 rounded w-full" />
              <div className="h-4 bg-zinc-200 rounded w-11/12" />
              <div className="h-4 bg-zinc-200 rounded w-4/5" />
            </div>
            <div className="space-y-2 pt-2">
              <div className="h-4 bg-zinc-200 rounded w-full" />
              <div className="h-4 bg-zinc-200 rounded w-10/12" />
              <div className="h-4 bg-zinc-200 rounded w-3/4" />
            </div>
            <div className="space-y-2 pt-2">
              <div className="h-4 bg-zinc-200 rounded w-full" />
              <div className="h-4 bg-zinc-200 rounded w-9/12" />
            </div>
          </div>
        </div>

        {/* Right Questions Skeleton */}
        <div className="w-1/2 h-full bg-zinc-50/60 p-6 space-y-5 animate-pulse overflow-hidden">
          {/* Score card skeleton */}
          <div className="h-28 bg-white rounded-2xl border border-zinc-200 p-4 space-y-3">
            <div className="h-5 bg-zinc-200 rounded w-1/3" />
            <div className="h-10 bg-zinc-100 rounded w-full" />
          </div>

          {/* Group header skeleton */}
          <div className="h-12 bg-zinc-200/60 rounded-xl" />

          {/* Question card skeletons */}
          <div className="space-y-3">
            <div className="h-24 bg-white rounded-xl border border-zinc-200 p-4 space-y-2">
              <div className="h-4 bg-zinc-200 rounded w-3/4" />
              <div className="h-8 bg-zinc-100 rounded w-1/2" />
            </div>
            <div className="h-24 bg-white rounded-xl border border-zinc-200 p-4 space-y-2">
              <div className="h-4 bg-zinc-200 rounded w-2/3" />
              <div className="h-8 bg-zinc-100 rounded w-1/2" />
            </div>
            <div className="h-24 bg-white rounded-xl border border-zinc-200 p-4 space-y-2">
              <div className="h-4 bg-zinc-200 rounded w-5/6" />
              <div className="h-8 bg-zinc-100 rounded w-1/2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
