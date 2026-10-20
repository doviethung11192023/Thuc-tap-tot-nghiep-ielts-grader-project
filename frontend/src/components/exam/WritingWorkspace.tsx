"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, Send, Lightbulb, RefreshCw, CheckCircle2, AlertCircle, FileText, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { mockWritingExamDataset } from '@/mocks/exam-writing';
import { ExitConfirmModal } from './ExitConfirmModal';

interface WritingWorkspaceProps {
  mode?: 'exam' | 'practice';
  onSubmit: (submissionText: string) => void;
}

export function WritingWorkspace({ mode = 'exam', onSubmit }: WritingWorkspaceProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'timed' | 'paste'>('timed');
  const [activeTaskNum, setActiveTaskNum] = useState<1 | 2>(2);
  const [essayText, setEssayText] = useState<string>(mockWritingExamDataset.sample_student_submission);
  const [autoSaveTime, setAutoSaveTime] = useState<string>('Vừa xong');
  const [isExitModalOpen, setIsExitModalOpen] = useState<boolean>(false);

  // Timer logic: Exam mode counts down from 3600s (60 mins), Practice mode counts up
  const initialSeconds = mode === 'exam' ? 3600 : 0;
  const [timerSeconds, setTimerSeconds] = useState<number>(initialSeconds);

  const currentTask = activeTaskNum === 1 ? mockWritingExamDataset.task1 : mockWritingExamDataset.task2;
  
  // Real-time word count calculation
  const wordCount = essayText.trim() ? essayText.trim().split(/\s+/).length : 0;
  const isWordCountMet = wordCount >= currentTask.min_words;

  // Restore draft in practice mode
  useEffect(() => {
    if (mode === 'practice') {
      try {
        const savedDraft = localStorage.getItem('ielts_writing_draft_mock');
        if (savedDraft) {
          setEssayText(savedDraft);
        }
      } catch (e) {
        console.error("Failed to load writing draft:", e);
      }
    }
  }, [mode]);

  // Active Timer Effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (mode === 'exam') {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            clearInterval(interval!);
            alert("⏱️ Hết giờ làm bài thi Writing! Hệ thống tự động thu bài và chuyển sang phần chấm điểm.");
            onSubmit(essayText);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [mode, onSubmit, essayText]);

  // Auto-save effect
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setAutoSaveTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const formatDisplayTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExitDiscard = () => {
    setIsExitModalOpen(false);
    router.push('/test-practice');
  };

  const handleSaveDraftAndExit = () => {
    try {
      localStorage.setItem('ielts_writing_draft_mock', essayText);
      alert("💾 Đã lưu nháp bài viết Writing thành công!");
    } catch (e) {
      console.error("Failed to save draft:", e);
    }
    setIsExitModalOpen(false);
    router.push('/test-practice');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4.25rem)] w-full bg-zinc-50 rounded-2xl overflow-hidden shadow-lg border border-zinc-200">
      {/* Top Header - Chuẩn h-14, không ngoặc đơn tùy tiện */}
      <div className="bg-white border-b border-zinc-200 px-5 py-2.5 h-14 flex items-center justify-between shadow-xs shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={() => setIsExitModalOpen(true)}
            className="w-9 h-9 flex items-center justify-center hover:bg-zinc-100 rounded-xl transition-colors text-zinc-600 hover:text-zinc-900"
            title="Thoát phòng thi"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          {/* Mode Switch Tabs */}
          <div className="flex bg-zinc-100 p-1 rounded-xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('timed')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeTab === 'timed' 
                  ? 'bg-white text-[#932120] shadow-xs' 
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Phòng thi giới hạn giờ
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className={`px-3 py-1 rounded-lg transition-all ${
                activeTab === 'paste' 
                  ? 'bg-white text-[#932120] shadow-xs' 
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Dán bài chấm ngay
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Real-time Word Counter */}
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

          {/* Dynamic Countdown Timer */}
          <div className="flex items-center gap-2 bg-red-50 text-[#932120] border border-red-100 h-9 px-3.5 rounded-xl text-sm font-bold shadow-xs">
            <Clock className="w-4 h-4 text-[#932120]" />
            <span>{formatDisplayTime(timerSeconds)}</span>
            {mode === 'exam' && <span className="text-xs text-red-400 font-normal">/ 60:00</span>}
          </div>

          {/* PTIT Red Submit Button */}
          <button 
            onClick={() => onSubmit(essayText)}
            className="flex items-center gap-2 bg-[#932120] text-white h-9 px-5 rounded-xl text-sm font-bold hover:bg-[#7a1a19] shadow-xs transition-all active:scale-95"
          >
            <Send className="w-4 h-4" /> Nộp bài
          </button>
        </div>
      </div>

      {/* Main Workspace (38% Prompt / 62% Editor) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column (38%): Prompt and Guidelines */}
        <div className="w-[38%] border-r border-zinc-200 bg-white flex flex-col h-full relative">
          {/* Task Switcher */}
          <div className="flex border-b border-zinc-200 bg-zinc-50/50 p-2 gap-2 shrink-0">
            {[1, 2].map((num) => (
              <button
                key={num}
                onClick={() => setActiveTaskNum(num as 1 | 2)}
                className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-xl transition-all ${
                  activeTaskNum === num
                    ? 'bg-[#932120] text-white shadow-xs'
                    : 'bg-white text-zinc-600 hover:bg-zinc-200 border border-zinc-200'
                }`}
              >
                Writing Task {num} • {num === 1 ? '150 từ' : '250 từ'}
              </button>
            ))}
          </div>

          <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-6">
            {/* Badges Header */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-red-100 text-[#932120]">
                IELTS Writing
              </span>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-zinc-100 text-zinc-800">
                Task {currentTask.task_number}
              </span>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200">
                {currentTask.topic}
              </span>
            </div>

            {/* Prompt Box */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 shadow-xs space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-500 flex items-center justify-between">
                <span>ĐỀ BÀI:</span>
                <button 
                  type="button" 
                  className="text-[#932120] hover:underline flex items-center gap-1 font-semibold normal-case"
                  onClick={() => alert("Đã nạp đề bài ngẫu nhiên từ dataset!")}
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Đổi đề khác
                </button>
              </h3>
              <p className="text-zinc-900 leading-relaxed font-serif text-lg font-medium">
                "{currentTask.prompt}"
              </p>
            </div>

            {/* Guidelines Card */}
            <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-5 text-sm text-amber-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
                <span>HƯỚNG DẪN LÀM BÀI:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-xs text-amber-900/90 leading-relaxed">
                <li>Viết tối thiểu <strong>{currentTask.min_words} từ</strong>, khuyên dùng khoảng 260 đến 290 từ cho Task 2.</li>
                <li>Thời gian khuyến nghị: <strong>{currentTask.suggested_time} phút</strong>.</li>
                <li>Phân chia bài thành 4 đến 5 đoạn văn rõ ràng: Mở bài, hai Thân bài, Kết luận.</li>
                <li>Đưa ra lập trường cá nhân xuyên suốt và củng cố bằng các ví dụ xác thực.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Column (62%): Academic Essay Editor */}
        <div className="w-[62%] flex flex-col h-full bg-white">
          <div className="px-6 py-2.5 border-b border-zinc-200 bg-zinc-50/50 flex items-center justify-between shrink-0">
            <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#932120]" />
              Academic Essay Editor
            </span>
            <span className="text-xs text-zinc-500 font-medium">
              Tự động lưu nháp: <strong className="text-zinc-700">{autoSaveTime}</strong>
            </span>
          </div>

          <div className="flex-1 p-6 md:p-8 flex flex-col">
            <textarea
              value={essayText}
              onChange={(e) => setEssayText(e.target.value)}
              placeholder="Nhập bài luận IELTS Writing của bạn tại đây..."
              className="w-full flex-1 resize-none outline-none text-zinc-800 leading-relaxed font-serif text-lg custom-scrollbar bg-transparent placeholder:text-zinc-400"
              spellCheck={false}
            />
          </div>
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      <ExitConfirmModal
        isOpen={isExitModalOpen}
        mode={mode}
        onContinue={() => setIsExitModalOpen(false)}
        onExitDiscard={handleExitDiscard}
        onSaveDraftAndExit={handleSaveDraftAndExit}
      />
    </div>
  );
}
