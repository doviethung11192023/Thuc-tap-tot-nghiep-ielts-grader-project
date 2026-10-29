import React, { useState } from 'react';
import { BaseRendererProps, ReviewEvidenceAccordion } from './shared';

export const InlineFillBlankRenderer: React.FC<BaseRendererProps> = ({
  group,
  mode,
  userAnswers,
  onAnswerChange,
  onSelectEvidence
}) => {
  const options = group.options_pool || [];
  const isReview = mode === 'review';
  const [activeBlank, setActiveBlank] = useState<number | null>(null);

  const wordlistCard = options.length > 0 && (
    <div className="mb-6 bg-zinc-50 border border-zinc-200 rounded-xl p-4 shadow-2xs">
      <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600 mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#932120]"></span>
          Danh sách từ gợi ý (Wordlist)
        </span>
        {activeBlank && mode === 'exam' && (
          <span className="text-[11px] font-semibold text-[#932120] bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
            Bấm từ để điền vào Câu {activeBlank}
          </span>
        )}
      </h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {options.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => {
              if (activeBlank && mode === 'exam' && onAnswerChange) {
                onAnswerChange(activeBlank, opt.key);
              }
            }}
            className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-zinc-200 hover:border-[#932120] hover:bg-red-50/40 text-xs md:text-sm transition-all text-left cursor-pointer"
            title={`Chọn ${opt.key}: ${opt.text}`}
          >
            <span className="font-bold text-[#932120] shrink-0">{opt.key}.</span>
            <span className="text-zinc-800 font-medium truncate">{opt.text}</span>
          </button>
        ))}
      </div>
    </div>
  );

  if (!group.template) {
    return (
      <div className="space-y-3">
        {wordlistCard}
        {group.questions.map((q) => {
          const answer = (userAnswers[q.question_number] as string) || '';
          const isCorrect = q.correct_answers?.some(a => a.toLowerCase().trim() === answer.toLowerCase().trim());
          let inputClass = "px-3 py-2 border rounded-lg outline-none font-medium text-sm transition-all ";
          if (isReview) {
            inputClass += isCorrect ? "border-green-500 bg-green-50 text-green-700" : "border-red-500 bg-red-50 text-red-700";
          } else {
            inputClass += "border-zinc-300 focus:border-[#932120] focus:ring-1 focus:ring-[#932120] bg-white";
          }

          return (
            <div key={q.question_number} className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="w-7 h-7 shrink-0 bg-white border border-zinc-200 flex items-center justify-center rounded-full text-xs text-[#932120] font-mono shadow-2xs font-bold">
                  {q.question_number}
                </span>
                {q.prompt && <span className="text-sm font-medium text-zinc-800">{q.prompt}</span>}
                <input
                  type="text"
                  placeholder="Nhập câu trả lời..."
                  value={answer}
                  onFocus={() => setActiveBlank(q.question_number)}
                  onChange={(e) => mode === 'exam' && onAnswerChange?.(q.question_number, e.target.value)}
                  disabled={isReview}
                  className={inputClass + " flex-1 min-w-[180px] max-w-sm"}
                />
              </div>
              {isReview && !isCorrect && q.correct_answers && q.correct_answers.length > 0 && (
                <div className="text-xs font-semibold text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200 inline-block ml-10">
                  Đáp án đúng: {q.correct_answers.join(' / ')}
                </div>
              )}
              {isReview && (
                <div className="ml-10">
                  <ReviewEvidenceAccordion explanation={q.explanation} evidenceQuote={q.evidence_quote} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Parse template to replace {{X}} with clean inline input pills
  const parts = group.template.split(/({{\d+}})/g);

  return (
    <div className="text-zinc-800 leading-relaxed text-sm md:text-base">
      {wordlistCard}
      {parts.map((part, index) => {
        const match = part.match(/{{(\d+)}}/);
        if (match) {
          const qNumber = parseInt(match[1], 10);
          const qData = group.questions.find(q => q.question_number === qNumber);
          const answer = (userAnswers[qNumber] as string) || '';
          const isCorrect = qData?.correct_answers?.some(a => a.toLowerCase().trim() === answer.toLowerCase().trim());
          
          let containerClass = "inline-flex items-center align-middle mx-1.5 my-1 rounded-lg border bg-white shadow-2xs transition-all overflow-hidden ";
          let badgeClass = "px-2 py-0.5 text-xs font-bold select-none shrink-0 border-r ";
          
          if (isReview) {
            if (isCorrect) {
              containerClass += "border-emerald-500 bg-emerald-50/50 ";
              badgeClass += "bg-emerald-600 text-white border-emerald-600 ";
            } else {
              containerClass += "border-red-400 bg-red-50/50 ";
              badgeClass += "bg-red-600 text-white border-red-500 ";
            }
          } else {
            containerClass += activeBlank === qNumber
              ? "border-[#932120] ring-2 ring-[#932120]/30 "
              : "border-zinc-300 hover:border-zinc-400 focus-within:border-[#932120] focus-within:ring-1 focus-within:ring-[#932120] ";
            badgeClass += "bg-zinc-100 text-[#932120] border-zinc-200 ";
          }

          return (
            <span key={index} className={containerClass}>
              <span className={badgeClass}>{qNumber}</span>
              <input
                type="text"
                value={answer}
                placeholder="..."
                onFocus={() => setActiveBlank(qNumber)}
                onChange={(e) => mode === 'exam' && onAnswerChange?.(qNumber, e.target.value)}
                disabled={isReview}
                className="w-20 sm:w-28 px-2 py-0.5 text-xs sm:text-sm font-semibold text-zinc-900 text-center outline-none bg-transparent"
                onClick={() => {
                  if (isReview && qData?.evidence_paragraph && onSelectEvidence) {
                    onSelectEvidence(qData.evidence_paragraph, qData.evidence_quote || '');
                  }
                }}
              />
            </span>
          );
        }
        return <span key={index} dangerouslySetInnerHTML={{ __html: part }} />;
      })}

      {/* Review Panels for incorrect answers */}
      {isReview && (
        <div className="mt-8 space-y-4">
          <h4 className="font-semibold text-zinc-900 border-b pb-2">Chi tiết đáp án:</h4>
          {group.questions.map(q => {
            const answer = (userAnswers[q.question_number] as string) || '';
            const isCorrect = q.correct_answers?.some(a => a.toLowerCase().trim() === answer.toLowerCase().trim());
            return (
              <div key={q.question_number} className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 text-sm space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-zinc-700">Câu {q.question_number}:</span>
                  <span className={isCorrect ? "text-emerald-700 font-semibold" : "text-red-700 font-semibold"}>
                    {answer ? `Bạn chọn: ${answer}` : "Chưa trả lời"}
                  </span>
                  {!isCorrect && q.correct_answers && q.correct_answers.length > 0 && (
                    <span className="text-zinc-500 font-medium ml-2">
                      (Đáp án đúng: <strong className="text-emerald-700">{q.correct_answers.join(' / ')}</strong>)
                    </span>
                  )}
                </div>
                <ReviewEvidenceAccordion explanation={q.explanation} evidenceQuote={q.evidence_quote} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
