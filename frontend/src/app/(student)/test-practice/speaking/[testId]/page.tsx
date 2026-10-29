"use client";

import React from 'react';
import { Loader2 } from 'lucide-react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { SpeakingWorkspace } from '@/components/exam/SpeakingWorkspace';
import { useExamWorkspaceContent } from '@/hooks/useExamWorkspaceContent';
import { startTestAttempt, submitSpeakingAttempt } from '@/services/student-test-practice';

export default function SpeakingWorkspacePage() {
  const router = useRouter();
  const routeParams = useParams();
  const testId = routeParams?.testId as string;

  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') as 'exam' | 'practice') || 'exam';

  const { loading, attemptId, speakingData } = useExamWorkspaceContent(testId, 'speaking', mode);

  const handleSubmit = async () => {
    try {
      let currentAttemptId = attemptId;
      if (!currentAttemptId) {
        const attempt = await startTestAttempt(testId, mode === 'exam' ? 'mock' : 'practice');
        currentAttemptId = attempt?.attempt_id || null;
      }
      if (currentAttemptId) {
        await submitSpeakingAttempt(currentAttemptId, {});
        router.push(`/test-practice/speaking/${testId}/summary?attemptId=${currentAttemptId}`);
        return;
      }
    } catch (err) {
      console.warn("Could not submit speaking attempt to backend, proceeding with fallback summary:", err);
    }
    router.push(`/test-practice/speaking/${testId}/summary`);
  };

  if (loading || !speakingData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] gap-3 text-zinc-600">
        <Loader2 className="w-8 h-8 animate-spin text-[#932120]" />
        <p className="text-sm font-bold text-zinc-700">Đang tải nội dung đề thi Speaking thực tế...</p>
      </div>
    );
  }

  return (
    <SpeakingWorkspace
      testData={speakingData}
      mode={mode}
      onSubmit={handleSubmit}
    />
  );
}
