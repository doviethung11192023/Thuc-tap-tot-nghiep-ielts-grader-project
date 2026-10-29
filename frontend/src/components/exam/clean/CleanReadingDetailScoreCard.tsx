"use client";

import React from 'react';

interface CleanReadingDetailScoreCardProps {
  title: string;
  overallBand: number;
  correctCount: number;
  totalQuestions: number;
}

export function CleanReadingDetailScoreCard({
  title,
  overallBand,
  correctCount,
  totalQuestions,
}: CleanReadingDetailScoreCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-4 md:p-5 flex items-center justify-between shadow-2xs">
      <div className="space-y-1">
        <h4 className="font-bold text-base text-zinc-900">{title}</h4>
        <p className="text-xs text-zinc-500 font-medium">Báo cáo đánh giá chi tiết từng câu hỏi</p>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-right">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">Band Score</span>
          <span className="text-3xl font-black text-[#932120]">{overallBand.toFixed(1)}</span>
        </div>
        <div className="text-right border-l border-zinc-200 pl-6">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">Số câu đúng</span>
          <span className="text-3xl font-black text-emerald-600">
            {correctCount}
            <span className="text-sm font-semibold text-zinc-400 ml-0.5">/{totalQuestions}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
