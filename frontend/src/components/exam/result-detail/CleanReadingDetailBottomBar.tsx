"use client";

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CleanReadingDetailBottomBarProps {
  passages: { passage_number: number; title?: string }[];
  activePassageIndex: number;
  onSelectPassage: (idx: number) => void;
  getPassageScoreText: (passageNum: number) => string;
}

export function CleanReadingDetailBottomBar({
  passages,
  activePassageIndex,
  onSelectPassage,
  getPassageScoreText,
}: CleanReadingDetailBottomBarProps) {
  const count = passages.length || 1;

  return (
    <footer className="bg-white border-t border-zinc-200 px-5 py-2.5 h-16 flex items-center justify-between shadow-xs shrink-0 z-20">
      <div className="flex items-center gap-2">
        {passages.map((p, pIdx) => {
          const isActive = activePassageIndex === pIdx;
          return (
            <button
              key={p.passage_number || pIdx}
              type="button"
              onClick={() => onSelectPassage(pIdx)}
              className={`flex flex-col items-center px-4 py-1 rounded-xl text-xs transition-all ${
                isActive
                  ? 'bg-zinc-900 text-white font-bold shadow-xs'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80 font-medium'
              }`}
            >
              <span>Passage {p.passage_number}</span>
              <span className={`text-[10px] ${isActive ? 'text-zinc-300' : 'text-zinc-500'}`}>
                {getPassageScoreText(p.passage_number)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={activePassageIndex === 0}
          onClick={() => onSelectPassage(activePassageIndex - 1)}
          className="p-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-40 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          disabled={activePassageIndex === count - 1}
          onClick={() => onSelectPassage(activePassageIndex + 1)}
          className="p-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-40 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </footer>
  );
}
