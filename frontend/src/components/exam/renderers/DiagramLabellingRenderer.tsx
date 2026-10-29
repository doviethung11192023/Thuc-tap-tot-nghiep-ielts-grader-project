"use client";

import React from 'react';
import { BaseRendererProps, ReviewEvidenceAccordion } from './shared';

export const DiagramLabellingRenderer: React.FC<BaseRendererProps> = ({
  group,
  mode,
  userAnswers,
  onAnswerChange,
}) => {
  const isReview = mode === 'review';
  const options = group.options_pool || [];
  const hasCoordinates = group.questions.some((q) => !!q.diagram_coordinate);

  return (
    <div className="space-y-6">
      {/* Options Pool Card (Wordlist for Map / Diagram) */}
      {options.length > 0 && (
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 shadow-2xs">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#932120]"></span>
            Danh sách nhãn sơ đồ / địa điểm
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {options.map((opt) => (
              <div
                key={opt.key}
                className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-zinc-200 text-xs md:text-sm"
              >
                <span className="font-bold text-[#932120] shrink-0">{opt.key}.</span>
                <span className="text-zinc-800 font-medium truncate" title={opt.text}>{opt.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Diagram Image Container */}
      {group.diagram_image_url ? (
        <div className="relative inline-block w-full border border-zinc-200 rounded-xl overflow-hidden bg-zinc-50 shadow-sm">
          <img
            src={group.diagram_image_url}
            alt="IELTS Diagram or Map"
            className="w-full h-auto object-contain block mx-auto max-h-[550px]"
          />

          {/* Hotspot Pins (When coordinates exist) */}
          {hasCoordinates &&
            group.questions.map((q) => {
              if (!q.diagram_coordinate) return null;
              const answer = (userAnswers[q.question_number] as string) || '';
              const isCorrect = q.correct_answers?.some(
                (a) => a.toLowerCase().trim() === answer.toLowerCase().trim()
              );

              return (
                <div
                  key={q.question_number}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 z-10"
                  style={{
                    left: `${q.diagram_coordinate.x}%`,
                    top: `${q.diagram_coordinate.y}%`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById(`diagram-input-${q.question_number}`);
                      el?.focus();
                      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-md shrink-0 border-2 transition-transform hover:scale-110 ${
                      isReview
                        ? isCorrect
                          ? 'bg-emerald-600 text-white border-white'
                          : 'bg-red-600 text-white border-white'
                        : 'bg-[#932120] text-white border-white ring-2 ring-white/80'
                    }`}
                    title={`Câu ${q.question_number}: Bấm để tới ô nhập`}
                  >
                    {q.question_number}
                  </button>
                </div>
              );
            })}
        </div>
      ) : (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          ⚠️ Không tìm thấy ảnh sơ đồ (diagram_image_url). Vui lòng kiểm tra lại dữ liệu bài thi.
        </div>
      )}

      {/* Question Input Slots (Rendered for all questions to guarantee full input capability) */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-zinc-600"></span>
          {hasCoordinates ? "Điền câu trả lời theo vị trí sơ đồ:" : "Các câu hỏi điền sơ đồ:"}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {group.questions.map((q) => {
            const answer = (userAnswers[q.question_number] as string) || '';
            const isCorrect = q.correct_answers?.some(
              (a) => a.toLowerCase().trim() === answer.toLowerCase().trim()
            );

            let inputClass = 'w-full px-3 py-2 text-sm border rounded-lg font-medium outline-none transition-all shadow-2xs bg-white ';
            if (isReview) {
              inputClass += isCorrect
                ? 'border-emerald-500 text-emerald-800 bg-emerald-50/50'
                : 'border-red-400 text-red-800 bg-red-50/50';
            } else {
              inputClass += 'border-zinc-300 focus:border-[#932120] focus:ring-1 focus:ring-[#932120]';
            }

            return (
              <div
                key={q.question_number}
                className={`p-3 rounded-xl border transition-all ${
                  isReview
                    ? isCorrect
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : 'border-red-200 bg-red-50/20'
                    : 'border-zinc-200 bg-white hover:border-zinc-300 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#932120] text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {q.question_number}
                    </span>
                    <span className="text-sm font-semibold text-zinc-800 truncate">
                      {q.prompt || q.label || `Vị trí câu ${q.question_number}`}
                    </span>
                  </div>
                  {isReview && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                      {isCorrect ? 'Đúng' : 'Chưa đúng'}
                    </span>
                  )}
                </div>

                {options.length > 0 ? (
                  <select
                    id={`diagram-input-${q.question_number}`}
                    value={answer}
                    disabled={isReview}
                    onChange={(e) => onAnswerChange?.(q.question_number, e.target.value)}
                    className={inputClass}
                  >
                    <option value="">-- Chọn nhãn tương ứng --</option>
                    {options.map((opt) => (
                      <option key={opt.key} value={opt.key}>{opt.key}. {opt.text}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={`diagram-input-${q.question_number}`}
                    type="text"
                    value={answer}
                    placeholder={`Nhập đáp án cho câu ${q.question_number}...`}
                    disabled={isReview}
                    onChange={(e) => onAnswerChange?.(q.question_number, e.target.value)}
                    className={inputClass}
                  />
                )}

                {isReview && (
                  <div className="mt-2 text-xs space-y-1">
                    <div className="text-zinc-600">
                      Đáp án đúng: <span className="font-bold text-emerald-700">{q.correct_answers?.join(' / ') || '(Chưa cập nhật)'}</span>
                    </div>
                    <ReviewEvidenceAccordion explanation={q.explanation} evidenceQuote={q.evidence_quote} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
