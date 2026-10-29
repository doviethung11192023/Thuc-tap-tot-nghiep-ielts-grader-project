"use client";

import React from 'react';
import { Loader2 } from 'lucide-react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { WritingWorkspace } from '@/components/exam/WritingWorkspace';
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
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] gap-3 text-zinc-600">
        <Loader2 className="w-8 h-8 animate-spin text-[#932120]" />
        <p className="text-sm font-bold text-zinc-700">Đang tải nội dung đề thi Writing thực tế...</p>
      </div>
    );
  }

  return (
    <WritingWorkspace
      testData={writingData}
      mode={mode}
      onSubmit={handleSubmit}
    />
  );
}
