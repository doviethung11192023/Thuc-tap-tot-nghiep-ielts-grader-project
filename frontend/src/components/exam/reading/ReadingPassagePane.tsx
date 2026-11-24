"use client";

import React from 'react';

interface ReadingPassagePaneProps {
  availablePassages: any[];
  activePassage: number;
  fontSize: number;
  highlightedEvidence: { paragraph: string; quote: string } | null;
  userAnswers: Record<number, string | string[]>;
  onPassageChange: (idx: number) => void;
  passageScrollRef: React.RefObject<HTMLDivElement | null>;
}

export function ReadingPassagePane({
  availablePassages,
  activePassage,
  fontSize,
  highlightedEvidence,
  userAnswers,
  onPassageChange,
  passageScrollRef,
}: ReadingPassagePaneProps) {
  const currentPassage = availablePassages[activePassage] || availablePassages[0];
  if (!currentPassage) return null;

  return (
    <div className="w-1/2 border-r border-[var(--ux-line)] bg-[var(--ux-surface)] flex flex-col h-full relative">
      <div
        ref={passageScrollRef}
        className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-6 pb-20"
      >
        <div className="max-w-[70ch] mx-auto space-y-6">
          <div className="border-b border-[var(--ux-line)] pb-4 text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-[#932120] bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
              Reading Passage {currentPassage.passageNumber || activePassage + 1}
            </span>
            <h2 className="text-xl md:text-2xl font-bold text-[var(--ux-ink)] mt-3 font-serif leading-snug">
              {currentPassage.passage.title}
            </h2>
          </div>

          <div
            className="space-y-5 text-[var(--ux-ink)] leading-[1.8] font-serif"
            style={{ fontSize: `${fontSize}px` }}
          >
            {currentPassage.passage.paragraphs?.map((p: any) => {
              const paraKey = p.label || p.id;
              const isSelected = highlightedEvidence?.paragraph === paraKey;
              return (
                <div
                  key={p.id}
                  id={`para-${paraKey}`}
                  className={`p-4 rounded-xl transition-colors duration-200 flex gap-4 ${
                    isSelected
                      ? 'bg-amber-100 ring-2 ring-amber-400 shadow-sm'
                      : 'hover:bg-[var(--ux-surface-2)]/60'
                  }`}
                >
                  {p.label && (
                    <span className="font-sans font-bold text-[var(--ux-ink-3)] shrink-0 text-sm pt-1 select-none">
                      [{p.label}]
                    </span>
                  )}
                  <p className="leading-[1.8]">
                    {isSelected && highlightedEvidence?.quote && p.text.includes(highlightedEvidence.quote) ? (
                      <span>
                        {p.text.split(highlightedEvidence.quote)[0]}
                        <mark className="bg-amber-300 font-semibold px-1 rounded text-zinc-900">
                          {highlightedEvidence.quote}
                        </mark>
                        {p.text.split(highlightedEvidence.quote)[1]}
                      </span>
                    ) : (
                      p.text
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Tabs for Passage Switch */}
      <div className="absolute bottom-0 inset-x-0 bg-white/95 backdrop-blur-sm border-t border-zinc-200 p-2.5 flex gap-2 z-10 shadow-xs">
        {availablePassages.map((p, idx) => {
          const passageQCount = p.question_groups.reduce((acc: number, g: any) => acc + g.questions.length, 0);
          const passageAnswered = p.question_groups.flatMap((g: any) => g.questions)
            .filter((q: any) => !!userAnswers[q.question_number]).length;

          return (
            <button
              key={p.passage.id}
              onClick={() => onPassageChange(idx)}
              className={`flex-1 py-2 px-3 text-xs md:text-sm font-bold rounded-xl transition-all flex items-center justify-between ${
                activePassage === idx
                  ? 'bg-[#932120] text-white shadow-md'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              <span>Passage {p.passageNumber || idx + 1}</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${activePassage === idx ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-700'}`}>
                {passageAnswered}/{passageQCount}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
