"use client";

import React from 'react';
import { Lightbulb, RefreshCw } from 'lucide-react';

export interface WritingTaskItem {
  id: string;
  task_number: 1 | 2;
  topic: string;
  prompt: string;
  min_words: number;
  suggested_time: number;
  image_url?: string | null;
}

interface WritingPromptColumnProps {
  activeTaskNum: 1 | 2;
  onSelectTask: (num: 1 | 2) => void;
  currentTask: WritingTaskItem;
}

export function WritingPromptColumn({
  activeTaskNum,
  onSelectTask,
  currentTask,
}: WritingPromptColumnProps) {
  return (
    <div className="w-[38%] border-r border-zinc-200 bg-white flex flex-col h-full relative">
      {/* Task Switcher */}
      <div className="flex border-b border-zinc-200 bg-zinc-50/50 p-2 gap-2 shrink-0">
        {[1, 2].map((num) => (
          <button
            key={num}
            onClick={() => onSelectTask(num as 1 | 2)}
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
        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 shadow-xs space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-500 flex items-center justify-between">
            <span>ĐỀ BÀI:</span>
            <button
              type="button"
              className="text-[#932120] hover:underline flex items-center gap-1 font-semibold normal-case"
              onClick={() => onSelectTask(activeTaskNum === 1 ? 2 : 1)}
            >
              <RefreshCw className="w-3.5 h-3.5" /> Chuyển Task
            </button>
          </h3>
          <p className="text-zinc-900 leading-relaxed font-serif text-base md:text-lg font-medium whitespace-pre-line">
            {currentTask.prompt}
          </p>

          {currentTask.image_url && (
            <div className="mt-4 pt-4 border-t border-zinc-200">
              <img
                src={currentTask.image_url}
                alt={`Writing Task ${currentTask.task_number} visual chart`}
                className="w-full h-auto rounded-xl border border-zinc-200 bg-white p-2 object-contain max-h-[340px]"
              />
            </div>
          )}
        </div>

        {/* Guidelines Card */}
        <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-5 text-sm text-amber-950 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
            <span>HƯỚNG DẪN LÀM BÀI:</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-xs text-amber-900/90 leading-relaxed">
            <li>Viết tối thiểu <strong>{currentTask.min_words} từ</strong> cho Task {currentTask.task_number}.</li>
            <li>Thời gian khuyến nghị: <strong>{currentTask.suggested_time} phút</strong>.</li>
            <li>Phân chia bài thành 4 đến 5 đoạn văn rõ ràng: Mở bài, hai Thân bài, Kết luận.</li>
            <li>Đưa ra lập trường cá nhân xuyên suốt và củng cố bằng các dẫn chứng cụ thể.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
