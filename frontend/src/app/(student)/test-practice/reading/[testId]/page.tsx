"use client";

import React, { useState } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { mockReadingFullTest } from '@/mocks/exam-reading';
import { cleanReadingTest1Data } from '@/mocks/clean-dataset/reading-test-1-clean';
import { ReadingWorkspace } from '@/components/exam/ReadingWorkspace';

export default function ReadingWorkspacePage() {
  const router = useRouter();
  const routeParams = useParams();
  const testId = routeParams?.testId as string;

  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') as 'exam' | 'practice') || 'practice';
  const parts = searchParams.get('parts')?.split(',') || ['1', '2', '3'];

  // Dùng mockReadingFullTest cho không gian làm bài thi tương tác
  const activeTestData = mockReadingFullTest;

  const handleSubmit = (answers: Record<number, string | string[]>) => {
    router.push(`/test-practice/reading/${testId}/summary`);
  };

  return (
    <ReadingWorkspace
      testData={activeTestData}
      mode={mode}
      selectedParts={parts}
      onSubmit={handleSubmit}
    />
  );
}

