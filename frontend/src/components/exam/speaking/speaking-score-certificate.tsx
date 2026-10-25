"use client";

import React from 'react';
import { Award, BarChart3, CheckCircle2, Sparkles } from 'lucide-react';
import { SpeakingSummaryDataset } from '@/mocks/exam-speaking';

interface SpeakingScoreCertificateProps {
  summary: SpeakingSummaryDataset;
  onViewDetail: () => void;
}

export const SpeakingScoreCertificate: React.FC<SpeakingScoreCertificateProps> = ({
  summary,
  onViewDetail,
}) => {
  return (
    <div className="w-full relative">
      {/* Certificate Card */}
      <div className="w-full bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-200/80 relative overflow-hidden">
        {/* Soft watermark background */}
        <div className="absolute right-12 top-1/2 -translate-y-1/2 text-slate-100 font-extrabold text-7xl sm:text-9xl pointer-events-none select-none tracking-widest opacity-40">
          MOONLAB
        </div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-8">
          {/* Left Column of Certificate */}
          <div className="flex-1 space-y-6">
            {/* Logo and Date */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-md shadow-blue-500/20">
                  M
                </div>
                <span className="font-extrabold text-slate-900 tracking-tight text-lg">
                  MoonLab <span className="text-blue-600 font-semibold text-xs ml-1">IELTS</span>
                </span>
              </div>

              <div className="text-xs font-semibold text-slate-400">
                {summary.completion_date}
              </div>
            </div>

            {/* Congratulation & Student Name */}
            <div className="space-y-1">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Chúc mừng!
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 capitalize">
                {summary.student_name}
              </h2>
              <p className="text-xs text-slate-500 line-clamp-2">
                Đã hoàn thành Speaking Test &ldquo;{summary.test_title}&rdquo;
              </p>
            </div>

            {/* Overall Score Banner */}
            <div className="flex items-baseline gap-3 pt-2">
              <span className="text-4xl sm:text-5xl font-black text-blue-600 tracking-tight font-mono">
                {summary.overall_band.toFixed(1)}
              </span>
              <span className="text-base sm:text-lg font-bold text-slate-700">
                Overall
              </span>
            </div>

            {/* 4 Criteria Grid (2x2) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              {/* FC */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-blue-50/50 border border-blue-100/60">
                <span className="px-2.5 py-1 rounded-xl bg-blue-600 text-white font-mono font-bold text-xs shadow-xs">
                  {summary.criteria_scores.fc.toFixed(1)}
                </span>
                <span className="text-xs font-semibold text-slate-700">
                  Fluency and Coherence
                </span>
              </div>

              {/* GRA */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-blue-50/50 border border-blue-100/60">
                <span className="px-2.5 py-1 rounded-xl bg-blue-600 text-white font-mono font-bold text-xs shadow-xs">
                  {summary.criteria_scores.gra.toFixed(1)}
                </span>
                <span className="text-xs font-semibold text-slate-700">
                  Grammatical Range & Accuracy
                </span>
              </div>

              {/* LR */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-blue-50/50 border border-blue-100/60">
                <span className="px-2.5 py-1 rounded-xl bg-blue-600 text-white font-mono font-bold text-xs shadow-xs">
                  {summary.criteria_scores.lr.toFixed(1)}
                </span>
                <span className="text-xs font-semibold text-slate-700">
                  Lexical Resource
                </span>
              </div>

              {/* PR */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-blue-50/50 border border-blue-100/60">
                <span className="px-2.5 py-1 rounded-xl bg-blue-600 text-white font-mono font-bold text-xs shadow-xs">
                  {summary.criteria_scores.pr.toFixed(1)}
                </span>
                <span className="text-xs font-semibold text-slate-700">
                  Pronunciation
                </span>
              </div>
            </div>

            {/* Performance by Part */}
            <div className="space-y-2 pt-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Performance by Part
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="w-3.5 h-1 rounded-xs bg-emerald-500"></span>
                    <span className="w-3.5 h-1 rounded-xs bg-emerald-500"></span>
                    <span className="w-3.5 h-1 rounded-xs bg-emerald-500"></span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-normal">Part 1: </span>
                    <span className="text-emerald-700">{summary.performance_by_part.part1}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="w-3.5 h-1 rounded-xs bg-blue-600"></span>
                    <span className="w-3.5 h-1 rounded-xs bg-blue-600"></span>
                    <span className="w-3.5 h-1 rounded-xs bg-blue-600"></span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-normal">Part 2: </span>
                    <span className="text-blue-700">{summary.performance_by_part.part2}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="w-3.5 h-1 rounded-xs bg-blue-600"></span>
                    <span className="w-3.5 h-1 rounded-xs bg-blue-600"></span>
                    <span className="w-3.5 h-1 rounded-xs bg-blue-600"></span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-normal">Part 3: </span>
                    <span className="text-blue-700">{summary.performance_by_part.part3}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Ribbon Huân chương Vàng danh dự */}
          <div className="w-full md:w-56 flex flex-col items-center justify-center shrink-0 self-center md:self-start">
            <div className="relative flex flex-col items-center animate-bounce-gentle">
              {/* Yellow Ribbons Hanging */}
              <div className="w-14 h-24 bg-gradient-to-b from-amber-400 to-amber-500 shadow-md rounded-b-lg -mb-16"></div>

              {/* Gold Medal Badge */}
              <div className="relative z-10 w-32 h-32 rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 p-1.5 shadow-xl flex items-center justify-center border-2 border-amber-200">
                <div className="w-full h-full rounded-full border-2 border-dashed border-white/60 flex flex-col items-center justify-center text-center p-2 text-white">
                  <Sparkles className="w-5 h-5 text-amber-100 mb-0.5" />
                  <span className="text-[10px] font-black tracking-widest uppercase">
                    MOONLAB
                  </span>
                  <span className="text-[9px] font-extrabold tracking-tighter text-amber-100">
                    SPEAKING TEST
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] font-medium text-slate-400 text-center mt-6">
              Verified by MoonLab IELTS
            </p>
          </div>
        </div>
      </div>

      {/* Primary Action Button under Certificate */}
      <div className="flex justify-center -mt-5 relative z-20">
        <button
          onClick={onViewDetail}
          className="px-8 py-3 bg-white hover:bg-blue-50 text-blue-600 hover:text-blue-700 font-bold text-xs sm:text-sm rounded-full shadow-lg border border-blue-200 transition-all hover:scale-105 active:scale-95"
        >
          Xem chi tiết
        </button>
      </div>
    </div>
  );
};
