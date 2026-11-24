"use client";

import React from 'react';
import { ArrowLeft, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { ExamTabularTimer } from '@/components/exam/shared/ExamTabularTimer';

interface WritingWorkspaceHeaderProps {
  mode: 'exam' | 'practice';
  parts?: string;
  wordCount: number;
  minWords: number;
  timerSeconds: number;
  onExitClick: () => void;
  onSubmitClick: () => void;
}

export function WritingWorkspaceHeader({
  mode,
  parts,
  wordCount,
  minWords,
  timerSeconds,
  onExitClick,
  onSubmitClick,
}: WritingWorkspaceHeaderProps) {
  const isWordCountMet = wordCount >= minWords;
  const examCapSeconds = parts === '2' ? 2400 : parts === '1' ? 1200 : 3600;

  return (
    <div className="bg-[var(--ux-surface)] border-b border-[var(--ux-line)] px-5 py-2.5 h-14 flex items-center justify-between shadow-xs shrink-0 z-20">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onExitClick}
          className="w-9 h-9 flex items-center justify-center hover:bg-zinc-100 rounded-xl transition-colors text-zinc-600 hover:text-zinc-900 cursor-pointer"
          title="Thoát phòng thi"
          aria-label="Thoát phòng thi"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 text-xs font-bold text-zinc-800 border border-zinc-200">
          <span className="w-2 h-2 rounded-full bg-[#932120]" aria-hidden="true" />
          <span>{mode === 'exam' ? 'Phòng thi giới hạn giờ' : 'Chế độ Luyện tập Writing'}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 h-9 px-3.5 rounded-xl text-xs sm:text-sm font-bold shadow-xs tabular-nums">
          <span className="text-zinc-500 uppercase text-[11px]">Độ dài:</span>
          <span className={isWordCountMet ? 'text-emerald-700' : 'text-amber-600'}>
            {wordCount} / {minWords} từ
          </span>
          {isWordCountMet
            ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            : <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />}
        </div>
        <ExamTabularTimer mode={mode} timerSeconds={timerSeconds} capSeconds={examCapSeconds} />
        <button
          type="button"
          onClick={onSubmitClick}
          className="flex items-center gap-2 bg-[#932120] text-white h-9 px-5 rounded-xl text-sm font-bold hover:bg-[#7a1a19] shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <Send className="w-4 h-4" /> Nộp bài
        </button>
      </div>
    </div>
  );
}
