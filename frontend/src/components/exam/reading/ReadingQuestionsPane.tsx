"use client";

import React from 'react';
import { QuestionGroupRenderer } from '../renderers/QuestionGroupRenderer';

interface ReadingQuestionsPaneProps {
  currentPassage: any;
  allQuestions: any[];
  answeredCount: number;
  userAnswers: Record<number, string | string[]>;
  flaggedQuestions: Record<number, boolean>;
  onAnswerChange: (questionNumber: number, value: any) => void;
  onSelectEvidence: (paragraphId: string, quote: string) => void;
  onQuestionClick: (questionNumber: number) => void;
}

export function ReadingQuestionsPane({
  currentPassage,
  allQuestions,
  answeredCount,
  userAnswers,
  flaggedQuestions,
  onAnswerChange,
  onSelectEvidence,
  onQuestionClick,
}: ReadingQuestionsPaneProps) {
  if (!currentPassage) return null;

  return (
    <div className="w-1/2 flex flex-col h-full bg-zinc-50/70">
      <div className="flex justify-between items-center px-6 py-3.5 border-b border-zinc-200 bg-white shrink-0 shadow-xs z-10">
        <h3 className="font-bold text-zinc-900 text-sm md:text-base">
          Câu hỏi ({answeredCount}/{allQuestions.length} đã làm)
        </h3>
        <div className="flex items-center gap-3 text-xs text-zinc-500 font-medium">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#932120]"></span> Đã trả lời
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Đánh dấu
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6 pb-28">
        {currentPassage.question_groups.map((group: any) => (
          <div key={group.group_id} className="relative">
            <QuestionGroupRenderer
              group={group}
              mode="exam"
              userAnswers={userAnswers}
              onAnswerChange={onAnswerChange}
              onSelectEvidence={onSelectEvidence}
            />
          </div>
        ))}
      </div>

      {/* Bottom Question Palette (Ghim đáy cột phải) */}
      <div className="bg-white border-t border-zinc-200 p-2.5 shrink-0 shadow-lg z-10">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
            Danh sách câu hỏi • Đã làm {answeredCount}/{allQuestions.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto custom-scrollbar p-1">
          {allQuestions.map((q: any) => {
            const isAnswered = !!userAnswers[q.question_number];
            const isFlagged = !!flaggedQuestions[q.question_number];

            return (
              <button
                key={q.question_number}
                type="button"
                onClick={() => onQuestionClick(q.question_number)}
                className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                  isFlagged
                    ? 'bg-amber-500 text-white shadow-xs ring-1 ring-amber-600'
                    : isAnswered
                    ? 'bg-[#932120] text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border border-zinc-200'
                }`}
                title={`Câu ${q.question_number}`}
              >
                {q.question_number}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
