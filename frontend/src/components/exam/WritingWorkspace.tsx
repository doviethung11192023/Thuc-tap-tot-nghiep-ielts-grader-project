"use client";

import React, { useState, useEffect, useRef } from 'react';
import { FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from "sonner";
import { mockWritingExamDataset } from '@/mocks/exam-writing';
import { useWritingDraftAutoSave } from '@/hooks/useWritingDraftAutoSave';
import { ExitConfirmModal } from './ExitConfirmModal';
import { WritingPromptColumn, type WritingTaskItem } from './writing/WritingPromptColumn';
import { WritingIncompleteModal } from './writing/WritingIncompleteModal';
import { WritingWorkspaceHeader } from './writing/WritingWorkspaceHeader';

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
}

export function WritingWorkspace({
  testData,
  mode = 'practice',
  parts,
  returnUrl,
  onAbandon,
  deadlineMs,
  onSubmit,
}: WritingWorkspaceProps) {
  const router = useRouter();
  const activeDataset = testData || mockWritingExamDataset;
  const availableTasks: (1 | 2)[] = parts === '1' ? [1] : parts === '2' ? [2] : [1, 2];
  const [activeTaskNum, setActiveTaskNum] = useState<1 | 2>(() => (parts === '2' ? 2 : 1));
  const [isExitModalOpen, setIsExitModalOpen] = useState<boolean>(false);
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);

  const initialSeconds = mode === 'exam' ? (parts === '2' ? 2400 : parts === '1' ? 1200 : 3600) : 0;
  const [timerSeconds, setTimerSeconds] = useState<number>(initialSeconds);

  const {
    taskEssays,
    setTaskEssays,
    taskEssaysRef,
    autoSaveTime,
    saveDraftNow,
    clearDraft,
  } = useWritingDraftAutoSave(activeDataset.test_id, mode);

  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  useEffect(() => {
    if (parts === '1' && activeTaskNum !== 1) setActiveTaskNum(1);
    else if (parts === '2' && activeTaskNum !== 2) setActiveTaskNum(2);
  }, [parts, activeTaskNum]);

  useEffect(() => {
    if (mode !== 'exam' || !deadlineMs) return;
    const remaining = Math.max(1, Math.floor((deadlineMs - Date.now()) / 1000));
    setTimerSeconds((prev) => Math.min(prev, remaining));
  }, [mode, deadlineMs]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (mode === 'exam') {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            const cur = taskEssaysRef.current;
            onSubmitRef.current(cur[2] || cur[1] || '', cur[1], cur[2]);
            return 0;
          }
          return prev - 1;
        });
      } else {
        setTimerSeconds((prev) => prev + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [mode, taskEssaysRef]);

  const currentTask = activeTaskNum === 1 ? activeDataset.task1 : activeDataset.task2;
  const currentEssayText = taskEssays[activeTaskNum] || '';
  const wordCount = currentEssayText.trim() ? currentEssayText.trim().split(/\s+/).length : 0;

  const handleExitDiscard = async () => {
    setIsExitModalOpen(false);
    clearDraft();
    if (mode === 'exam') await onAbandon?.();
    router.push(returnUrl || '/test-practice');
  };

  const handleSaveDraftAndExit = () => {
    if (saveDraftNow()) toast.success("Đã lưu nháp tiến độ bài làm Writing thành công!");
    else toast.error("Không thể lưu nháp trên trình duyệt.");
    setIsExitModalOpen(false);
    router.push(returnUrl || '/test-practice');
  };

  const doFinalSubmit = () => {
    clearDraft();
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
              {mode === 'exam' ? 'Tự động lưu nháp (FR-11): ' : 'Lưu nháp cục bộ: '}
              <strong className="text-zinc-700">{autoSaveTime}</strong>
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
