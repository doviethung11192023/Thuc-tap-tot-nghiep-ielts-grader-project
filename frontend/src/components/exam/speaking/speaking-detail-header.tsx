"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Menu, MoreVertical } from 'lucide-react';
import { SpeakingPartData } from '@/mocks/exam-speaking';

interface SpeakingDetailHeaderProps {
  testId?: string;
  parts: SpeakingPartData[];
  currentPart: 1 | 2 | 3;
  currentQuestionIndex: number;
  onSelectQuestion: (partNumber: 1 | 2 | 3, questionIndex: number) => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
}

export const SpeakingDetailHeader: React.FC<SpeakingDetailHeaderProps> = ({
  testId = 'speaking-test-1',
  parts,
  currentPart,
  currentQuestionIndex,
  onSelectQuestion,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  return (
    <div className="w-full bg-[#0071f9] text-white sticky top-0 z-30 shadow-md">
      {/* Top Bar */}
      <div className="w-full max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link
          href={`/test-practice/speaking/${testId}/summary`}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          title="Quay lại bảng điểm tóm tắt"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <h1 className="text-sm sm:text-base font-extrabold tracking-wide">
          Kết quả chi tiết
        </h1>

        <div className="flex items-center gap-2">
          <Link
            href="/test-practice"
            className="px-4 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition-colors"
          >
            Hoàn thành
          </Link>
          <button className="p-1.5 rounded-lg hover:bg-white/10 text-white/80">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sub-header Navigation Bar */}
      <div className="w-full bg-white text-slate-800 border-b border-slate-200/80 px-4 py-2.5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between relative">
          {/* Question Dropdown Picker */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 py-1 px-2 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Menu className="w-4 h-4" />
              <span>
                Part {currentPart} / Question {currentQuestionIndex + 1}
              </span>
              <span className="text-[10px] text-slate-400">▼</span>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-scale-up">
                {parts.map((p) => {
                  const questions =
                    p.questions ||
                    (p.cue_card
                      ? [
                          {
                            id: 'p2_cue',
                            question_number: 1,
                            question: p.cue_card.topic,
                          },
                        ]
                      : []);

                  return (
                    <div key={p.part_number} className="mb-2 last:mb-0">
                      <div className="text-[11px] font-bold text-slate-400 px-2 py-1">
                        Part {p.part_number}
                      </div>

                      <div className="space-y-1">
                        {questions.map((q, idx) => {
                          const isCurrent =
                            currentPart === p.part_number && currentQuestionIndex === idx;

                          return (
                            <button
                              key={q.id || idx}
                              onClick={() => {
                                onSelectQuestion(p.part_number, idx);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                                isCurrent
                                  ? 'bg-blue-50 text-blue-600 font-bold'
                                  : 'text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <span className="truncate">Question {idx + 1}</span>
                              {isCurrent && (
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Prev / Next Buttons */}
          <div className="flex items-center gap-4 text-xs font-bold">
            <button
              onClick={onPrev}
              disabled={!hasPrev}
              className={`flex items-center gap-1 transition-colors ${
                hasPrev
                  ? 'text-slate-600 hover:text-slate-900 cursor-pointer'
                  : 'text-slate-300 cursor-not-allowed'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Câu trước</span>
            </button>

            <button
              onClick={onNext}
              disabled={!hasNext}
              className={`flex items-center gap-1 transition-colors ${
                hasNext
                  ? 'text-blue-600 hover:text-blue-700 cursor-pointer'
                  : 'text-slate-300 cursor-not-allowed'
              }`}
            >
              <span>Câu sau</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
