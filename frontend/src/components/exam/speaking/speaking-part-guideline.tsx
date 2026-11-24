"use client";

import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';

export const PART_GUIDE_DISMISSED_KEY = 'moonlab_speaking_part_guide_dismissed';

export function isPartGuideDismissed(): boolean {
  try {
    return localStorage.getItem(PART_GUIDE_DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

interface SpeakingPartGuidelineProps {
  partNumber: 1 | 2 | 3;
  instructions: string;
  guidelines: string[];
  onBack: () => void;
  onStart: (dismissFuture?: boolean) => void;
  showDontShowAgain?: boolean;
}

export const SpeakingPartGuideline: React.FC<SpeakingPartGuidelineProps> = ({
  partNumber,
  instructions,
  guidelines,
  onBack,
  onStart,
  showDontShowAgain = true,
}) => {
  const [dismissFuture, setDismissFuture] = useState(false);

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-b from-slate-950 via-slate-900 to-[#3d1112] flex flex-col items-center justify-center p-4 sm:p-6 text-white overflow-hidden select-none">
      {/* Decorative twinkling stars */}
      <div className="absolute top-12 left-16 text-rose-300/30 animate-pulse text-2xl">✦</div>
      <div className="absolute top-28 right-24 text-rose-300/40 animate-pulse text-xl delay-300">✦</div>
      <div className="absolute bottom-24 left-20 text-white/20 animate-pulse text-lg delay-700">✦</div>
      <div className="absolute bottom-32 right-16 text-rose-200/30 animate-pulse text-2xl delay-500">✦</div>

      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-6 left-6 p-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 shadow-md transition-transform hover:scale-105 active:scale-95 cursor-pointer"
        title="Quay lại"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Main Content Box */}
      <div className="relative z-10 w-full max-w-xl flex flex-col items-center">
        <span className="px-3 py-1 rounded-full bg-[#932120]/30 border border-[#932120]/50 text-rose-200 text-xs font-bold uppercase tracking-wider mb-3">
          Part {partNumber}
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white text-center mb-7 tracking-wide drop-shadow-sm">
          Hướng dẫn làm bài
        </h1>

        <div className="w-full bg-slate-900/95 rounded-3xl p-6 sm:p-8 text-slate-100 border border-slate-700/80 shadow-2xl relative space-y-6">
          <div className="text-sm leading-relaxed text-slate-300 font-normal">
            <span className="font-semibold text-white">
              Trong phần thi IELTS Speaking Part {partNumber},
            </span>{' '}
            {instructions.replace(`Trong phần thi IELTS Speaking Part ${partNumber}, `, '')}
          </div>

          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Bạn hãy lưu ý:
            </div>
            {guidelines.map((g, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-[#932120] mt-2 shrink-0" />
                <span>{g}</span>
              </div>
            ))}
          </div>

          <div className="space-y-3 pt-1">
            {showDontShowAgain && (
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={dismissFuture}
                  onChange={(e) => setDismissFuture(e.target.checked)}
                  className="w-4 h-4 rounded text-[#932120] focus:ring-[#932120] border-slate-600 bg-slate-800"
                />
                <span>Không hiển thị lại hướng dẫn các phần</span>
              </label>
            )}

            <button
              onClick={() => onStart(dismissFuture)}
              className="w-full py-3.5 px-6 bg-[#932120] hover:bg-[#7a1a19] text-white font-bold rounded-full shadow-lg shadow-red-950/50 flex items-center justify-center gap-2 transition-all hover:gap-3 group text-sm sm:text-base cursor-pointer"
            >
              <span>Bắt đầu làm bài</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-2 text-white/60 text-xs font-medium">
          <Sparkles className="w-3.5 h-3.5" />
          <span>MoonLab Virtual Speaking Room AI</span>
        </div>
      </div>
    </div>
  );
};
