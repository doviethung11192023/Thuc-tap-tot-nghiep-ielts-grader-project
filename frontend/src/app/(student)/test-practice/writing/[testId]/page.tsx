"use client";

import React from 'react';
import { useSearchParams, useRouter, useParams } from 'next/navigation';
import { WritingWorkspace } from '@/components/exam/WritingWorkspace';
import { ExamWorkspaceSkeleton } from '@/components/exam/ExamWorkspaceSkeleton';
import { useExamWorkspaceContent } from '@/hooks/useExamWorkspaceContent';
import { discardAttempt, startTestAttempt, submitWritingAttempt } from '@/services/student-test-practice';
import { invalidatePracticeHistoryCache } from '@/services/practice-history-cache';
import { useNotificationStore } from '@/stores/notification-store';
import toast from 'react-hot-toast';

export default function WritingWorkspacePage() {
  const router = useRouter();
  const routeParams = useParams();
  const testId = routeParams?.testId as string;

  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') as 'exam' | 'practice') || 'exam';
  const returnUrl = searchParams.get('returnUrl') || '';
  const parts = searchParams.get('parts') || undefined;

  const { loading, attemptId, deadlineMs, writingData, attemptError } = useExamWorkspaceContent(testId, 'writing', mode);

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
        toast.error("Tài khoản Quản trị/Chuyên gia không thể nộp bài thi Học viên. Vui lòng đăng nhập tài khoản Học viên (test1@gmail.com)!");
      } else {
        toast.error(`Không thể nộp bài thi: ${detail || "Vui lòng thử lại"}`);
      }
    }
  };

  if (loading || !writingData) {
    return <ExamWorkspaceSkeleton skill="writing" />;
  }

  return (
    <div className="flex flex-col h-full w-full">
      {attemptError && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold">⚠️ Lưu ý phân quyền:</span>
            <span>{attemptError}. Hãy đăng nhập tài khoản Học viên (<strong>test1@gmail.com</strong> / <strong>Password123!</strong>) để nộp bài và nhận điểm AI.</span>
          </div>
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
