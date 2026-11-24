"use client";

import React, { useEffect, useState } from "react";
import { Lightbulb, Maximize2, RefreshCw, X } from "lucide-react";
import { WritingOutlineHint } from './WritingOutlineHint';

export interface WritingTaskItem {
  id: string;
  task_number: 1 | 2;
  topic: string;
  prompt: string;
  min_words: number;
  suggested_time: number;
  image_url?: string | null;
  outline?: string | null;      // dàn ý đã duyệt, chỉ có ở Practice (spec 006)
}

interface WritingPromptColumnProps {
  activeTaskNum: 1 | 2;
  availableTasks?: (1 | 2)[];
  onSelectTask: (num: 1 | 2) => void;
  currentTask: WritingTaskItem;
}

export function WritingPromptColumn({
  activeTaskNum,
  availableTasks = [1, 2],
  onSelectTask,
  currentTask,
}: WritingPromptColumnProps) {
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  useEffect(() => {
    if (!isZoomOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsZoomOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isZoomOpen]);

  const canSwitch = availableTasks.length > 1;
  const isTask1 = currentTask.task_number === 1;

  return (
    <div className="w-[38%] border-r border-zinc-200 bg-white flex flex-col h-full relative">
      {/* Task Switcher */}
      <div className="flex border-b border-zinc-200 bg-zinc-50/50 p-2 gap-2 shrink-0">
        {availableTasks.map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onSelectTask(num)}
            className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-xl transition-all ${
              activeTaskNum === num
                ? "bg-[#932120] text-white shadow-xs"
                : "bg-white text-zinc-600 hover:bg-zinc-200 border border-zinc-200"
            }`}
          >
            Writing Task {num} • {num === 1 ? "150 từ" : "250 từ"}
          </button>
        ))}
      </div>

      <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-6">
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

        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-500 flex items-center justify-between">
            <span>ĐỀ BÀI:</span>
            {canSwitch && (
              <button
                type="button"
                className="text-[#932120] hover:underline flex items-center gap-1 font-semibold normal-case"
                onClick={() => onSelectTask(activeTaskNum === 1 ? 2 : 1)}
              >
                <RefreshCw className="w-3.5 h-3.5" /> Chuyển Task
              </button>
            )}
          </h3>
          <p className="text-zinc-900 leading-relaxed font-serif text-base md:text-lg font-medium whitespace-pre-line">
            {currentTask.prompt}
          </p>

          {currentTask.image_url && (
            <div className="mt-4 pt-4 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setIsZoomOpen(true)}
                aria-label="Phóng to biểu đồ Writing Task 1"
                className="group relative w-full rounded-xl border border-zinc-200 bg-white p-2 hover:border-[#932120]/50 transition-colors"
              >
                <img
                  src={currentTask.image_url}
                  alt={`Biểu đồ đề thi Writing Task ${currentTask.task_number}`}
                  className="w-full h-auto rounded-lg object-contain max-h-[320px]"
                />
                <span className="mt-2 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-600 group-hover:text-[#932120]">
                  <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                  Bấm để phóng to biểu đồ
                </span>
              </button>
            </div>
          )}
        </div>

        {currentTask.outline && <WritingOutlineHint outline={currentTask.outline} />}

        {/* Guidelines Card */}
        <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-5 text-sm text-amber-950 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
            <span>HƯỚNG DẪN LÀM BÀI TASK {currentTask.task_number}:</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-xs text-amber-900/90 leading-relaxed">
            <li>Viết tối thiểu <strong>{currentTask.min_words} từ</strong> cho Task {currentTask.task_number}.</li>
            <li>Thời gian khuyến nghị: <strong>{currentTask.suggested_time} phút</strong>.</li>
            {isTask1 ? (
              <>
                <li>Cấu trúc chuẩn Academic: Mở bài (paraphrase đề), Overview (nêu xu hướng/điểm nổi bật chung), và 2 đoạn Body mô tả số liệu hoặc quy trình chi tiết.</li>
                <li>Trình bày khách quan dựa trên dữ liệu biểu đồ, không đưa ý kiến cá nhân hay suy đoán ngoài hình.</li>
              </>
            ) : (
              <>
                <li>Phân chia bài thành 4 đến 5 đoạn văn rõ ràng: Mở bài, hai Thân bài, Kết luận.</li>
                <li>Đưa ra lập trường cá nhân xuyên suốt và củng cố bằng các luận điểm và dẫn chứng cụ thể.</li>
              </>
            )}
          </ul>
        </div>
      </div>

      {isZoomOpen && currentTask.image_url && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Biểu đồ Task 1 phóng to"
          onClick={() => setIsZoomOpen(false)}
          className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-xs flex items-center justify-center p-4 sm:p-8"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-5xl w-full bg-white rounded-2xl p-3 sm:p-4 shadow-2xl border border-zinc-200"
          >
            <button
              type="button"
              onClick={() => setIsZoomOpen(false)}
              aria-label="Đóng ảnh phóng to"
              className="absolute top-3 right-3 min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-full bg-zinc-900/85 text-white hover:bg-[#932120] transition-colors"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
            <img
              src={currentTask.image_url}
              alt={`Biểu đồ phóng to Writing Task ${currentTask.task_number}`}
              className="w-full max-h-[82vh] object-contain rounded-xl bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
}
