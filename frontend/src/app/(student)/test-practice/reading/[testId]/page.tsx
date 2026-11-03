"use client";

import React from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { ReadingWorkspace } from '@/components/exam/ReadingWorkspace';
import { ExamWorkspaceSkeleton } from '@/components/exam/ExamWorkspaceSkeleton';
import { useExamWorkspaceContent } from '@/hooks/useExamWorkspaceContent';
import { discardAttempt, startTestAttempt, submitReadingListeningAnswers } from '@/services/student-test-practice';

export default function ReadingWorkspacePage() {
  const router = useRouter();
  const routeParams = useParams();
  const testId = routeParams?.testId as string;

  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') as 'exam' | 'practice') || 'practice';
  const parts = searchParams.get('parts')?.split(',') || ['1', '2', '3'];
  const returnUrl = searchParams.get('returnUrl') || '';

  const { loading, attemptId, deadlineMs, readingData } = useExamWorkspaceContent(testId, 'reading', mode);

  const handleSubmit = async (answers: Record<number, string | string[]>) => {
    const returnQuery = returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : '';
    try {
      let currentAttemptId = attemptId;
      if (!currentAttemptId) {
        const attempt = await startTestAttempt(testId, mode === 'exam' ? 'mock' : 'practice', 'reading');
        currentAttemptId = attempt?.attempt_id || null;
      }
      const partNums = parts.map(Number);
      if (currentAttemptId) {
        await submitReadingListeningAnswers(currentAttemptId, { answers, parts: partNums });
        router.push(`/test-practice/reading/${testId}/summary?attemptId=${currentAttemptId}&parts=${parts.join(',')}${returnQuery}`);
        return;
      }
    } catch (err) {
      console.warn("Could not submit reading attempt to backend, proceeding with fallback summary:", err);
    }
    router.push(`/test-practice/reading/${testId}/summary?parts=${parts.join(',')}${returnQuery}`);
  };

  if (loading || !readingData) {
    return <ExamWorkspaceSkeleton skill="reading" />;
  }

  return (
    <ReadingWorkspace
      testData={readingData}
      mode={mode}
      onAbandon={mode === 'exam' ? () => discardAttempt(attemptId) : undefined}
      deadlineMs={mode === 'exam' ? deadlineMs : null}
      selectedParts={parts}
      returnUrl={returnUrl || undefined}
      onSubmit={handleSubmit}
    />
  );
}
