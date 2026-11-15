"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Clock, Send, CheckCircle2, AlertCircle, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { mockWritingExamDataset } from '@/mocks/exam-writing';
import { ExitConfirmModal } from './ExitConfirmModal';
import { WritingPromptColumn, type WritingTaskItem } from './writing/WritingPromptColumn';

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
  /** Thi thử (exam): gọi khi Learner thoát giữa chừng để backend ghi nhận abandoned. */
  onAbandon?: () => Promise<unknown> | void;
  /** Hạn nộp của thi thử theo đồng hồ client (ms); null nếu không có. */
  deadlineMs?: number | null;
  onSubmit: (submissionText: string, task1Text?: string, task2Text?: string) => void;
}

export function WritingWorkspace({ testData, mode = 'exam', parts, returnUrl, onAbandon, deadlineMs, onSubmit }: WritingWorkspaceProps) {
  const router = useRouter();
  const activeDataset = testData || mockWritingExamDataset;
  const draftKey = `ielts_writing_draft_${activeDataset.test_id || 'default'}`;

  const availableTasks: (1 | 2)[] = parts === '1' ? [1] : parts === '2' ? [2] : [1, 2];
  const [activeTaskNum, setActiveTaskNum] = useState<1 | 2>(() => (parts === '2' ? 2 : 1));
  const [taskEssays, setTaskEssays] = useState<Record<1 | 2, string>>({ 1: '', 2: '' });
  const [autoSaveTime, setAutoSaveTime] = useState<string>('Vừa xong');
  const [isExitModalOpen, setIsExitModalOpen] = useState<boolean>(false);
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);

  const initialSeconds = mode === 'exam' ? (parts === '2' ? 2400 : parts === '1' ? 1200 : 3600) : 0;
  const [timerSeconds, setTimerSeconds] = useState<number>(initialSeconds);

  const taskEssaysRef = useRef(taskEssays);
  taskEssaysRef.current = taskEssays;
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  useEffect(() => {
    if (parts === '1' && activeTaskNum !== 1) setActiveTaskNum(1);
    else if (parts === '2' && activeTaskNum !== 2) setActiveTaskNum(2);
  }, [parts, activeTaskNum]);

  useEffect(() => {
    if (mode !== 'exam' || !deadlineMs) return;
    const remaining = Math.max(1, Math.floor((deadlineMs - Date.now()) / 1000));
    setTimerSeconds(prev => Math.min(prev, remaining));
  }, [mode, deadlineMs]);

  const currentTask = activeTaskNum === 1 ? activeDataset.task1 : activeDataset.task2;
  const currentEssayText = taskEssays[activeTaskNum] || '';
  const wordCount = currentEssayText.trim() ? currentEssayText.trim().split(/\s+/).length : 0;
  const isWordCountMet = wordCount >= currentTask.min_words;

  useEffect(() => { try { localStorage.removeItem('ielts_writing_draft_mock'); } catch (_) {} }, []);

  useEffect(() => {
    if (mode !== 'practice') return;
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const p = JSON.parse(saved);
        setTaskEssays(typeof p === 'object' && p ? { 1: p[1] || '', 2: p[2] || '' } : { 1: '', 2: String(p) });
      }
    } catch {}
  }, [mode, draftKey]);

  // Lưu nháp thật vào localStorage khi người dùng ngừng gõ 1.5s ở chế độ luyện tập
  useEffect(() => {
    if (mode !== 'practice') return;
    if (!taskEssays[1]?.trim() && !taskEssays[2]?.trim()) return;
    const saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify(taskEssays));
        setAutoSaveTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } catch {}
    }, 1500);
    return () => clearTimeout(saveTimer);
  }, [mode, draftKey, taskEssays]);

  // Timer chính dùng refs để không reset interval mỗi lần gõ phím
  useEffect(() => {
    const interval = setInterval(() => {
      if (mode === 'exam') {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            const cur = taskEssaysRef.current;
            onSubmitRef.current(cur[2] || cur[1] || '', cur[1], cur[2]);
            return 0;
          }
          return prev - 1;
        });
      } else {
        setTimerSeconds(prev => prev + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'practice') return;
    const timer = setInterval(() => {
      try {
        const cur = taskEssaysRef.current;
        if (cur[1]?.trim() || cur[2]?.trim()) {
          localStorage.setItem(draftKey, JSON.stringify(cur));
          setAutoSaveTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
      } catch {}
    }, 15000);
    return () => clearInterval(timer);
  }, [mode, draftKey]);

  const formatDisplayTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const handleExitDiscard = async () => { setIsExitModalOpen(false); if (mode === 'exam') await onAbandon?.(); router.push(returnUrl || '/test-practice'); };
  const handleSaveDraftAndExit = () => {
    try {
      localStorage.setItem(draftKey, JSON.stringify(taskEssays));
      toast.success("Đã lưu nháp tiến độ bài làm Writing thành công!");
    } catch (e) {
      console.error(e);
      toast.error("Không thể lưu nháp trên trình duyệt.");
    }
    setIsExitModalOpen(false);
    router.push(returnUrl || '/test-practice');
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

  const doFinalSubmit = () => {
    try { localStorage.removeItem(draftKey); } catch (_) {}
    setShowIncompleteWarning(false);
    onSubmit(taskEssays[2] || taskEssays[1] || '', taskEssays[1], taskEssays[2]);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4.25rem)] w-full bg-zinc-50 rounded-2xl overflow-hidden shadow-lg border border-zinc-200">
      <div className="bg-white border-b border-zinc-200 px-5 py-2.5 h-14 flex items-center justify-between shadow-xs shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsExitModalOpen(true)}
            className="w-9 h-9 flex items-center justify-center hover:bg-zinc-100 rounded-xl transition-colors text-zinc-600 hover:text-zinc-900"
            title="Thoát phòng thi"
            aria-label="Thoát phòng thi"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 text-xs font-bold text-zinc-800 border border-zinc-200">
            <span className="w-2 h-2 rounded-full bg-[#932120]" aria-hidden="true" />
            <span>{mode === 'exam' ? 'Phòng thi giới hạn giờ' : 'Chế độ Luyện tập Writing'}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 h-9 px-3.5 rounded-xl text-xs sm:text-sm font-bold shadow-xs">
            <span className="text-zinc-500 uppercase text-[11px]">Độ dài:</span>
            <span className={isWordCountMet ? 'text-emerald-700' : 'text-amber-600'}>
              {wordCount} / {currentTask.min_words} từ
            </span>
            {isWordCountMet ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            )}
          </div>

          <div className="flex items-center gap-2 bg-red-50 text-[#932120] border border-red-100 h-9 px-3.5 rounded-xl text-sm font-bold shadow-xs">
            <Clock className="w-4 h-4 text-[#932120]" />
            <span>{formatDisplayTime(timerSeconds)}</span>
            {mode === 'exam' && <span className="text-xs text-red-400 font-normal">/ {parts === '2' ? '40:00' : parts === '1' ? '20:00' : '60:00'}</span>}
          </div>

          <button
            type="button"
            onClick={handleSubmitAll}
            className="flex items-center gap-2 bg-[#932120] text-white h-9 px-5 rounded-xl text-sm font-bold hover:bg-[#7a1a19] shadow-xs transition-all active:scale-95"
          >
            <Send className="w-4 h-4" /> Nộp bài
          </button>
        </div>
      </div>

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
              {mode === 'practice' ? (
                <>Lưu nháp cục bộ: <strong className="text-zinc-700">{autoSaveTime}</strong></>
              ) : (
                <>Chế độ thi thật (không lưu nháp)</>
              )}
            </span>
          </div>

          <div className="flex-1 p-6 md:p-8 flex flex-col">
            <textarea
              value={currentEssayText}
              onChange={(e) => setTaskEssays(prev => ({ ...prev, [activeTaskNum]: e.target.value }))}
              placeholder={`Nhập bài luận IELTS Writing Task ${activeTaskNum} của bạn tại đây...`}
              className="w-full flex-1 resize-none outline-none text-zinc-800 leading-relaxed font-serif text-lg custom-scrollbar bg-transparent placeholder:text-zinc-400"
              spellCheck={false}
            />
          </div>
        </div>
      </div>

      <ExitConfirmModal
        isOpen={isExitModalOpen} mode={mode} onContinue={() => setIsExitModalOpen(false)}
        onExitDiscard={handleExitDiscard} onSaveDraftAndExit={handleSaveDraftAndExit}
      />

      {showIncompleteWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-amber-700" />
              </div>
              <div>
                <h3 className="font-bold text-base text-zinc-900">Cảnh báo nộp thiếu Task</h3>
                <p className="text-xs text-zinc-500">Chế độ Phòng thi (Mock Test) chuẩn IELTS</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              Bạn đang nộp bài khi một trong hai Task (Task 1 hoặc Task 2) còn bỏ trống.
              Theo quy chuẩn Cambridge, phần bỏ trống sẽ nhận <strong>0 điểm</strong> và kéo tụt điểm Overall Writing theo công thức trọng số <strong>(Task 1 + 2 × Task 2) / 3</strong>.
            </p>

            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs space-y-1.5 font-medium">
              <div className="flex justify-between">
                <span>Task 1:</span>
                <span className={(taskEssays[1] || '').trim().length > 10 ? "text-emerald-700 font-bold" : "text-red-600 font-bold"}>
                  {(taskEssays[1] || '').trim().length > 10 ? "Đã viết" : "Bỏ trống (0đ)"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Task 2:</span>
                <span className={(taskEssays[2] || '').trim().length > 10 ? "text-emerald-700 font-bold" : "text-red-600 font-bold"}>
                  {(taskEssays[2] || '').trim().length > 10 ? "Đã viết" : "Bỏ trống (0đ)"}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowIncompleteWarning(false)} className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-xl">
                Quay lại viết tiếp
              </button>
              <button type="button" onClick={doFinalSubmit} className="px-4 py-2 bg-[#932120] hover:bg-[#7a1a19] text-white text-xs font-bold rounded-xl shadow-xs">
                Vẫn xác nhận nộp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
