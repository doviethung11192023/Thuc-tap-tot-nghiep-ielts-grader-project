"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { ListeningWorkspace } from '@/components/exam/ListeningWorkspace';
import { ExamWorkspaceSkeleton } from '@/components/exam/ExamWorkspaceSkeleton';
import { useExamWorkspaceContent } from '@/hooks/useExamWorkspaceContent';
import { discardAttempt, startTestAttempt, submitReadingListeningAnswers } from '@/services/student-test-practice';

export default function ListeningWorkspacePage() {
  const router = useRouter();
  const routeParams = useParams();
  const testId = routeParams?.testId as string;

  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') as 'exam' | 'practice') || 'practice';
  const parts = searchParams.get('parts')?.split(',') || ['1', '2', '3', '4'];
  const returnUrl = searchParams.get('returnUrl') || '';

  const { loading, attemptId, deadlineMs, listeningData } = useExamWorkspaceContent(testId, 'listening', mode);
  const startedAtRef = useRef<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    startedAtRef.current = Date.now();
  }, [testId, mode]);

  const handleSubmit = async (answers: Record<number, string | string[]>) => {
    setSubmitError(null);
    const returnQuery = returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : '';
    try {
      let currentAttemptId = attemptId;
      if (!currentAttemptId) {
        const attempt = await startTestAttempt(testId, mode === 'exam' ? 'mock' : 'practice', 'listening');
        currentAttemptId = attempt?.attempt_id || null;
      }
      if (!currentAttemptId) {
        throw new Error("Không khởi tạo được phiên làm bài để nộp.");
      }
      const partNums = parts.map(Number);
      const elapsedMs = startedAtRef.current ? Date.now() - startedAtRef.current : 1000;
      const timeSpentSec = Math.max(1, Math.round(elapsedMs / 1000));
      await submitReadingListeningAnswers(currentAttemptId, {
        answers,
        parts: partNums,
        time_spent_sec: timeSpentSec,
      });
      try {
        localStorage.removeItem(`ielts_listening_draft_${testId}`);
      } catch {
        // Ignore storage cleanup errors
      }
      router.push(`/test-practice/listening/${testId}/summary?attemptId=${currentAttemptId}&parts=${parts.join(',')}${returnQuery}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Nộp bài Listening thất bại. Vui lòng kiểm tra kết nối và thử lại.";
      setSubmitError(msg);
      throw err;
    }
  };

  if (loading || !listeningData) {
    return <ExamWorkspaceSkeleton skill="listening" />;
  }

  return (
    <div className="space-y-3">
      {submitError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-900 shadow-2xs"
        >
          <span>{submitError}</span>
          <button
            type="button"
            onClick={() => setSubmitError(null)}
            className="px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-100 rounded-md cursor-pointer"
          >
            Đóng
          </button>
        </div>
      )}
      <ListeningWorkspace
        testData={listeningData}
        mode={mode}
        onAbandon={mode === 'exam' ? () => discardAttempt(attemptId) : undefined}
        deadlineMs={mode === 'exam' ? deadlineMs : null}
        selectedParts={parts}
        returnUrl={returnUrl || undefined}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
