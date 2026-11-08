"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { ReadingWorkspace } from '@/components/exam/ReadingWorkspace';
import { ExamWorkspaceSkeleton } from '@/components/exam/ExamWorkspaceSkeleton';
import { ExamPageNotice, SubmitErrorBanner } from '@/components/exam/ExamPageNotice';
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

  const { loading, attemptId, attemptError, deadlineMs, readingData, savedWork, closedAttempt } =
    useExamWorkspaceContent(testId, 'reading', mode);
  // Tự lưu đáp án lên server (FR-11): mất mạng, đóng tab hay đổi máy vẫn làm tiếp được
  const [answers, setAnswers] = useState<Record<number, string | string[]> | null>(null);
  const autosavePayload = useMemo(() => (answers ? { answers } : null), [answers]);
  const autosave = useServerAutosave(attemptId, autosavePayload);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
      if (!currentAttemptId) throw new Error('no attempt');
      await submitReadingListeningAnswers(currentAttemptId, { answers, parts: parts.map(Number) });
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
    <>
    <ReadingWorkspace
      testData={readingData}
      initialAnswers={savedWork?.answers}
      onAnswersChange={setAnswers}
      mode={mode}
      onAbandon={mode === 'exam' ? () => discardAttempt(attemptId) : undefined}
      deadlineMs={mode === 'exam' ? deadlineMs : null}
      selectedParts={parts}
      returnUrl={returnUrl || undefined}
      onSubmit={handleSubmit}
    />
    <AutosaveStatusBadge status={autosave.status} savedAt={autosave.savedAt} />
    <SubmitErrorBanner message={submitError} onClose={() => setSubmitError(null)} />
    </>
  );
}
