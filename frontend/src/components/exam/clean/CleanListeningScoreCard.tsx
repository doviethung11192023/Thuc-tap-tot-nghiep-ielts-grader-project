"use client";

import React from 'react';

interface CleanListeningScoreCardProps {
  userName?: string;
  submittedAt: string;
  overallBand: number;
  correctCount: number;
  totalQuestions: number;
}

export function CleanListeningScoreCard({
  userName = "long",
  submittedAt,
  overallBand,
  correctCount,
  totalQuestions
}: CleanListeningScoreCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-4 md:p-5 flex items-center justify-between shadow-2xs">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-xs">
          <span className="font-bold text-base">{userName.slice(0, 1).toUpperCase()}</span>
        </div>
        <div>
          <h4 className="font-bold text-sm md:text-base text-zinc-900">{userName}</h4>
          <p className="text-xs text-zinc-500">
            Ngày làm bài {submittedAt}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-right">
          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
            Điểm
          </div>
          <div className="text-xl font-black text-blue-600">
            {overallBand.toFixed(1)}
          </div>
        </div>

        <div className="text-right border-l border-zinc-200 pl-6">
          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
            Câu hỏi đúng
          </div>
          <div className="text-xl font-black text-emerald-600">
            {correctCount}
            <span className="text-xs font-semibold text-zinc-400 ml-0.5">
              /{totalQuestions}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
