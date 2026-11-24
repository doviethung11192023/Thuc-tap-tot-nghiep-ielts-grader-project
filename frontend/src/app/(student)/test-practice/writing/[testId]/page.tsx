"use client";

import React from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { WritingWorkspace } from '@/components/exam/WritingWorkspace';
import { ExamWorkspaceSkeleton } from '@/components/exam/ExamWorkspaceSkeleton';
import { useExamWorkspaceContent } from '@/hooks/useExamWorkspaceContent';
import { discardAttempt, startTestAttempt, submitWritingAttempt } from '@/services/student-test-practice';
import { invalidatePracticeHistoryCache } from '@/services/practice-history-cache';
import { useNotificationStore } from '@/stores/notification-store';
import { toast } from "sonner";

export default function WritingWorkspacePage() {
  const router = useRouter();
  const routeParams = useParams();
  const testId = routeParams?.testId as string;

  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') as 'exam' | 'practice') || 'practice';
  const returnUrl = searchParams.get('returnUrl') || '';
  const parts = searchParams.get('parts') || undefined;

  const { loading, attemptId, deadlineMs, writingData, attemptError, attemptErrorStatus } = useExamWorkspaceContent(testId, 'writing', mode);

  const handleSubmit = async (text: string, task1Text?: string, task2Text?: string) => {
    const returnQuery = returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : '';
    try {
      let currentAttemptId = attemptId;
      if (!currentAttemptId) {
        const attempt = await startTestAttempt(testId, mode === 'exam' ? 'mock' : 'practice', 'writing');
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
          message: "Bài thi đã được nộp và chuyển sang pipeline AI chấm điểm 4 tiêu chí.",
          type: "grading_complete",
          action_url: `/test-practice/writing/${testId}/summary?attemptId=${currentAttemptId}${returnQuery}`
        });
        toast.success("Nộp bài thi thành công! Hệ thống AI đang tiến hành chấm điểm.");
        invalidatePracticeHistoryCache();
        router.push(`/test-practice/writing/${testId}/summary?attemptId=${currentAttemptId}${returnQuery}`);
        return;
      }
      throw new Error("Không thể khởi tạo phiên làm bài");
    } catch (err: any) {
      console.warn("Submission error:", err);
      const detail = err.response?.data?.detail || err.message;
      if (err.response?.status === 403) {
        toast.error("Tài khoản Quản trị/Chuyên gia không thể nộp bài thi Học viên. Vui lòng đăng nhập bằng tài khoản Học viên.");
      } else {
        toast.error(`Không thể nộp bài thi: ${detail || "Vui lòng thử lại"}`);
      }
    }
  };

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
        onAbandon={mode === 'exam' ? () => discardAttempt(attemptId) : undefined}
        deadlineMs={mode === 'exam' ? deadlineMs : null}
        parts={parts}
        returnUrl={returnUrl || undefined}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
