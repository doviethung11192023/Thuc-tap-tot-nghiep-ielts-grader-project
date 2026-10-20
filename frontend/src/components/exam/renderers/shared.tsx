import React from 'react';
import { QuestionGroupData, QuestionMode } from '@/types/exam';

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
    <div className="mt-2 bg-blue-50/50 rounded-md border border-blue-100 p-3 text-sm">
      <div className="font-semibold text-blue-900 mb-1 text-xs uppercase tracking-wider">Giải thích chi tiết</div>
      {evidenceQuote && (
        <div className="mb-2 italic text-zinc-700 border-l-2 border-blue-300 pl-2">
          "{evidenceQuote}"
        </div>
      )}
      {explanation && (
        <div className="text-zinc-800 whitespace-pre-wrap leading-relaxed font-sans mt-2">
          {explanation}
        </div>
      )}
    </div>
  );
};
