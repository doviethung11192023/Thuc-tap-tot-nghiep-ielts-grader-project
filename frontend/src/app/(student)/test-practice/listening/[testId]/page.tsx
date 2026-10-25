"use client";

import React, { useState } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { mockListeningFullTest } from '@/mocks/exam-listening';
import { cleanListeningTest1Data } from '@/mocks/clean-dataset/listening-test-1-clean';
import { ListeningWorkspace } from '@/components/exam/ListeningWorkspace';

export default function ListeningWorkspacePage() {
  const router = useRouter();
  const routeParams = useParams();
  const testId = routeParams?.testId as string;

  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') as 'exam' | 'practice') || 'practice';

  // Dùng mockListeningFullTest cho không gian làm bài thi tương tác
  const activeTestData = mockListeningFullTest;

  const handleSubmit = (answers: Record<number, string | string[]>) => {
    router.push(`/test-practice/listening/${testId}/summary`);
  };

  return (
    <ListeningWorkspace
      testData={activeTestData}
      mode={mode}
      onSubmit={handleSubmit}
    />
  );
}

