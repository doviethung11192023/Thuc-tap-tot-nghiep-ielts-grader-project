"use client";

import React from 'react';
import { ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { CleanListeningSection } from '@/mocks/clean-dataset/listening-test-1-clean';

interface CleanListeningDetailBottomBarProps {
  sections: CleanListeningSection[];
  activeSectionIndex: number;
  onSelectSection: (index: number) => void;
  getSectionScoreText: (sectionNum: number) => string;
}

export function CleanListeningDetailBottomBar({
  sections,
  activeSectionIndex,
  onSelectSection,
  getSectionScoreText
}: CleanListeningDetailBottomBarProps) {
  return (
    <footer className="bg-white border-t border-zinc-200 px-4 py-2.5 flex items-center justify-between shrink-0 shadow-xs z-20">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="w-9 h-9 rounded-full bg-zinc-900 text-white flex items-center justify-center hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer"
          title="Cuộn lên đầu trang"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          type="button"
          disabled={activeSectionIndex === 0}
          onClick={() => onSelectSection(Math.max(0, activeSectionIndex - 1))}
          className="w-9 h-9 rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Phần trước"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto py-1">
        {sections.map((sec, idx) => {
          const isActive = activeSectionIndex === idx;
          return (
            <button
              key={sec.section_number || idx}
              type="button"
              onClick={() => onSelectSection(idx)}
              className={`px-5 py-2 rounded-xl text-left transition-all border cursor-pointer ${
                isActive
                  ? 'border-blue-600 bg-white shadow-xs text-blue-900'
                  : 'border-zinc-200 bg-zinc-50 hover:bg-white text-zinc-600'
              }`}
            >
              <div className={`font-bold text-xs uppercase tracking-wider ${isActive ? 'text-blue-600' : 'text-zinc-700'}`}>
                LISTENING PART {idx + 1}
              </div>
              <div className="text-[11px] text-zinc-400 font-medium">
                {getSectionScoreText(idx + 1)}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={activeSectionIndex === sections.length - 1}
          onClick={() => onSelectSection(Math.min(sections.length - 1, activeSectionIndex + 1))}
          className="w-9 h-9 rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Phần tiếp theo"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </footer>
  );
}
