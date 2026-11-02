"use client";

import React from 'react';
import { CleanReadingQuestion } from '@/mocks/clean-dataset/reading-test-1-clean';
import { CleanListeningQuestion } from '@/mocks/clean-dataset/listening-test-1-clean';
import { CleanQuestionDropdownExplanation } from './CleanQuestionDropdownExplanation';
import { CleanMatchingOptionsPool } from './clean-matching-options-pool';
import { CleanMultipleChoiceOptionsList } from './clean-multiple-choice-options-list';

type QuestionUnion = CleanReadingQuestion | CleanListeningQuestion;

interface CleanQuestionItemRendererProps {
  question: QuestionUnion;
  optionsPool?: Array<{ key: string; text: string }> | null;
  onSelectEvidence?: (originalText: string, questionNumber?: number) => void;
  defaultExpanded?: boolean;
}

export function CleanQuestionItemRenderer({
  question,
  optionsPool,
  onSelectEvidence,
  defaultExpanded = false
}: CleanQuestionItemRendererProps) {
  const isMultipleChoice = Array.isArray(question.options) && question.options.length > 0;

  // Chuẩn hóa an toàn cho cả String, Array, Number (RD-01)
  const normalize = (val: any) => {
    if (val === null || val === undefined) return '';
    if (Array.isArray(val)) return val.map((v) => String(v || '').trim().toLowerCase()).join(', ');
    return String(val).trim().toLowerCase();
  };
  const userAnsNorm = normalize(question.user_answer);
  const correctAnsNorm = normalize(question.correct_answer);

  const displayUserAnswer = Array.isArray(question.user_answer)
    ? question.user_answer.join(', ')
    : (question.user_answer || '(Chưa điền)');

  const displayCorrectAnswer = Array.isArray(question.correct_answer)
    ? question.correct_answer.join(', ')
    : (question.correct_answer || '');

  return (
    <div
      id={`question-card-${question.question_number}`}
      className="p-4 bg-white rounded-xl border border-zinc-200 shadow-2xs space-y-3 scroll-mt-24"
    >
      {/* Question Header & Prompt */}
      <div className="flex items-start gap-3">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
            question.is_correct
              ? 'bg-emerald-600 text-white ring-2 ring-emerald-100'
              : 'bg-red-600 text-white ring-2 ring-red-100'
          }`}
        >
          {question.question_number}
        </div>

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

      {/* Options Pool for Matching (LS-04) */}
      {!isMultipleChoice && (
        <CleanMatchingOptionsPool optionsPool={optionsPool} />
      )}

      {/* Answer Pill for Non-Multiple Choice */}
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
                {displayUserAnswer}
              </span>
            </div>

            {!question.is_correct && (
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-zinc-500 uppercase text-[11px]">Đáp án đúng:</span>
                <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                  {displayCorrectAnswer}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Options Cards List (Multiple Choice) */}
      {isMultipleChoice && (
        <CleanMultipleChoiceOptionsList
          options={question.options}
          userAnsNorm={userAnsNorm}
          correctAnsNorm={correctAnsNorm}
          isCorrect={question.is_correct}
          normalize={normalize}
        />
      )}

      {/* Dropdown Menu Giải thích đáp án */}
      <div className="pl-10">
        <CleanQuestionDropdownExplanation
          questionNumber={question.question_number}
          prompt={question.prompt}
          userAnswer={displayUserAnswer}
          correctAnswer={displayCorrectAnswer}
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
