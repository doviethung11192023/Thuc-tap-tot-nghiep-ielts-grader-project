"use client";

import React from 'react';
import { BookOpen, Volume2, Sparkles } from 'lucide-react';
import { ModelAnswerData } from '@/mocks/exam-speaking';

interface SpeakingModelAnswerTabProps {
  data: ModelAnswerData;
}

export const SpeakingModelAnswerTab: React.FC<SpeakingModelAnswerTabProps> = ({ data }) => {
  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="space-y-6">
      {/* Target Band Banner */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-50 border border-emerald-200/70 text-xs text-emerald-900 font-semibold">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-600" />
          <span>{data.title}</span>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-mono font-bold text-xs">
          {data.band_target}
        </span>
      </div>

      {/* Model Transcript Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 space-y-3 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Transcript bài mẫu
          </h4>
          <button
            onClick={() => handleSpeak(data.transcript)}
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Nghe người bản xứ đọc</span>
          </button>
        </div>

        <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-sans font-normal">
          &ldquo;{data.transcript}&rdquo;
        </p>
      </div>

      {/* Vocabulary Notes from Teacher */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Từ vựng giáo viên gợi ý
        </h4>

        <div className="space-y-2.5">
          {data.vocabulary_notes.map((vocab, idx) => (
            <div
              key={idx}
              className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-1 text-xs"
            >
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-slate-900">{vocab.phrase}</span>
                <span className="text-[11px] text-slate-400 italic">({vocab.part_of_speech})</span>
              </div>
              <div className="text-slate-600 leading-relaxed">
                {vocab.definition}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
