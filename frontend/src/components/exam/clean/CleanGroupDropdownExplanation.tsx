"use client";

import React, { useState } from 'react';
import { Lightbulb, ChevronUp, ChevronDown } from 'lucide-react';
import { CleanListeningQuestion } from '@/mocks/clean-dataset/listening-test-1-clean';
import { CleanGroupEvidenceLocation } from './CleanGroupEvidenceLocation';
import { CleanExplanationSteps } from './CleanExplanationSteps';

interface CleanGroupDropdownExplanationProps {
  questions: CleanListeningQuestion[];
  activeQuestionNumber: number;
  onSelectQuestion: (questionNumber: number) => void;
  onPlayAtTime: (seconds: number) => void;
  onSelectEvidenceText?: (text: string) => void;
  defaultExpanded?: boolean;
}

export function CleanGroupDropdownExplanation({
  questions,
  activeQuestionNumber,
  onSelectQuestion,
  onPlayAtTime,
  onSelectEvidenceText,
  defaultExpanded = true
}: CleanGroupDropdownExplanationProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [activeSubTab, setActiveSubTab] = useState<'location' | 'explanation'>('location');

  if (!questions || questions.length === 0) return null;

  const currentQ = questions.find(q => q.question_number === activeQuestionNumber) || questions[0];

  return (
    <div className="rounded-2xl border border-blue-200 bg-white overflow-hidden shadow-2xs transition-all">
      {/* 1. Header Bar: Icon bóng đèn + Tiêu đề 'Giải thích đáp án' + Chevron */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-3 flex items-center justify-between text-left bg-blue-50/60 hover:bg-blue-100/70 transition-colors border-b border-blue-100 cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-2xs">
            <Lightbulb className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-blue-900">
            Giải thích đáp án
          </span>
          <span className="text-xs text-blue-600 font-medium">
            (Questions {questions[0]?.question_number} - {questions[questions.length - 1]?.question_number})
          </span>
        </div>
        <div className="text-blue-700">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {/* 2. Nội dung mở rộng */}
      {isExpanded && (
        <div className="p-4 md:p-5 space-y-4">
          {/* Hàng Tabs chọn câu hỏi trong group */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-zinc-100">
            {questions.map(q => {
              const isSelected = q.question_number === currentQ.question_number;
              const isCorrect = q.is_correct;

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => onSelectQuestion(q.question_number)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all border cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-100'
                      : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isCorrect ? 'bg-emerald-400' : 'bg-red-400'
                    }`}
                  />
                  <span>Question {q.question_number}</span>
                </button>
              );
            })}
          </div>

          {/* Segmented Switch: Vị trí đáp án vs Giải thích */}
          <div className="flex justify-center">
            <div className="inline-flex p-1 bg-zinc-100 rounded-xl border border-zinc-200 gap-1 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveSubTab('location')}
                className={`px-6 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeSubTab === 'location'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Vị trí đáp án
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('explanation')}
                className={`px-6 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeSubTab === 'explanation'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Giải thích
              </button>
            </div>
          </div>

          {/* SUB-TAB 1: VỊ TRÍ ĐÁP ÁN */}
          {activeSubTab === 'location' && (
            <CleanGroupEvidenceLocation
              currentQ={currentQ}
              onPlayAtTime={onPlayAtTime}
              onSelectEvidenceText={onSelectEvidenceText}
            />
          )}

          {/* SUB-TAB 2: GIẢI THÍCH (4 BƯỚC) */}
          {activeSubTab === 'explanation' && (
            <div className="p-1">
              <CleanExplanationSteps explanation4Steps={currentQ.explanation_4_steps} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
