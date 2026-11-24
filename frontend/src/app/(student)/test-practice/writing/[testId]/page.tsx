"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { WritingWorkspace } from '@/components/exam/WritingWorkspace';
import { ExamWorkspaceSkeleton } from '@/components/exam/ExamWorkspaceSkeleton';
import { ExamPageNotice, SubmitErrorBanner } from '@/components/exam/ExamPageNotice';
import { useExamWorkspaceContent } from '@/hooks/useExamWorkspaceContent';
import { autosaveLabel, useServerAutosave } from '@/hooks/useServerAutosave';
import { discardAttempt, startTestAttempt, submitWritingAttempt } from '@/services/student-test-practice';
import { notifyAttemptSubmitted } from '@/stores/notification-store';
import { closedAttemptMessage, isAlreadySubmitted, submitFailureMessage } from '@/utils/attempt-submission';
import { invalidatePracticeHistoryCache } from '@/services/practice-history-cache';
import { toast } from "sonner";

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

  const { loading, attemptId, attemptError, attemptErrorStatus, deadlineMs, writingData, savedWork, closedAttempt } =
    useExamWorkspaceContent(testId, 'writing', mode);
  // Tự lưu bài viết lên server (FR-11, NFR-03)
  const [essays, setEssays] = useState<Record<1 | 2, string> | null>(null);
  // parts: backend chỉ lưu task trong phạm vi; task trong phạm vi mà bỏ trống tính band 0 (BR-04)
  const autosavePayload = useMemo(() => (essays ? { task1_text: essays[1], task2_text: essays[2], parts } : null), [essays, parts]);
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
      if (!currentAttemptId) throw new Error("Không thể khởi tạo phiên làm bài");
      // parts: task Learner đã chọn; task trong phạm vi mà bỏ trống tính band 0 (BR-04)
      await submitWritingAttempt(currentAttemptId, { essay_text: text, task1_text: task1Text, task2_text: task2Text, parts });
      notifyAttemptSubmitted(currentAttemptId, writingData?.title || "IELTS Academic Writing Test",
        summaryPath(currentAttemptId));
      toast.success("Nộp bài thi thành công! Hệ thống AI đang tiến hành chấm điểm.");
      invalidatePracticeHistoryCache();
      router.push(summaryPath(currentAttemptId));
    } catch (err) {
      if (currentAttemptId && isAlreadySubmitted(err)) {     // nộp ở tab khác hoặc đã tự nộp: kết quả là bài đó
        router.push(summaryPath(currentAttemptId));
        return;
      }
      const msg = submitFailureMessage(err);
      setSubmitError(msg);
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        toast.error("Tài khoản Quản trị/Chuyên gia không thể nộp bài thi Học viên. Vui lòng đăng nhập bằng tài khoản Học viên.");
      } else {
        toast.error(`Không thể nộp bài thi: ${msg}`);
      }
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

  const switchMode = mode === 'exam' ? 'practice' : 'exam';
  const switchHref = `/test-practice/writing/${testId}?mode=${switchMode}${parts ? `&parts=${parts}` : ''}${returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : ''}`;

  return (
    <div className="flex flex-col h-full w-full">
      {attemptError && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold">
              {attemptErrorStatus === 403 ? '⚠️ Lưu ý phân quyền:' : '⚠️ Không thể khởi tạo phiên làm bài:'}
            </span>
            <span>
              {attemptErrorStatus === 403
                ? 'Tài khoản hiện tại không thuộc vai trò Học viên nên không thể nộp bài. Vui lòng đăng nhập tài khoản Học viên.'
                : attemptError}
            </span>
          </div>
          {attemptErrorStatus === 400 && (
            <button
              type="button"
              onClick={() => router.replace(switchHref)}
              className="px-3 py-1 rounded-lg bg-[#932120] hover:bg-[#7a1a19] text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Chuyển sang chế độ {switchMode === 'practice' ? 'Luyện tập' : 'Thi thử'}
            </button>
          )}
        </div>
      )}
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
    </div>
  );
}
