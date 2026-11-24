import React from 'react';
import { QuestionGroupData, QuestionMode } from '@/types/exam';
import { renderSafeInlineMarkdown } from '@/utils/safe-markdown-inline';

export interface BaseRendererProps {
  group: QuestionGroupData;
  mode: QuestionMode;
  userAnswers: Record<number, string | string[]>;
  onAnswerChange?: (questionNumber: number, value: any) => void;
  onSelectEvidence?: (paragraph: string, quote: string) => void;
}

export const formatAnswerDisplay = (answers?: string[]): string => {
  if (!answers || answers.length === 0) return '';
  return answers.join(' / ');
};

export const ReviewEvidenceAccordion: React.FC<{
  explanation?: string;
  evidenceQuote?: string;
}> = ({ explanation, evidenceQuote }) => {
  if (!explanation && !evidenceQuote) return null;

  return (
    <div className="mt-2 bg-red-50/40 rounded-md border border-red-200/70 p-3 text-sm">
      <div className="font-semibold text-[#932120] mb-1 text-xs uppercase tracking-wider">Giải thích chi tiết</div>
      {evidenceQuote && (
        <div className="mb-2 italic text-zinc-700 border-l-2 border-[#932120]/40 pl-2">
          "{evidenceQuote}"
        </div>
      )}
      {explanation && (
        <div className="text-zinc-800 space-y-1 leading-relaxed font-sans mt-2">
          {explanation.split('\n').map((line, idx) => (
            <div key={idx}>{line ? renderSafeInlineMarkdown(line) : '\u00A0'}</div>
          ))}
        </div>
      )}
    </div>
  );
};
