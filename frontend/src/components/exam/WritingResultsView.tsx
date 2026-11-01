"use client";

import React from 'react';
import { mockWritingExamDataset } from '@/mocks/exam-writing';
import { WritingResultsHeader } from './writing-results/WritingResultsHeader';
import { WritingEssayHighlightsPane } from './writing-results/WritingEssayHighlightsPane';
import { WritingScoreCriteriaPane } from './writing-results/WritingScoreCriteriaPane';

interface WritingResultsViewProps {
  essayText?: string;
  onRetake: () => void;
  returnUrl?: string;
}

export function WritingResultsView({ essayText, onRetake, returnUrl }: WritingResultsViewProps) {
  const result = mockWritingExamDataset.grading_result;
  const content = essayText || mockWritingExamDataset.sample_student_submission;

  return (
    <div className="flex flex-col h-[calc(100vh-4.25rem)] w-full bg-zinc-50 rounded-2xl overflow-hidden shadow-lg border border-zinc-200">
      <WritingResultsHeader onRetake={onRetake} returnUrl={returnUrl} />
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <WritingEssayHighlightsPane essayText={content} highlights={result.highlights as any} />
        <WritingScoreCriteriaPane gradingResult={result} />
      </div>
    </div>
  );
}
