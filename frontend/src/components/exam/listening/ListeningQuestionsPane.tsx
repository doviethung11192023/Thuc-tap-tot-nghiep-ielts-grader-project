"use client";

import React from 'react';
import { QuestionGroupRenderer } from '../renderers/QuestionGroupRenderer';

interface ListeningQuestionsPaneProps {
  availableSections: any[];
  activeSection: number;
  currentSection: any;
  allQuestions: any[];
  answeredCount: number;
  userAnswers: Record<number, string | string[]>;
  onSectionChange: (idx: number) => void;
  onAnswerChange: (questionNumber: number, value: any) => void;
  onQuestionClick: (questionNumber: number) => void;
}

export function ListeningQuestionsPane({
  availableSections,
  activeSection,
  currentSection,
  allQuestions,
  answeredCount,
  userAnswers,
  onSectionChange,
  onAnswerChange,
  onQuestionClick,
}: ListeningQuestionsPaneProps) {
  if (!currentSection) return null;

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      {/* Section Tabs */}
      <div className="border-b border-zinc-200 px-6 py-2.5 bg-zinc-50 flex gap-2 shrink-0 overflow-x-auto">
        {availableSections.map((s, idx) => (
          <button
            key={s.section_number || s.sectionNumber || idx}
            onClick={() => onSectionChange(idx)}
            className={`px-4 py-2 text-xs md:text-sm font-bold rounded-xl transition-all whitespace-nowrap flex items-center gap-2 ${
              activeSection === idx
                ? 'bg-[#932120] text-white shadow-md'
                : 'bg-white text-zinc-700 hover:bg-zinc-200 border border-zinc-200'
            }`}
          >
            <span>Section {s.sectionNumber || s.section_number || idx + 1}</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full ${
                activeSection === idx ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-600'
              }`}
            >
              {s.question_groups.reduce((acc: number, g: any) => acc + g.questions.length, 0)} câu
            </span>
          </button>
        ))}
      </div>

      {/* Section Header & Questions */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar space-y-6 pb-28">
        <div className="border-b border-zinc-100 pb-4">
          <h2 className="text-xl font-bold text-zinc-900">{currentSection.title}</h2>
          <p className="text-xs text-zinc-500 mt-1">
            Lắng nghe cẩn thận audio và điền câu trả lời vào các chỗ trống hoặc lựa chọn phương án đúng.
          </p>
        </div>

        {currentSection.question_groups.map((group: any) => (
          <div key={group.group_id} className="relative">
            <QuestionGroupRenderer
              group={group}
              mode="exam"
              userAnswers={userAnswers}
              onAnswerChange={onAnswerChange}
            />
          </div>
        ))}
      </div>

      {/* Bottom Question Palette */}
      <div className="bg-white border-t border-zinc-200 p-2.5 shrink-0 shadow-lg z-10">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
            Danh sách câu hỏi • Đã làm {answeredCount}/{allQuestions.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto custom-scrollbar p-1">
          {allQuestions.map((q: any) => {
            const isAnswered = !!userAnswers[q.question_number];
            return (
              <button
                key={q.question_number}
                type="button"
                onClick={() => onQuestionClick(q.question_number)}
                className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                  isAnswered
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
