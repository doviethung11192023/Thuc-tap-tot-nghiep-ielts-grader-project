"use client";

import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useExamCountdown } from '@/hooks/useExamCountdown';
import { mockWritingExamDataset } from "@/data/fallback/writing-exam";
import { ExitConfirmModal } from '@/components/exam/shared/ExitConfirmModal';
import { WritingPromptColumn, type WritingTaskItem } from '@/components/exam/writing/WritingPromptColumn';
import { WritingIncompleteModal } from '@/components/exam/writing/WritingIncompleteModal';
import { WritingWorkspaceHeader } from '@/components/exam/writing/WritingWorkspaceHeader';

export interface WritingExamDataInput {
  test_id: string;
  title: string;
  task1: WritingTaskItem;
  task2: WritingTaskItem;
  sample_student_submission?: string;
}

interface WritingWorkspaceProps {
  testData?: WritingExamDataInput;
  mode?: 'exam' | 'practice';
  parts?: string;
  returnUrl?: string;
  onAbandon?: () => Promise<unknown> | void;
  deadlineMs?: number | null;
  onSubmit: (submissionText: string, task1Text?: string, task2Text?: string) => void;
  /** Bài đã lưu trên server khi làm tiếp (FR-11). */
  initialEssays?: { "1"?: string; "2"?: string };
  /** Báo mỗi lần bài viết đổi để trang cha tự lưu lên server. */
  onEssaysChange?: (essays: Record<1 | 2, string>) => void;
  /** Trạng thái tự lưu lên server; thay cho dòng "tự động lưu nháp" cũ. */
  saveStatusLabel?: string;
}

export function WritingWorkspace({
  testData,
  mode = 'practice',
  parts,
  returnUrl,
  onAbandon,
  deadlineMs,
  onSubmit,
  initialEssays,
  onEssaysChange,
  saveStatusLabel,
}: WritingWorkspaceProps) {
  const router = useRouter();
  const activeDataset = testData || mockWritingExamDataset;
  const availableTasks: (1 | 2)[] = parts === '1' ? [1] : parts === '2' ? [2] : [1, 2];
  const [activeTaskNum, setActiveTaskNum] = useState<1 | 2>(() => (parts === '2' ? 2 : 1));
  const [taskEssays, setTaskEssays] = useState<Record<1 | 2, string>>({ 1: '', 2: '' });
  const [isExitModalOpen, setIsExitModalOpen] = useState<boolean>(false);
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);

  // Khôi phục bài đã lưu trên server cho task còn trống (mở lại trên máy bất kỳ)
  // Mốc ban đầu là undefined: bài đã lưu có sẵn ngay lúc mở (Mock tải đề sau khi có attempt) cũng được khôi phục
  const [restoredFrom, setRestoredFrom] = useState<typeof initialEssays>(undefined);
  if (initialEssays !== restoredFrom) {
    setRestoredFrom(initialEssays);
    setTaskEssays(prev => ({ 1: prev[1] || initialEssays?.['1'] || '', 2: prev[2] || initialEssays?.['2'] || '' }));
  }
  useEffect(() => { onEssaysChange?.(taskEssays); }, [taskEssays, onEssaysChange]);

  const initialSeconds = mode === 'exam' ? (parts === '2' ? 2400 : parts === '1' ? 1200 : 3600) : 0;

  // Practice chọn 1 task: luôn đứng ở task đó
  useEffect(() => {
    if (parts === '1' && activeTaskNum !== 1) setActiveTaskNum(1);
    else if (parts === '2' && activeTaskNum !== 2) setActiveTaskNum(2);
  }, [parts, activeTaskNum]);

  const currentTask = activeTaskNum === 1 ? activeDataset.task1 : activeDataset.task2;
  const currentEssayText = taskEssays[activeTaskNum] || '';
  const wordCount = currentEssayText.trim() ? currentEssayText.trim().split(/\s+/).length : 0;

  // Hết giờ thi thử: nộp bài mới nhất (server chấm bản đã lưu nếu tới muộn, BR-21)
  const timerSeconds = useExamCountdown(mode, initialSeconds, deadlineMs,
    () => onSubmit(taskEssays[2] || taskEssays[1] || '', taskEssays[1], taskEssays[2]));

  const handleExitDiscard = async () => {
    setIsExitModalOpen(false);
    if (mode === 'exam') await onAbandon?.();
    router.push(returnUrl || '/test-practice');
  };

  // Bài đã tự lưu lên server (FR-11): thoát rồi quay lại vẫn làm tiếp được
  const handleSaveDraftAndExit = () => {
    setIsExitModalOpen(false);
    router.push(returnUrl || '/test-practice');
  };

  const doFinalSubmit = () => {
    setShowIncompleteWarning(false);
    onSubmit(taskEssays[2] || taskEssays[1] || '', taskEssays[1], taskEssays[2]);
  };

  const handleSubmitAll = () => {
    if (mode === 'exam' && (!parts || parts === '1,2')) {
      const hasTask1 = (taskEssays[1] || '').trim().length > 10;
      const hasTask2 = (taskEssays[2] || '').trim().length > 10;
      if (!hasTask1 || !hasTask2) {
        setShowIncompleteWarning(true);
        return;
      }
    }
    doFinalSubmit();
  };
  return (
    <div className="flex flex-col h-dvh w-full bg-zinc-50 overflow-hidden">
      <WritingWorkspaceHeader
        mode={mode}
        parts={parts}
        wordCount={wordCount}
        minWords={currentTask.min_words}
        timerSeconds={timerSeconds}
        onExitClick={() => setIsExitModalOpen(true)}
        onSubmitClick={handleSubmitAll}
      />

      <div className="flex-1 flex overflow-hidden">
        <WritingPromptColumn
          activeTaskNum={activeTaskNum}
          availableTasks={availableTasks}
          onSelectTask={setActiveTaskNum}
          currentTask={currentTask}
        />
        <div className="w-[62%] flex flex-col h-full bg-white">
          <div className="px-6 py-2.5 border-b border-zinc-200 bg-zinc-50/50 flex items-center justify-between shrink-0">
            <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#932120]" />
              Academic Essay Editor
            </span>
            <span className="text-xs text-zinc-500 font-medium">
              {saveStatusLabel ? <strong className="text-zinc-700">{saveStatusLabel}</strong> : <>Chưa lưu</>}
            </span>
          </div>
          <div className="flex-1 p-6 md:p-8 flex flex-col">
            <textarea
              value={currentEssayText}
              onChange={(e) => setTaskEssays((prev) => ({ ...prev, [activeTaskNum]: e.target.value }))}
              placeholder={`Nhập bài luận IELTS Writing Task ${activeTaskNum} của bạn tại đây...`}
              className="w-full flex-1 resize-none outline-none text-zinc-800 leading-relaxed font-serif text-lg custom-scrollbar bg-transparent placeholder:text-zinc-400"
              spellCheck={false}
            />
          </div>
        </div>
      </div>

      <ExitConfirmModal
        isOpen={isExitModalOpen}
        mode={mode}
        onContinue={() => setIsExitModalOpen(false)}
        onExitDiscard={handleExitDiscard}
        onSaveDraftAndExit={handleSaveDraftAndExit}
      />
      <WritingIncompleteModal
        isOpen={showIncompleteWarning}
        task1HasContent={(taskEssays[1] || '').trim().length > 10}
        task2HasContent={(taskEssays[2] || '').trim().length > 10}
        onCancel={() => setShowIncompleteWarning(false)}
        onConfirm={doFinalSubmit}
      />
    </div>
  );
}
