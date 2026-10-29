"use client";

import React, { useEffect, useState } from 'react';
import { Loader2, Headphones } from 'lucide-react';

export function CleanListeningDetailSkeleton() {
  const [progress, setProgress] = useState(15);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => (prev < 90 ? prev + Math.floor(Math.random() * 15) + 5 : 90));
    }, 150);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col h-[calc(100vh-4.25rem)] w-full bg-zinc-100 overflow-hidden font-sans animate-in fade-in duration-200">
      {/* 1. TOP HEADER SKELETON */}
      <header className="bg-white border-b border-zinc-200 px-5 py-2.5 h-14 flex items-center justify-between shadow-2xs shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-100 animate-pulse border border-zinc-200" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-base shadow-xs">
              M
            </div>
            <div className="flex flex-col gap-1">
              <div className="h-4 w-20 bg-zinc-200 rounded animate-pulse" />
              <div className="h-2.5 w-16 bg-zinc-100 rounded animate-pulse" />
            </div>
          </div>
        </div>

        {/* Dynamic Loading Progress Bar */}
        <div className="flex flex-col items-center gap-1.5 w-64 max-w-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-600">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#932120]" />
            <span>Đang nạp dữ liệu bài thi Listening...</span>
            <span className="font-mono text-zinc-800 text-[11px]">{progress}%</span>
          </div>
          <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#932120] rounded-full transition-all duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="h-8 w-24 bg-zinc-100 rounded-full animate-pulse border border-zinc-200" />
          <div className="h-8 w-28 bg-blue-100 rounded-full animate-pulse" />
        </div>
      </header>

      {/* 2. AUDIO BAR SKELETON */}
      <div className="bg-white border-b border-zinc-200 px-5 py-1.5 h-12 flex items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-zinc-100 animate-pulse" />
          <div className="w-8 h-8 rounded-full bg-zinc-200 animate-pulse" />
          <div className="w-8 h-8 rounded-full bg-zinc-100 animate-pulse" />
        </div>
        <div className="flex-1 h-2 bg-zinc-200 rounded-full animate-pulse" />
        <div className="w-32 h-5 bg-zinc-100 rounded animate-pulse" />
      </div>

      {/* 3. SPLIT VIEW SKELETON */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Transcript */}
        <div className="w-1/2 h-full bg-white p-6 border-r border-zinc-200 space-y-4 overflow-hidden">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
            <Headphones className="w-4 h-4 text-blue-600" />
            <div className="h-4 w-48 bg-zinc-200 rounded animate-pulse" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-3.5 rounded-2xl border border-zinc-200/80 bg-zinc-50/50 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-zinc-200 animate-pulse" />
                    <div className="h-3 w-20 bg-zinc-200 rounded animate-pulse" />
                  </div>
                  <div className="h-5 w-14 bg-zinc-200 rounded-lg animate-pulse" />
                </div>
                <div className="space-y-1.5 pl-8">
                  <div className="h-3 w-full bg-zinc-200/80 rounded animate-pulse" />
                  <div className="h-3 w-5/6 bg-zinc-200/70 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Pane: Score Card & Questions */}
        <div className="w-1/2 h-full bg-zinc-50/60 p-6 space-y-5 overflow-hidden">
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-zinc-200 animate-pulse" />
              <div className="space-y-1">
                <div className="h-4 w-28 bg-zinc-200 rounded animate-pulse" />
                <div className="h-3 w-36 bg-zinc-100 rounded animate-pulse" />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="h-8 w-14 bg-zinc-200 rounded animate-pulse" />
              <div className="h-8 w-16 bg-zinc-200 rounded animate-pulse" />
            </div>
          </div>

          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-3 shadow-2xs">
                <div className="h-4 w-3/4 bg-zinc-200 rounded animate-pulse" />
                <div className="h-10 w-full bg-zinc-100 rounded-xl animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
