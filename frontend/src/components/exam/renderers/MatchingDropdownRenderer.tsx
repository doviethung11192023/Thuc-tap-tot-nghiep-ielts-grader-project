"use client";

import React from 'react';
import { BaseRendererProps, formatAnswerDisplay } from './shared';

export const MatchingDropdownRenderer: React.FC<BaseRendererProps> = ({
  group,
  mode,
  userAnswers,
  onAnswerChange,
  onSelectEvidence,
}) => {
  const isReview = mode === 'review';
  const options = group.options_pool || [];

  return (
    <div className="space-y-6">
      {/* Options Pool Card */}
      {options.length > 0 && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 shadow-sm">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">
            List of Options / Headings
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {options.map((opt) => (
              <div
                key={opt.key}
                className="flex items-start gap-2 bg-white px-3 py-2 rounded-lg border border-zinc-200 text-sm"
              >
                <span className="font-bold text-[#932120] shrink-0">{opt.key}.</span>
                <span className="text-zinc-700">{opt.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-4">
        {group.questions.map((q) => {
          const userAnswer = (userAnswers[q.question_number] as string) || '';
          const isCorrect = q.correct_answers?.some(
            (ans) => ans.trim().toLowerCase() === userAnswer.trim().toLowerCase()
          );

          return (
            <div
              key={q.question_number}
              className={`p-4 rounded-xl border transition-all ${
                isReview
                  ? isCorrect
                    ? 'border-emerald-300 bg-emerald-50/40'
                    : 'border-red-300 bg-red-50/40'
                  : 'border-zinc-200 bg-white hover:border-zinc-300'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-zinc-100 text-zinc-700 font-bold flex items-center justify-center text-sm shrink-0">
                    {q.question_number}
                  </span>
                  <span className="font-medium text-zinc-900">{q.prompt || `Question ${q.question_number}`}</span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    disabled={isReview}
                    value={userAnswer}
                    onChange={(e) => onAnswerChange?.(q.question_number, e.target.value)}
                    className={`px-3 py-2 rounded-lg text-sm border font-medium focus:outline-none transition-colors ${
                      isReview
                        ? isCorrect
                          ? 'border-emerald-500 bg-white text-emerald-800'
                          : 'border-red-500 bg-white text-red-800'
                        : 'border-zinc-300 bg-zinc-50 focus:ring-2 focus:ring-[#932120]/30'
                    }`}
                  >
                    <option value="">-- Chọn đáp án --</option>
                    {options.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.key} - {opt.text.slice(0, 40)}...
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Review details */}
              {isReview && (
                <div className="mt-3 pt-3 border-t border-zinc-200 text-xs space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 font-medium">Đáp án chuẩn:</span>
                    <span className="font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      {formatAnswerDisplay(q.correct_answers)}
                    </span>
                  </div>
                  {q.explanation && (
                    <p className="text-zinc-600 italic">
                      <strong className="text-zinc-700 not-italic">Giải thích: </strong>
                      {q.explanation}
                    </p>
                  )}
                  {q.evidence_quote && onSelectEvidence && (
                    <button
                      type="button"
                      onClick={() => onSelectEvidence(q.evidence_paragraph || '', q.evidence_quote || '')}
                      className="text-xs font-semibold text-[#932120] hover:underline flex items-center gap-1 mt-1"
                    >
                      🔍 Xem dẫn chứng trong bài đọc (Paragraph {q.evidence_paragraph})
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
