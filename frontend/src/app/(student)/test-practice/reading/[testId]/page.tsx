"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { ReadingWorkspace } from '@/components/exam/ReadingWorkspace';
import { AttemptErrorBanner } from '@/components/exam/AttemptErrorBanner';
import { ExamWorkspaceSkeleton } from '@/components/exam/ExamWorkspaceSkeleton';
import { ExamPageNotice } from '@/components/exam/ExamPageNotice';
import { useExamWorkspaceContent } from '@/hooks/useExamWorkspaceContent';
import { useServerAutosave } from '@/hooks/useServerAutosave';
import { AutosaveStatusBadge } from '@/components/exam/AutosaveStatusBadge';
import { discardAttempt, startTestAttempt, submitReadingListeningAnswers } from '@/services/student-test-practice';
import { closedAttemptMessage, isAlreadySubmitted, submitFailureMessage } from '@/utils/attempt-submission';

export default function ReadingWorkspacePage() {
  const router = useRouter();
  const routeParams = useParams();
  const testId = routeParams?.testId as string;

  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') as 'exam' | 'practice') || 'practice';
  const parts = searchParams.get('parts')?.split(',') || ['1', '2', '3'];
  const returnUrl = searchParams.get('returnUrl') || '';
  const returnQuery = returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : '';
  const summaryPath = (id: string) =>
    `/test-practice/reading/${testId}/summary?attemptId=${id}&parts=${parts.join(',')}${returnQuery}`;

  const { loading, attemptId, attemptError, attemptErrorStatus, deadlineMs, readingData, savedWork, closedAttempt } =
    useExamWorkspaceContent(testId, 'reading', mode);
  // Tự lưu đáp án lên server (FR-11): mất mạng, đóng tab hay đổi máy vẫn làm tiếp được
  const [answers, setAnswers] = useState<Record<number, string | string[]> | null>(null);
  const autosavePayload = useMemo(() => (answers ? { answers } : null), [answers]);
  const autosave = useServerAutosave(attemptId, autosavePayload);
  const startedAtRef = useRef<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    startedAtRef.current = Date.now();
  }, [testId, mode]);

  // Bài Mock đã kết thúc (tự nộp khi hết giờ): tới thẳng kết quả (spec 004 US2)
  useEffect(() => {
    if (closedAttempt && closedAttempt.status !== 'abandoned') router.replace(summaryPath(closedAttempt.attempt_id));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closedAttempt]);

  // Nộp lỗi thì báo lỗi và ở lại phòng thi; không bao giờ chuyển sang trang kết quả không có bài thật
  const handleSubmit = async (answers: Record<number, string | string[]>) => {
    setSubmitError(null);
    let currentAttemptId = attemptId;
    try {
      if (!currentAttemptId) {
        const attempt = await startTestAttempt(testId, mode === 'exam' ? 'mock' : 'practice', 'reading');
        currentAttemptId = attempt?.attempt_id || null;
      }
      if (!currentAttemptId) throw new Error("Không khởi tạo được phiên làm bài để nộp.");
      const elapsedMs = startedAtRef.current ? Date.now() - startedAtRef.current : 1000;
      await submitReadingListeningAnswers(currentAttemptId, {
        answers,
        parts: parts.map(Number),
        time_spent_sec: Math.max(1, Math.round(elapsedMs / 1000)),
      });
      router.push(summaryPath(currentAttemptId));
    } catch (err) {
      if (currentAttemptId && isAlreadySubmitted(err)) {     // nộp ở tab khác hoặc đã tự nộp: kết quả là bài đó
        router.push(summaryPath(currentAttemptId));
        return;
      }
      setSubmitError(submitFailureMessage(err));
      throw err;      // workspace tắt màn "đang chấm" để Learner nộp lại
    }
  };

  if (closedAttempt) return <ExamPageNotice message={closedAttemptMessage(closedAttempt)} />;
  if (mode === 'exam' && attemptError) return <ExamPageNotice message={attemptError} />;
  if (!loading && !readingData) {
    return <ExamPageNotice message="Không tải được đề thi. Hãy kiểm tra kết nối rồi tải lại trang." />;
  }
  if (loading || !readingData) {
    return <ExamWorkspaceSkeleton skill="reading" />;
  }

  return (
    <div className="space-y-3">
      <AttemptErrorBanner
        skill="reading"
        testId={testId}
        mode={mode}
        attemptError={attemptError}
        attemptErrorStatus={attemptErrorStatus}
        returnUrl={returnUrl}
      />
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
      <ReadingWorkspace
        testData={readingData}
        initialAnswers={savedWork?.answers}
        onAnswersChange={setAnswers}
        mode={mode}
        attemptId={attemptId}
        attemptError={attemptError}
        onAbandon={mode === 'exam' ? () => discardAttempt(attemptId) : undefined}
        deadlineMs={mode === 'exam' ? deadlineMs : null}
        selectedParts={parts}
        returnUrl={returnUrl || undefined}
        onSubmit={handleSubmit}
      />
      <AutosaveStatusBadge status={autosave.status} savedAt={autosave.savedAt} />
    </div>
  );
}
