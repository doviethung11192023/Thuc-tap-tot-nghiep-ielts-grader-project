"use client";

import React, { useState } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { mockReadingFullTest } from '@/mocks/exam-reading';
import { ReadingWorkspace } from '@/components/exam/ReadingWorkspace';
import { ReadingResultsView } from '@/components/exam/ReadingResultsView';

export default function ReadingWorkspacePage() {
  const router = useRouter();
  const routeParams = useParams();
  const testId = routeParams?.testId as string;

  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') as 'exam' | 'practice') || 'practice';
  const parts = searchParams.get('parts')?.split(',') || ['1', '2', '3'];

  const initialView = searchParams.get('view') === 'result';
  const [isSubmitted, setIsSubmitted] = useState<boolean>(initialView);
  const [userAnswers, setUserAnswers] = useState<Record<number, string | string[]>>({
    1: 'proteins',
    2: 'deep',
    3: 'TRUE',
    4: 'FALSE',
    6: 'hippocampus',
    7: 'synaptic connections',
    8: 'i',
    9: 'ii',
    10: 'iii',
    11: 'B',
    12: 'C'
  });

  const handleSubmit = (answers: Record<number, string | string[]>) => {
    setUserAnswers(answers);
    router.push(`/test-practice/reading/${testId}/summary`);
  };

  const handleRetake = () => {
    setUserAnswers({});
    setIsSubmitted(false);
  };

  if (isSubmitted) {
    return (
      <ReadingResultsView
        testData={mockReadingFullTest}
        userAnswers={userAnswers}
        mode={mode}
        onRetake={handleRetake}
      />
    );
  }

  return (
    <ReadingWorkspace
      testData={mockReadingFullTest}
      mode={mode}
      selectedParts={parts}
      onSubmit={handleSubmit}
    />
  );
}
