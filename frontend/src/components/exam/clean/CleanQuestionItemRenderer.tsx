"use client";

import React from 'react';
import { Check, X, CheckCircle2 } from 'lucide-react';
import { CleanReadingQuestion } from '@/mocks/clean-dataset/reading-test-1-clean';
import { CleanListeningQuestion } from '@/mocks/clean-dataset/listening-test-1-clean';
import { CleanQuestionDropdownExplanation } from './CleanQuestionDropdownExplanation';

type QuestionUnion = CleanReadingQuestion | CleanListeningQuestion;

interface CleanQuestionItemRendererProps {
  question: QuestionUnion;
  onSelectEvidence?: (originalText: string, questionNumber?: number) => void;
  defaultExpanded?: boolean;
}

export function CleanQuestionItemRenderer({
  question,
  onSelectEvidence,
  defaultExpanded = false
}: CleanQuestionItemRendererProps) {
  const isMultipleChoice = Array.isArray(question.options) && question.options.length > 0;

  // Chuẩn hóa so sánh đáp án
  const normalize = (val: string) => (val || '').trim().toLowerCase();
  const userAnsNorm = normalize(question.user_answer);
  const correctAnsNorm = normalize(question.correct_answer);

  return (
    <div
      id={`question-card-${question.question_number}`}
      className="p-4 bg-white rounded-xl border border-zinc-200 shadow-2xs space-y-3 scroll-mt-24"
    >
      {/* Question Header & Prompt (Image 3) */}
      <div className="flex items-start gap-3">
        {/* Circular Number Badge: Green if correct, Red if incorrect */}
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
            question.is_correct
              ? 'bg-emerald-600 text-white ring-2 ring-emerald-100'
              : 'bg-red-600 text-white ring-2 ring-red-100'
          }`}
        >
          {question.question_number}
        </div>

        {/* Question Statement */}
        <div className="flex-1 text-sm md:text-base font-semibold text-zinc-900 leading-relaxed">
          {question.prompt.includes('{{') ? (
            <span>
              {question.prompt.split(/(\{\{\d+\}\})/g).map((part, idx) => {
                if (/^\{\{\d+\}\}$/.test(part)) {
                  return (
                    <span
                      key={idx}
                      className="inline-block px-1.5 py-0.5 mx-1 rounded border border-dashed border-zinc-400 bg-zinc-100 text-xs font-mono font-bold text-zinc-700"
                    >
                      [{part.replace(/[{}]/g, '')}]
                    </span>
                  );
                }
                return <span key={idx}>{part}</span>;
              })}
            </span>
          ) : (
            <span>{question.prompt}</span>
          )}
        </div>
      </div>

      {/* Answer Pill for Non-Multiple Choice (Completion / Summary / Short Answer) */}
      {!isMultipleChoice && (
        <div className="pl-10">
          <div
            className={`p-3 rounded-xl border flex flex-wrap items-center gap-3 text-xs sm:text-sm ${
              question.is_correct
                ? 'border-emerald-300 bg-emerald-50/50 text-emerald-950'
                : 'border-red-300 bg-red-50/50 text-red-950'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-zinc-500 uppercase text-[11px]">Bạn đã chọn:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded border ${
                  question.is_correct
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-red-100 text-red-800 border-red-300'
                }`}
              >
                {question.user_answer || '(Chưa điền)'}
              </span>
            </div>

            {!question.is_correct && (
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-zinc-500 uppercase text-[11px]">Đáp án đúng:</span>
                <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                  {question.correct_answer}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Options Cards List (Image 3) */}
      {isMultipleChoice && (
        <div className="space-y-2 pl-10">
          {question.options.map((opt, optIdx) => {
            const optTextNorm = normalize(opt.text);
            const optKeyNorm = normalize(opt.key);
            
            // Xác định xem option này có phải đáp án đúng không
            const isCorrectOption = 
              correctAnsNorm === optTextNorm || 
              correctAnsNorm === optKeyNorm ||
              correctAnsNorm.startsWith(optKeyNorm + '.') ||
              correctAnsNorm.startsWith(optTextNorm);

            // Xác định xem học viên có chọn option này không
            const isUserSelected = 
              userAnsNorm === optTextNorm || 
              userAnsNorm === optKeyNorm ||
              userAnsNorm.startsWith(optKeyNorm + '.') ||
              userAnsNorm.startsWith(optTextNorm);

            // Xác định styling card
            let cardStyle = "border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800";
            let radioStyle = "border-zinc-300 text-zinc-400";

            if (isCorrectOption) {
              cardStyle = "border-emerald-500 bg-emerald-50/40 text-emerald-950 font-semibold shadow-2xs";
              radioStyle = "border-emerald-500 bg-emerald-600 text-white";
            } else if (isUserSelected && !question.is_correct) {
              cardStyle = "border-red-400 bg-red-50/40 text-red-950 font-medium";
              radioStyle = "border-red-500 bg-red-600 text-white";
            }

            return (
              <div
                key={optIdx}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-sm transition-all ${cardStyle}`}
              >
                {/* Radio Circle */}
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${radioStyle}`}
                >
                  {isCorrectOption ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : isUserSelected ? (
                    <X className="w-3.5 h-3.5 stroke-[3]" />
                  ) : (
                    opt.key
                  )}
                </div>

                {/* Option text */}
                <div className="flex-1">
                  <span>{opt.text}</span>
                  {isCorrectOption && (
                    <span className="ml-2 text-xs text-emerald-700 font-bold">
                      (Đáp án đúng)
                    </span>
                  )}
                  {isUserSelected && !isCorrectOption && (
                    <span className="ml-2 text-xs text-red-600 font-semibold">
                      (Bạn đã chọn)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dưới mỗi câu là 1 Dropdown Menu 'Giải thích đáp án' (Image 1 & 2) */}
      <div className="pl-10">
        <CleanQuestionDropdownExplanation
          questionNumber={question.question_number}
          prompt={question.prompt}
          userAnswer={question.user_answer}
          correctAnswer={question.correct_answer}
          isCorrect={question.is_correct}
          explanation4Steps={question.explanation_4_steps}
          evidenceText={question.evidence_text}
          keywordsMapping={question.keywords_mapping || []}
          onSelectEvidence={onSelectEvidence}
          defaultExpanded={defaultExpanded}
        />
      </div>
    </div>
  );
}
