"use client";

import React from 'react';
import { BaseRendererProps, ReviewEvidenceAccordion } from './shared';

export const TrueFalseButtonGroupRenderer: React.FC<BaseRendererProps> = ({
  group,
  mode,
  userAnswers,
  onAnswerChange,
  onSelectEvidence,
}) => {
  const isYesNo = group.question_type.includes('yes_no');
  const buttons = isYesNo ? ['YES', 'NO', 'NOT GIVEN'] : ['TRUE', 'FALSE', 'NOT GIVEN'];
  const isReview = mode === 'review';

  return (
    <div className="space-y-4">
      {group.questions.map((q) => {
        const rawAnswer = (userAnswers[q.question_number] as string) || '';
        const answer = rawAnswer.trim().toUpperCase();
        const correctAnswers = (q.correct_answers || []).map((a) => a.trim().toUpperCase());
        const isCorrect = correctAnswers.includes(answer);
        const hasAnswered = answer.length > 0;

        let containerClass = 'p-4 rounded-xl border transition-all ';
        if (isReview) {
          containerClass += !hasAnswered || !isCorrect
            ? 'border-red-200 bg-red-50/20'
            : 'border-emerald-200 bg-emerald-50/20';
        } else {
          containerClass += 'border-zinc-200 bg-white hover:border-zinc-300 shadow-2xs';
        }

        return (
          <div
            key={q.question_number}
            className={containerClass}
            onClick={() => {
              if (isReview && q.evidence_paragraph && onSelectEvidence) {
                onSelectEvidence(q.evidence_paragraph, q.evidence_quote || '');
              }
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <span className="w-7 h-7 rounded-full bg-zinc-100 text-zinc-700 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5 border border-zinc-200">
                  {q.question_number}
                </span>
                <p className="text-sm font-medium text-zinc-900 leading-relaxed">
                  {q.prompt || q.statement || `Question ${q.question_number}`}
                </p>
              </div>

              {/* 3-Button Segmented Toggle */}
              <div className="inline-flex rounded-lg border border-zinc-200 p-1 bg-zinc-50 shrink-0 self-start sm:self-center gap-1">
                {buttons.map((btnVal) => {
                  const isSelected = answer === btnVal;
                  const isCorrectOption = correctAnswers.includes(btnVal);

                  let btnStyle = 'px-3 py-1.5 text-xs font-bold rounded-md transition-all ';
                  if (isReview) {
                    if (isCorrectOption) {
                      btnStyle += 'bg-emerald-600 text-white shadow-xs';
                    } else if (isSelected && !isCorrect) {
                      btnStyle += 'bg-red-600 text-white line-through shadow-xs';
                    } else {
                      btnStyle += 'text-zinc-400 bg-transparent opacity-60';
                    }
                  } else {
                    if (isSelected) {
                      btnStyle += 'bg-[#932120] text-white shadow-xs';
                    } else {
                      btnStyle += 'text-zinc-700 hover:text-zinc-900 hover:bg-white bg-transparent';
                    }
                  }

                  return (
                    <button
                      key={btnVal}
                      type="button"
                      disabled={isReview}
                      onClick={() => !isReview && onAnswerChange?.(q.question_number, btnVal)}
                      className={btnStyle}
                    >
                      {btnVal}
                    </button>
                  );
                })}
              </div>
            </div>

            {isReview && (
              <div className="mt-3 pt-3 border-t border-zinc-100">
                {!isCorrect && correctAnswers.length > 0 && (
                  <div className="mb-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 inline-block">
                    Đáp án đúng: {correctAnswers.join(' / ')}
                  </div>
                )}
                <ReviewEvidenceAccordion explanation={q.explanation} evidenceQuote={q.evidence_quote} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
