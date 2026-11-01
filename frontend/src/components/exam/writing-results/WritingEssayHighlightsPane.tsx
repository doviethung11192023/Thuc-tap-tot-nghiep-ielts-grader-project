"use client";

import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { WritingHighlight } from '@/mocks/exam-writing';

interface WritingEssayHighlightsPaneProps {
  essayText: string;
  highlights: WritingHighlight[];
}

export function WritingEssayHighlightsPane({ essayText, highlights }: WritingEssayHighlightsPaneProps) {
  const [activeFilters, setActiveFilters] = useState<Record<string, boolean>>({
    error: true,
    coherence: true,
    lexical: true,
    strength: true
  });
  const [selectedHighlight, setSelectedHighlight] = useState<WritingHighlight | null>(null);

  const toggleFilter = (key: string) => {
    setActiveFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getHighlightClass = (category: string) => {
    switch (category) {
      case 'error':
        return 'bg-red-100 text-red-900 border-b-2 border-red-500 hover:bg-red-200 cursor-pointer px-1 rounded-sm';
      case 'coherence':
        return 'bg-amber-100 text-amber-900 border-b-2 border-amber-500 hover:bg-amber-200 cursor-pointer px-1 rounded-sm';
      case 'lexical':
        return 'bg-sky-100 text-sky-900 border-b-2 border-sky-500 hover:bg-sky-200 cursor-pointer px-1 rounded-sm';
      case 'strength':
        return 'bg-emerald-100 text-emerald-900 border-b-2 border-emerald-500 hover:bg-emerald-200 cursor-pointer px-1 rounded-sm';
      default:
        return '';
    }
  };

  const filterButtons = [
    { key: 'error', label: 'Lỗi', activeClass: 'bg-red-600 text-white shadow-xs', count: highlights.filter(h => h.category === 'error').length },
    { key: 'coherence', label: 'Lập luận', activeClass: 'bg-amber-600 text-white shadow-xs', count: highlights.filter(h => h.category === 'coherence').length },
    { key: 'lexical', label: 'Từ vựng', activeClass: 'bg-sky-700 text-white shadow-xs', count: highlights.filter(h => h.category === 'lexical').length },
    { key: 'strength', label: 'Điểm sáng', activeClass: 'bg-emerald-600 text-white shadow-xs', count: highlights.filter(h => h.category === 'strength').length },
  ];

  return (
    <div className="w-full lg:w-[55%] border-r border-zinc-200 bg-white flex flex-col h-full relative">
      <div className="p-3.5 bg-zinc-50/80 border-b border-zinc-200 shrink-0 flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-zinc-500 uppercase mr-1">Bộ lọc cờ:</span>
        {filterButtons.map(btn => (
          <button
            key={btn.key}
            onClick={() => toggleFilter(btn.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeFilters[btn.key] ? btn.activeClass : 'bg-zinc-200 text-zinc-600 opacity-60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-white"></span>
            {btn.label}: {btn.count}
          </button>
        ))}
      </div>

      <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-6">
        <div className="border-b border-zinc-100 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            BÀI VIẾT GỐC CỦA THÍ SINH • Click vào đoạn gạch chân để xem góp ý
          </h3>
        </div>

        <div className="font-serif text-lg leading-relaxed text-zinc-800 space-y-4">
          {essayText.split('\n\n').map((para, pIdx) => (
            <p key={pIdx} className="leading-relaxed">
              {para.split('. ').map((sentence, sIdx) => {
                const matchedHighlight = highlights.find(h => 
                  sentence.includes(h.original_text) && activeFilters[h.category]
                );

                if (matchedHighlight) {
                  const parts = sentence.split(matchedHighlight.original_text);
                  return (
                    <span key={sIdx}>
                      {parts[0]}
                      <mark
                        onClick={() => setSelectedHighlight(matchedHighlight)}
                        className={getHighlightClass(matchedHighlight.category)}
                        title={matchedHighlight.title}
                      >
                        {matchedHighlight.original_text}
                      </mark>
                      {parts[1]}.{' '}
                    </span>
                  );
                }
                return <span key={sIdx}>{sentence}. </span>;
              })}
            </p>
          ))}
        </div>
      </div>

      {selectedHighlight && (
        <div className="absolute bottom-4 inset-x-4 bg-white rounded-2xl border-2 border-[#932120] p-5 shadow-2xl z-30 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-start justify-between gap-3 mb-2">
            <span className={`px-2.5 py-0.5 rounded-md text-xs font-black uppercase tracking-wider ${
              selectedHighlight.category === 'error' ? 'bg-red-100 text-red-800' :
              selectedHighlight.category === 'coherence' ? 'bg-amber-100 text-amber-800' :
              selectedHighlight.category === 'lexical' ? 'bg-sky-100 text-sky-800' :
              'bg-emerald-100 text-emerald-800'
            }`}>
              {selectedHighlight.title}
            </span>
            <button 
              onClick={() => setSelectedHighlight(null)}
              className="p-1 text-zinc-400 hover:text-zinc-700 rounded-full cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-zinc-600 mb-2">
            <strong>Lý do phân tích:</strong> {selectedHighlight.reason}
          </p>

          <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs space-y-1">
            <span className="text-zinc-500 font-semibold uppercase text-[10px] block">
              Đề xuất chỉnh sửa:
            </span>
            <p className="font-semibold text-emerald-800 font-serif text-sm">
              &quot;{selectedHighlight.suggested_fix}&quot;
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
