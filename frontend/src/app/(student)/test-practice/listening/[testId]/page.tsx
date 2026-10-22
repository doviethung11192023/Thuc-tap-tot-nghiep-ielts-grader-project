"use client";

import React, { useState } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { mockListeningFullTest } from '@/mocks/exam-listening';
import { ListeningWorkspace } from '@/components/exam/ListeningWorkspace';
import { ListeningResultsView } from '@/components/exam/ListeningResultsView';

export default function ListeningWorkspacePage() {
  const router = useRouter();
  const routeParams = useParams();
  const testId = routeParams?.testId as string;

  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') as 'exam' | 'practice') || 'practice';

  const initialView = searchParams.get('view') === 'result';
  const [isSubmitted, setIsSubmitted] = useState<boolean>(initialView);
  const [userAnswers, setUserAnswers] = useState<Record<number, string | string[]>>({
    1: '07700 900123',
    2: 'railway station',
    3: '650',
    4: 'B',
    5: 'D',
    6: 'B',
    7: 'volcanic ash'
  });

  const handleSubmit = (answers: Record<number, string | string[]>) => {
    setUserAnswers(answers);
    router.push(`/test-practice/listening/${testId}/summary`);
  };

  const handleRetake = () => {
    setUserAnswers({});
    setIsSubmitted(false);
  };

  if (isSubmitted) {
    return (
      <ListeningResultsView
        testData={mockListeningFullTest}
        userAnswers={userAnswers}
        mode={mode}
        onRetake={handleRetake}
      />
    );
  }

  return (
    <ListeningWorkspace
      testData={mockListeningFullTest}
      mode={mode}
      onSubmit={handleSubmit}
    />
  );
}
