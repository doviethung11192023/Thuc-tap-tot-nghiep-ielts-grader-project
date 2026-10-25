"use client";

import React, { useState } from 'react';
import { Lightbulb, ChevronUp, ChevronDown, FileText, X } from 'lucide-react';
import { SpeakingIdeaStep } from '@/mocks/exam-speaking';

interface SpeakingAidsPanelProps {
  ideas?: SpeakingIdeaStep[];
  notes: string;
  onNotesChange: (val: string) => void;
}

export const SpeakingAidsPanel: React.FC<SpeakingAidsPanelProps> = ({
  ideas = [],
  notes,
  onNotesChange,
}) => {
  const [isIdeasCollapsed, setIsIdeasCollapsed] = useState(false);
  const [isNotesVisible, setIsNotesVisible] = useState(true);

  return (
    <div className="w-full lg:w-80 space-y-4 shrink-0 flex flex-col justify-start">
      {/* 💡 Ý tưởng Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-sm overflow-hidden">
        <button
          onClick={() => setIsIdeasCollapsed(!isIdeasCollapsed)}
          className="w-full flex items-center justify-between text-xs font-bold text-slate-800 pb-2 border-b border-slate-100"
        >
          <div className="flex items-center gap-2">
            <span className="text-amber-500 text-sm">💡</span>
            <span>Ý tưởng</span>
          </div>
          {isIdeasCollapsed ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {!isIdeasCollapsed && (
          <div className="pt-3 space-y-3 max-h-[280px] overflow-y-auto pr-1">
            {ideas.length > 0 ? (
              ideas.map((item) => (
                <div key={item.step} className="text-xs space-y-1">
                  <div className="font-bold text-slate-800">
                    Step {item.step}. {item.title}
                  </div>
                  <div className="text-slate-600 leading-relaxed text-[11px] bg-slate-50 p-2 rounded-xl border border-slate-100">
                    {item.example}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic">
                Hãy chuẩn bị các ý tưởng liên quan trực tiếp đến đề bài.
              </p>
            )}
          </div>
        )}
      </div>

      {/* 📝 Ghi chú Card (Yellow Sticky Pad) */}
      {isNotesVisible ? (
        <div className="bg-[#fff9e6] rounded-3xl border-2 border-[#ffcf48] p-4 shadow-sm space-y-2 relative">
          <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <span className="text-sm">📝</span>
              <span>Ghi chú</span>
            </div>
            <button
              onClick={() => setIsNotesVisible(false)}
              className="p-1 rounded-lg text-amber-700/60 hover:text-amber-900 hover:bg-amber-200/50 transition-colors"
              title="Đóng ghi chú"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Nhập ghi chú nháp trong 1 phút chuẩn bị..."
            rows={6}
            className="w-full bg-transparent resize-none border-none focus:outline-hidden text-xs text-amber-950 placeholder-amber-400/80 leading-relaxed font-sans"
          />
        </div>
      ) : (
        <button
          onClick={() => setIsNotesVisible(true)}
          className="w-full py-2.5 px-3 bg-[#fff9e6] border border-[#ffcf48] text-amber-900 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#fff3c4] transition-colors"
        >
          <span>📝 Mở lại sổ ghi chú</span>
        </button>
      )}
    </div>
  );
};
