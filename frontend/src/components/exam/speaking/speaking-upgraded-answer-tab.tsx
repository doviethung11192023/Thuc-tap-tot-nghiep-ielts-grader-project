"use client";

import React from 'react';
import { Sparkles, CheckCircle2, Volume2 } from 'lucide-react';
import { UpgradedAnswerData } from '@/mocks/exam-speaking';

interface SpeakingUpgradedAnswerTabProps {
  data: UpgradedAnswerData;
}

export const SpeakingUpgradedAnswerTab: React.FC<SpeakingUpgradedAnswerTabProps> = ({ data }) => {
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
      {/* Introduction Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 p-5 rounded-3xl border border-blue-100/80 space-y-2">
        <div className="flex items-center gap-2 text-sm font-extrabold text-blue-900">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span>MoonLab đã nâng cấp trên bài của bạn</span>
        </div>
        <p className="text-xs text-blue-800 leading-relaxed">
          {data.description}
        </p>
      </div>

      {/* Upgraded Transcript Card */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 space-y-3 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Transcript bài nâng cấp
          </h4>
          <button
            onClick={() => handleSpeak(data.transcript)}
            className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Nghe đọc toàn bài</span>
          </button>
        </div>

        <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-sans">
          {data.transcript}
        </p>
      </div>

      {/* Upgraded Stats & Collocations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span>Có {data.collocations_count} Collocations trong bài nâng cấp</span>
          <span>Có {data.linking_devices_count} Linking devices</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
          {data.collocations.map((item) => (
            <div
              key={item.id}
              className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                  {item.id}
                </span>
                <span className="font-semibold text-slate-800 truncate">{item.phrase}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
