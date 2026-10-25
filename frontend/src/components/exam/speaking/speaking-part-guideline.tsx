"use client";

import React from 'react';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';

interface SpeakingPartGuidelineProps {
  partNumber: 1 | 2 | 3;
  instructions: string;
  guidelines: string[];
  onBack: () => void;
  onStart: () => void;
}

export const SpeakingPartGuideline: React.FC<SpeakingPartGuidelineProps> = ({
  partNumber,
  instructions,
  guidelines,
  onBack,
  onStart,
}) => {
  return (
    <div className="relative min-h-screen w-full bg-gradient-to-b from-[#006ee6] via-[#007cf8] to-[#1a8aff] flex flex-col items-center justify-center p-4 sm:p-6 text-white overflow-hidden select-none">
      {/* Decorative twinkling stars */}
      <div className="absolute top-12 left-16 text-white/40 animate-pulse text-2xl">✦</div>
      <div className="absolute top-28 right-24 text-white/50 animate-pulse text-xl delay-300">✦</div>
      <div className="absolute bottom-24 left-20 text-white/30 animate-pulse text-lg delay-700">✦</div>
      <div className="absolute bottom-32 right-16 text-white/40 animate-pulse text-2xl delay-500">✦</div>
      <div className="absolute top-1/3 left-10 w-2 h-2 rounded-full bg-white/40 blur-[1px]"></div>
      <div className="absolute top-2/3 right-1/4 w-3 h-3 rounded-full bg-white/30 blur-[1px]"></div>
      <div className="absolute top-1/4 right-1/3 w-1.5 h-1.5 rounded-full bg-white/50"></div>

      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-6 left-6 p-3 rounded-2xl bg-white/90 hover:bg-white text-slate-700 shadow-md transition-transform hover:scale-105 active:scale-95"
        title="Quay lại"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Main Content Box */}
      <div className="relative z-10 w-full max-w-xl flex flex-col items-center">
        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white text-center mb-8 tracking-wide drop-shadow-sm">
          Hướng dẫn làm bài
        </h1>

        {/* White Card */}
        <div className="w-full bg-white rounded-3xl p-6 sm:p-8 text-slate-800 shadow-2xl relative">
          {/* Instructions */}
          <div className="text-sm leading-relaxed text-slate-700 mb-6 font-normal">
            <span className="font-semibold text-slate-900">
              Trong phần thi IELTS Speaking Part {partNumber},
            </span>{' '}
            {instructions.replace(`Trong phần thi IELTS Speaking Part ${partNumber}, `, '')}
          </div>

          {/* Guidelines Bullet points */}
          <div className="space-y-2 mb-8">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Bạn hãy lưu ý:
            </div>
            {guidelines.map((g, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></span>
                <span>{g}</span>
              </div>
            ))}
          </div>

          {/* Start Button */}
          <button
            onClick={onStart}
            className="w-full py-3.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all hover:gap-3 group text-sm sm:text-base"
          >
            <span>Bắt đầu làm bài</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {/* Sub-brand watermark */}
        <div className="mt-8 flex items-center gap-2 text-white/70 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          <span>MoonLab Virtual Speaking Room AI</span>
        </div>
      </div>
    </div>
  );
};
