"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { WritingWorkspace } from '@/components/exam/WritingWorkspace';
import { ExamWorkspaceSkeleton } from '@/components/exam/ExamWorkspaceSkeleton';
import { ExamPageNotice, SubmitErrorBanner } from '@/components/exam/ExamPageNotice';
import { useExamWorkspaceContent } from '@/hooks/useExamWorkspaceContent';
import { autosaveLabel, useServerAutosave } from '@/hooks/useServerAutosave';
import { discardAttempt, startTestAttempt, submitWritingAttempt } from '@/services/student-test-practice';
import { useNotificationStore } from '@/stores/notification-store';
import { closedAttemptMessage, isAlreadySubmitted, submitFailureMessage } from '@/utils/attempt-submission';

export default function WritingWorkspacePage() {
  const router = useRouter();
  const routeParams = useParams();
  const testId = routeParams?.testId as string;

  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') as 'exam' | 'practice') || 'practice';
  const returnUrl = searchParams.get('returnUrl') || '';
  const parts = searchParams.get('parts') || undefined;
  const returnQuery = returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : '';
  const summaryPath = (id: string) => `/test-practice/writing/${testId}/summary?attemptId=${id}${returnQuery}`;

  const { loading, attemptId, attemptError, deadlineMs, writingData, savedWork, closedAttempt } =
    useExamWorkspaceContent(testId, 'writing', mode);
  // Tự lưu bài viết lên server (FR-11, NFR-03)
  const [essays, setEssays] = useState<Record<1 | 2, string> | null>(null);
  const autosavePayload = useMemo(() => (essays ? { task1_text: essays[1], task2_text: essays[2] } : null), [essays]);
  const autosave = useServerAutosave(attemptId, autosavePayload);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Bài Mock đã kết thúc (tự nộp khi hết giờ): tới thẳng kết quả (spec 004 US2)
  useEffect(() => {
    if (closedAttempt && closedAttempt.status !== 'abandoned') router.replace(summaryPath(closedAttempt.attempt_id));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closedAttempt]);

  // Nộp lỗi thì báo lỗi và ở lại phòng thi; không bao giờ chuyển sang trang kết quả không có bài thật
  const handleSubmit = async (text: string, task1Text?: string, task2Text?: string) => {
    setSubmitError(null);
    let currentAttemptId = attemptId;
    try {
      if (!currentAttemptId) {
        const attempt = await startTestAttempt(testId, mode === 'exam' ? 'mock' : 'practice', 'writing');
        currentAttemptId = attempt?.attempt_id || null;
      }
      if (!currentAttemptId) throw new Error('no attempt');
      await submitWritingAttempt(currentAttemptId, { essay_text: text, task1_text: task1Text, task2_text: task2Text });
      useNotificationStore.getState().addNotification({
        attempt_id: currentAttemptId,
        title: writingData?.title || "IELTS Academic Writing Test",
        message: "Bài thi đã được nộp và ghi nhận kết quả đánh giá 4 tiêu chí.",
        type: "grading_complete",
        action_url: summaryPath(currentAttemptId),
      });
      router.push(summaryPath(currentAttemptId));
    } catch (err) {
      if (currentAttemptId && isAlreadySubmitted(err)) {     // nộp ở tab khác hoặc đã tự nộp: kết quả là bài đó
        router.push(summaryPath(currentAttemptId));
        return;
      }
      setSubmitError(submitFailureMessage(err));
    }
  };

  if (closedAttempt) return <ExamPageNotice message={closedAttemptMessage(closedAttempt)} />;
  if (mode === 'exam' && attemptError) return <ExamPageNotice message={attemptError} />;
  if (!loading && !writingData) {
    return <ExamPageNotice message="Không tải được đề thi. Hãy kiểm tra kết nối rồi tải lại trang." />;
  }
  if (loading || !writingData) {
    return <ExamWorkspaceSkeleton skill="writing" />;
  }

  return (
    <>
    <WritingWorkspace
      testData={writingData}
      mode={mode}
      initialEssays={savedWork?.essays}
      onEssaysChange={setEssays}
      saveStatusLabel={attemptId ? autosaveLabel(autosave.status, autosave.savedAt) : undefined}
      onAbandon={mode === 'exam' ? () => discardAttempt(attemptId) : undefined}
      deadlineMs={mode === 'exam' ? deadlineMs : null}
      parts={parts}
      returnUrl={returnUrl || undefined}
      onSubmit={handleSubmit}
    />
    <SubmitErrorBanner message={submitError} onClose={() => setSubmitError(null)} />
    </>
  );
}
