"use client";

import React from 'react';
import { Loader2 } from 'lucide-react';

interface SkillSummarySkeletonProps {
  skillTitle: string;
}

export function SkillSummarySkeleton({ skillTitle }: SkillSummarySkeletonProps) {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 py-4 px-3 sm:px-6 animate-pulse font-sans">
      {/* Banner Top Skeleton */}
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 w-full md:w-2/3">
            <div className="h-6 w-52 bg-zinc-200 rounded-full" />
            <div className="h-8 w-72 bg-zinc-200 rounded-xl" />
            <div className="h-4 w-96 max-w-full bg-zinc-100 rounded-md" />
          </div>

          <div className="flex flex-col items-center justify-center p-5 bg-zinc-50 rounded-2xl border border-zinc-200 min-w-[170px] space-y-2">
            <div className="h-3 w-20 bg-zinc-200 rounded-md" />
            <div className="h-12 w-24 bg-zinc-200 rounded-xl" />
            <div className="h-4 w-28 bg-zinc-200 rounded-md" />
          </div>
        </div>

        {/* 3 Metric Cards Skeleton */}
        <div className="grid grid-cols-3 gap-3.5 pt-6 border-t border-zinc-100">
          <div className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200 space-y-2">
            <div className="h-3 w-16 bg-zinc-200 rounded" />
            <div className="h-7 w-12 bg-zinc-200 rounded" />
          </div>
          <div className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200 space-y-2">
            <div className="h-3 w-16 bg-zinc-200 rounded" />
            <div className="h-7 w-12 bg-zinc-200 rounded" />
          </div>
          <div className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200 space-y-2">
            <div className="h-3 w-16 bg-zinc-200 rounded" />
            <div className="h-7 w-12 bg-zinc-200 rounded" />
          </div>
        </div>
      </div>

      {/* Task Formats Breakdown Skeleton */}
      <div className="bg-white rounded-3xl border border-zinc-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-64 bg-zinc-200 rounded-lg" />
          <div className="h-4 w-32 bg-zinc-100 rounded" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-4 w-36 bg-zinc-200 rounded" />
                <div className="h-4 w-16 bg-zinc-200 rounded" />
              </div>
              <div className="w-full bg-zinc-200 h-2 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Bottom status indicator */}
      <div className="flex items-center justify-center gap-2 text-zinc-400 text-xs py-2">
        <Loader2 className="w-4 h-4 animate-spin text-[#932120]" />
        <span>Đang nạp kết quả và phân tích dạng bài thi {skillTitle}...</span>
      </div>
    </div>
  );
}
