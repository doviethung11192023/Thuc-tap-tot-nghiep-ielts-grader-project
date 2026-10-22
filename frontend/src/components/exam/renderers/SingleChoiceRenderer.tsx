import React from 'react';
import { BaseRendererProps, ReviewEvidenceAccordion } from './shared';

export const SingleChoiceRenderer: React.FC<BaseRendererProps> = ({ 
  group, 
  mode, 
  userAnswers, 
  onAnswerChange, 
  onSelectEvidence 
}) => {
  const isTrueFalseType = group.question_type.includes('true_false') || group.question_type.includes('yes_no');
  const defaultOptions = isTrueFalseType 
    ? [
        { key: group.question_type.includes('true') ? 'TRUE' : 'YES', text: group.question_type.includes('true') ? 'TRUE' : 'YES' },
        { key: group.question_type.includes('false') ? 'FALSE' : 'NO', text: group.question_type.includes('false') ? 'FALSE' : 'NO' },
        { key: 'NOT GIVEN', text: 'NOT GIVEN' }
      ]
    : group.options_pool || [];

  return (
    <div className="space-y-6">
      {group.questions.map((q) => {
        const answer = userAnswers[q.question_number] as string;
        const isCorrect = q.correct_answers?.includes(answer);
        const hasAnswered = answer !== undefined && answer !== '';

        let containerClass = "p-4 rounded-lg border transition-colors";
        if (mode === 'review') {
          if (!hasAnswered) containerClass += " border-red-200 bg-red-50/30";
          else if (isCorrect) containerClass += " border-green-200 bg-green-50/30";
          else containerClass += " border-red-200 bg-red-50/30";
        } else {
          containerClass += " border-zinc-100 hover:border-zinc-200";
        }

        return (
          <div 
            key={q.question_number} 
            className={containerClass}
            onClick={() => {
              if (mode === 'review' && q.evidence_paragraph && onSelectEvidence) {
                onSelectEvidence(q.evidence_paragraph, q.evidence_quote || '');
              }
            }}
          >
            <div className="flex gap-3">
              <span className="font-semibold w-6 shrink-0 bg-zinc-100 h-6 flex items-center justify-center rounded-full text-sm text-zinc-700">
                {q.question_number}
              </span>
              <div className="flex-1">
                {q.prompt && <p className="mb-3 text-zinc-800">{q.prompt}</p>}
                
                <div className="space-y-2">
                  {defaultOptions.map(opt => {
                    const isSelected = answer === opt.key;
                    
                    let radioClass = "flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ";
                    if (mode === 'review') {
                      const isCorrectOption = q.correct_answers?.includes(opt.key);
                      if (isCorrectOption) {
                        radioClass += "border-green-500 bg-green-50 text-green-800 font-medium";
                      } else if (isSelected && !isCorrect) {
                        radioClass += "border-red-500 bg-red-50 text-red-800";
                      } else {
                        radioClass += "border-zinc-200 opacity-50";
                      }
                    } else {
                      radioClass += isSelected ? "border-[#932120] bg-red-50" : "border-zinc-200 hover:bg-zinc-50";
                    }

                    return (
                      <label key={opt.key} className={radioClass}>
                        <input
                          type="radio"
                          name={`q-${q.question_number}`}
                          value={opt.key}
                          checked={isSelected}
                          onChange={() => mode === 'exam' && onAnswerChange?.(q.question_number, opt.key)}
                          disabled={mode === 'review'}
                          className="w-4 h-4 text-[#932120] focus:ring-[#932120] border-zinc-300"
                        />
                        <span className="text-sm">
                          {!isTrueFalseType && <span className="font-semibold mr-2">{opt.key}.</span>}
                          {opt.text}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {mode === 'review' && !isCorrect && q.correct_answers && (
                  <div className="mt-3 text-sm font-medium text-green-700 bg-green-50 px-3 py-2 rounded-md border border-green-200 inline-block">
                    Đáp án đúng: {q.correct_answers.join(' / ')}
                  </div>
                )}
                
                {mode === 'review' && (
                  <ReviewEvidenceAccordion explanation={q.explanation} evidenceQuote={q.evidence_quote} />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
