"use client";

import React from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { WritingWorkspace } from '@/components/exam/WritingWorkspace';
import { ExamWorkspaceSkeleton } from '@/components/exam/ExamWorkspaceSkeleton';
import { useExamWorkspaceContent } from '@/hooks/useExamWorkspaceContent';
import { startTestAttempt, submitWritingAttempt } from '@/services/student-test-practice';

export default function WritingWorkspacePage() {
  const router = useRouter();
  const routeParams = useParams();
  const testId = routeParams?.testId as string;

  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') as 'exam' | 'practice') || 'exam';

  const { loading, attemptId, writingData } = useExamWorkspaceContent(testId, 'writing', mode);

  const handleSubmit = async (text: string) => {
    try {
      let currentAttemptId = attemptId;
      if (!currentAttemptId) {
        const attempt = await startTestAttempt(testId, mode === 'exam' ? 'mock' : 'practice');
        currentAttemptId = attempt?.attempt_id || null;
      }
      if (currentAttemptId) {
        await submitWritingAttempt(currentAttemptId, { essay_text: text });
        router.push(`/test-practice/writing/${testId}/summary?attemptId=${currentAttemptId}`);
        return;
      }
    } catch (err) {
      console.warn("Could not submit writing attempt to backend, proceeding with fallback summary:", err);
    }
    router.push(`/test-practice/writing/${testId}/summary`);
  };

  if (loading || !writingData) {
    return <ExamWorkspaceSkeleton skill="writing" />;
  }

  return (
    <WritingWorkspace
      testData={writingData}
      mode={mode}
      onSubmit={handleSubmit}
    />
  );
}
