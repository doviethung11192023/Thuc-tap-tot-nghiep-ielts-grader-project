"use client";

import React from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { WritingWorkspace } from '@/components/exam/WritingWorkspace';
import { ExamWorkspaceSkeleton } from '@/components/exam/ExamWorkspaceSkeleton';
import { useExamWorkspaceContent } from '@/hooks/useExamWorkspaceContent';
import { discardAttempt, startTestAttempt, submitWritingAttempt } from '@/services/student-test-practice';
import { useNotificationStore } from '@/stores/notification-store';

export default function WritingWorkspacePage() {
  const router = useRouter();
  const routeParams = useParams();
  const testId = routeParams?.testId as string;

  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') as 'exam' | 'practice') || 'exam';
  const returnUrl = searchParams.get('returnUrl') || '';
  const parts = searchParams.get('parts') || undefined;

  const { loading, attemptId, deadlineMs, writingData } = useExamWorkspaceContent(testId, 'writing', mode);

  const handleSubmit = async (text: string, task1Text?: string, task2Text?: string) => {
    const returnQuery = returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : '';
    try {
      let currentAttemptId = attemptId;
      if (!currentAttemptId) {
        const attempt = await startTestAttempt(testId, mode === 'exam' ? 'mock' : 'practice');
        currentAttemptId = attempt?.attempt_id || null;
      }
      if (currentAttemptId) {
        await submitWritingAttempt(currentAttemptId, {
          essay_text: text,
          task1_text: task1Text,
          task2_text: task2Text,
        });
        useNotificationStore.getState().addNotification({
          attempt_id: currentAttemptId,
          title: writingData?.title || "IELTS Academic Writing Test",
          message: "Bài thi đã được nộp và ghi nhận kết quả đánh giá 4 tiêu chí.",
          type: "grading_complete",
          action_url: `/test-practice/writing/${testId}/summary?attemptId=${currentAttemptId}${returnQuery}`
        });
        router.push(`/test-practice/writing/${testId}/summary?attemptId=${currentAttemptId}${returnQuery}`);
        return;
      }
    } catch (err) {
      console.warn("Could not submit writing attempt to backend, proceeding with fallback summary:", err);
    }
    const fallbackPath = returnUrl 
      ? `/test-practice/writing/${testId}/summary?returnUrl=${encodeURIComponent(returnUrl)}`
      : `/test-practice/writing/${testId}/summary`;
    router.push(fallbackPath);
  };

  if (loading || !writingData) {
    return <ExamWorkspaceSkeleton skill="writing" />;
  }

  return (
    <WritingWorkspace
      testData={writingData}
      mode={mode}
      onAbandon={mode === 'exam' ? () => discardAttempt(attemptId) : undefined}
      deadlineMs={mode === 'exam' ? deadlineMs : null}
      parts={parts}
      returnUrl={returnUrl || undefined}
      onSubmit={handleSubmit}
    />
  );
}
