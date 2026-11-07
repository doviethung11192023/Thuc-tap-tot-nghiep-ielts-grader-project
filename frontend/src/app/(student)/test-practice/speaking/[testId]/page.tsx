"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { SpeakingWorkspace } from '@/components/exam/SpeakingWorkspace';
import { ExamWorkspaceSkeleton } from '@/components/exam/ExamWorkspaceSkeleton';
import { useExamWorkspaceContent } from '@/hooks/useExamWorkspaceContent';
import { discardAttempt, submitSpeakingAttempt } from '@/services/student-test-practice';

export default function SpeakingWorkspacePage() {
  const router = useRouter();
  const routeParams = useParams();
  const testId = routeParams?.testId as string;

  const searchParams = useSearchParams();
  const requestedMode = (searchParams.get('mode') as 'exam' | 'practice') || 'exam';
  const returnUrl = searchParams.get('returnUrl') || '';

  const { loading, attemptId, attemptMode, attemptError, deadlineMs, speakingData } =
    useExamWorkspaceContent(testId, 'speaking', requestedMode);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Attempt dở có thể khác mode trên URL; quy tắc phòng thi đi theo attempt thật trên server.
  const mode = attemptMode ? (attemptMode === 'mock' ? 'exam' : 'practice') : requestedMode;

  const handleSubmit = async () => {
    if (!attemptId) return;
    setSubmitError(null);
    const returnQuery = returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : '';
    const summaryPath = `/test-practice/speaking/${testId}/summary?attemptId=${attemptId}${returnQuery}`;
    try {
      await submitSpeakingAttempt(attemptId);
      router.push(summaryPath);
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      if (detail === 'Bài thi đã được nộp trước đó') {   // nộp hai lần: lần đầu có hiệu lực (UC-08)
        router.push(summaryPath);
        return;
      }
      setSubmitError(typeof detail === 'string' ? detail : 'Không nộp được bài. Hãy kiểm tra mạng rồi thử lại.');
    }
  };

  if (attemptError || (!loading && !speakingData)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-slate-700">{attemptError || 'Không tải được đề thi.'}</p>
        <Link href={returnUrl || '/test-practice'} className="text-sm font-semibold text-blue-600 hover:underline">
          Quay lại
        </Link>
      </div>
    );
  }

  if (loading || !speakingData || !attemptId) {
    return <ExamWorkspaceSkeleton skill="speaking" />;
  }

  return (
    <SpeakingWorkspace
      testData={speakingData}
      attemptId={attemptId}
      mode={mode}
      deadlineMs={deadlineMs}
      submitError={submitError}
      onAbandon={mode === 'exam' ? () => discardAttempt(attemptId) : undefined}
      returnUrl={returnUrl || undefined}
      onSubmit={handleSubmit}
    />
  );
}
