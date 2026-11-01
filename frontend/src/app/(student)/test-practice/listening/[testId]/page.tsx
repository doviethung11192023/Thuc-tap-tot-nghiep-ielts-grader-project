"use client";

import React from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { ListeningWorkspace } from '@/components/exam/ListeningWorkspace';
import { ExamWorkspaceSkeleton } from '@/components/exam/ExamWorkspaceSkeleton';
import { useExamWorkspaceContent } from '@/hooks/useExamWorkspaceContent';
import { startTestAttempt, submitReadingListeningAnswers } from '@/services/student-test-practice';

export default function ListeningWorkspacePage() {
  const router = useRouter();
  const routeParams = useParams();
  const testId = routeParams?.testId as string;

  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') as 'exam' | 'practice') || 'practice';
  const parts = searchParams.get('parts')?.split(',') || ['1', '2', '3', '4'];

  const { loading, attemptId, listeningData } = useExamWorkspaceContent(testId, 'listening', mode);

  const handleSubmit = async (answers: Record<number, string | string[]>) => {
    try {
      let currentAttemptId = attemptId;
      if (!currentAttemptId) {
        const attempt = await startTestAttempt(testId, mode === 'exam' ? 'mock' : 'practice', 'listening');
        currentAttemptId = attempt?.attempt_id || null;
      }
      const partNums = parts.map(Number);
      if (currentAttemptId) {
        await submitReadingListeningAnswers(currentAttemptId, { answers, parts: partNums });
        router.push(`/test-practice/listening/${testId}/summary?attemptId=${currentAttemptId}&parts=${parts.join(',')}`);
        return;
      }
    } catch (err) {
      console.warn("Could not submit listening attempt to backend, proceeding with fallback summary:", err);
    }
    router.push(`/test-practice/listening/${testId}/summary?parts=${parts.join(',')}`);
  };

  if (loading || !listeningData) {
    return <ExamWorkspaceSkeleton skill="listening" />;
  }

  return (
    <ListeningWorkspace
      testData={listeningData}
      mode={mode}
      selectedParts={parts}
      onSubmit={handleSubmit}
    />
  );
}
