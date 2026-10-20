import React from 'react';
import { BaseRendererProps, ReviewEvidenceAccordion } from './shared';
import Image from 'next/image';

export const DiagramLabellingRenderer: React.FC<BaseRendererProps> = ({
  group,
  mode,
  userAnswers,
  onAnswerChange,
  onSelectEvidence
}) => {
  if (!group.diagram_image_url) {
    return <div className="text-red-500">Error: Missing diagram_image_url for DiagramLabelling.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="relative inline-block w-full max-w-2xl mx-auto border border-zinc-200 rounded-lg overflow-hidden bg-zinc-50 shadow-sm">
        {/* We use an img tag with placeholder if it's a generic diagram, or Next Image if domains are configured. Using img for demo flexibility */}
        <img 
          src={group.diagram_image_url} 
          alt="Diagram" 
          className="w-full h-auto object-contain"
        />
        
        {/* Render Hotspots */}
        {group.questions.map(q => {
          if (!q.diagram_coordinate) return null;
          
          const answer = (userAnswers[q.question_number] as string) || '';
          let pinClass = "absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 ";
          let inputClass = "w-32 px-2 py-1 text-sm border-2 outline-none font-medium transition-colors shadow-sm rounded-md bg-white ";
          
          if (mode === 'review') {
            const isCorrect = q.correct_answers?.some(a => a.toLowerCase() === answer.toLowerCase().trim());
            if (isCorrect) {
              inputClass += "border-green-500 text-green-700 bg-green-50";
            } else {
              inputClass += "border-red-500 text-red-700 bg-red-50";
            }
          } else {
            inputClass += "border-zinc-300 focus:border-[#932120] hover:border-zinc-400";
          }

          return (
            <div 
              key={q.question_number} 
              className={pinClass}
              style={{ left: `${q.diagram_coordinate.x}%`, top: `${q.diagram_coordinate.y}%` }}
            >
              <div className="w-6 h-6 shrink-0 bg-zinc-900 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md">
                {q.question_number}
              </div>
              
              {group.options_pool ? (
                // Dropdown case (Selecting from a wordlist)
                <select
                  value={answer}
                  onChange={(e) => mode === 'exam' && onAnswerChange?.(q.question_number, e.target.value)}
                  disabled={mode === 'review'}
                  className={inputClass}
                  onClick={() => {
                    if (mode === 'review' && q.evidence_paragraph && onSelectEvidence) {
                      onSelectEvidence(q.evidence_paragraph, q.evidence_quote || '');
                    }
                  }}
                >
                  <option value="" disabled>Select...</option>
                  {group.options_pool.map(opt => (
                    <option key={opt.key} value={opt.key}>{opt.key}. {opt.text}</option>
                  ))}
                </select>
              ) : (
                // Input case (Typing word)
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => mode === 'exam' && onAnswerChange?.(q.question_number, e.target.value)}
                  disabled={mode === 'review'}
                  className={inputClass}
                  onClick={() => {
                    if (mode === 'review' && q.evidence_paragraph && onSelectEvidence) {
                      onSelectEvidence(q.evidence_paragraph, q.evidence_quote || '');
                    }
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Review Explanation Panel */}
      {mode === 'review' && (
        <div className="mt-8 space-y-4">
          <h4 className="font-semibold text-zinc-900 border-b pb-2">Chi tiết đáp án sơ đồ:</h4>
          {group.questions.map(q => {
            const answer = (userAnswers[q.question_number] as string) || '';
            const isCorrect = q.correct_answers?.some(a => a.toLowerCase() === answer.toLowerCase().trim());
            
            return (
              <div key={q.question_number} className="p-3 rounded-lg border border-zinc-200 bg-zinc-50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold w-6 h-6 shrink-0 bg-zinc-900 text-white flex items-center justify-center rounded-full text-xs">
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
