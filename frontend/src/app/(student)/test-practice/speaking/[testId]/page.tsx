"use client";

import React from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { SpeakingWorkspace } from '@/components/exam/SpeakingWorkspace';
import { ExamWorkspaceSkeleton } from '@/components/exam/ExamWorkspaceSkeleton';
import { useExamWorkspaceContent } from '@/hooks/useExamWorkspaceContent';
import { discardAttempt, startTestAttempt, submitSpeakingAttempt } from '@/services/student-test-practice';

export default function SpeakingWorkspacePage() {
  const router = useRouter();
  const routeParams = useParams();
  const testId = routeParams?.testId as string;

  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') as 'exam' | 'practice') || 'exam';
  const returnUrl = searchParams.get('returnUrl') || '';

  const { loading, attemptId, speakingData } = useExamWorkspaceContent(testId, 'speaking', mode);

  const handleSubmit = async () => {
    const returnQuery = returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : '';
    try {
      let currentAttemptId = attemptId;
      if (!currentAttemptId) {
        const attempt = await startTestAttempt(testId, mode === 'exam' ? 'mock' : 'practice');
        currentAttemptId = attempt?.attempt_id || null;
      }
      if (currentAttemptId) {
        await submitSpeakingAttempt(currentAttemptId, {});
        router.push(`/test-practice/speaking/${testId}/summary?attemptId=${currentAttemptId}${returnQuery}`);
        return;
      }
    } catch (err) {
      console.warn("Could not submit speaking attempt to backend, proceeding with fallback summary:", err);
    }
    const fallbackPath = returnUrl 
      ? `/test-practice/speaking/${testId}/summary?returnUrl=${encodeURIComponent(returnUrl)}`
      : `/test-practice/speaking/${testId}/summary`;
    router.push(fallbackPath);
  };

  if (loading || !speakingData) {
    return <ExamWorkspaceSkeleton skill="speaking" />;
  }

  return (
    <SpeakingWorkspace
      testData={speakingData}
      mode={mode}
      onAbandon={mode === 'exam' ? () => discardAttempt(attemptId) : undefined}
      returnUrl={returnUrl || undefined}
      onSubmit={handleSubmit}
    />
  );
}
