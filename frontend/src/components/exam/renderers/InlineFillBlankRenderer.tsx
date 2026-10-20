import React from 'react';
import { BaseRendererProps, ReviewEvidenceAccordion } from './shared';

export const InlineFillBlankRenderer: React.FC<BaseRendererProps> = ({
  group,
  mode,
  userAnswers,
  onAnswerChange,
  onSelectEvidence
}) => {
  if (!group.template) {
    return (
      <div className="space-y-3">
        {group.questions.map((q) => {
          const answer = (userAnswers[q.question_number] as string) || '';
          const isCorrect = q.correct_answers?.some(a => a.toLowerCase().trim() === answer.toLowerCase().trim());
          let inputClass = "px-3 py-2 border rounded-lg outline-none font-medium text-sm transition-all ";
          if (mode === 'review') {
            inputClass += isCorrect 
              ? "border-green-500 bg-green-50 text-green-700" 
              : "border-red-500 bg-red-50 text-red-700";
          } else {
            inputClass += "border-zinc-300 focus:border-[#932120] focus:ring-1 focus:ring-[#932120] bg-white";
          }

          return (
            <div key={q.question_number} className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold w-7 h-7 shrink-0 bg-white border border-zinc-200 flex items-center justify-center rounded-full text-xs text-zinc-700 font-mono shadow-2xs">
                  {q.question_number}
                </span>
                {q.prompt && <span className="text-sm font-medium text-zinc-800">{q.prompt}</span>}
                <input
                  type="text"
                  placeholder="Nhập câu trả lời..."
                  value={answer}
                  onChange={(e) => mode === 'exam' && onAnswerChange?.(q.question_number, e.target.value)}
                  disabled={mode === 'review'}
                  className={inputClass + " flex-1 min-w-[180px] max-w-sm"}
                />
              </div>
              {mode === 'review' && !isCorrect && q.correct_answers && q.correct_answers.length > 0 && (
                <div className="text-xs font-semibold text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200 inline-block ml-10">
                  Đáp án đúng: {q.correct_answers.join(' / ')}
                </div>
              )}
              {mode === 'review' && (
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

  // Parse template to replace {{X}} with input fields
  const parts = group.template.split(/({{\d+}})/g);

  return (
    <div className="text-zinc-800 leading-loose">
      {parts.map((part, index) => {
        const match = part.match(/{{(\d+)}}/);
        if (match) {
          const qNumber = parseInt(match[1], 10);
          const qData = group.questions.find(q => q.question_number === qNumber);
          const answer = (userAnswers[qNumber] as string) || '';
          
          let inputClass = "mx-2 px-2 py-1 outline-none text-center font-medium transition-colors w-32 ";
          
          if (mode === 'review') {
            const isCorrect = qData?.correct_answers?.some(a => a.toLowerCase() === answer.toLowerCase().trim());
            if (isCorrect) {
              inputClass += "border-b-2 border-green-500 bg-green-50 text-green-700";
            } else {
              inputClass += "border-b-2 border-red-500 bg-red-50 text-red-700";
            }
          } else {
            inputClass += "border-b-2 border-zinc-300 focus:border-[#932120] bg-zinc-50 focus:bg-white";
          }

          return (
            <span key={index} className="inline-block relative group/inline">
              <span className="text-xs font-bold text-zinc-400 absolute -top-3 left-3">{qNumber}</span>
              <input
                type="text"
                value={answer}
                onChange={(e) => mode === 'exam' && onAnswerChange?.(qNumber, e.target.value)}
                disabled={mode === 'review'}
                className={inputClass}
                onClick={() => {
                  if (mode === 'review' && qData?.evidence_paragraph && onSelectEvidence) {
                    onSelectEvidence(qData.evidence_paragraph, qData.evidence_quote || '');
                  }
                }}
              />
            </span>
          );
        }
        return <span key={index} dangerouslySetInnerHTML={{ __html: part }} />;
      })}

      {/* Render Review Panels for incorrect answers or explanations below the text block */}
      {mode === 'review' && (
        <div className="mt-8 space-y-4">
          <h4 className="font-semibold text-zinc-900 border-b pb-2">Chi tiết đáp án:</h4>
          {group.questions.map(q => {
            const answer = (userAnswers[q.question_number] as string) || '';
            const isCorrect = q.correct_answers?.some(a => a.toLowerCase() === answer.toLowerCase().trim());
            
            return (
              <div key={q.question_number} className="p-3 rounded-lg border border-zinc-200 bg-zinc-50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold w-6 h-6 shrink-0 bg-white border border-zinc-300 flex items-center justify-center rounded text-sm text-zinc-700">
                    {q.question_number}
                  </span>
                  {!isCorrect && (
                    <span className="text-sm font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded border border-green-200">
                      Đáp án đúng: {q.correct_answers?.join(' / ')}
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
