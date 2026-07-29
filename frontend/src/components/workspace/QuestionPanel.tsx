"use client";

import React, { useState, useEffect } from 'react';
import { Lightbulb, Info, FileText, LayoutList, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getTopics } from '@/services/topics';
import type { Topic } from '@/types';

interface QuestionPanelProps {
  onTopicChange: (topicId: string | null) => void;
  onTaskTypeChange: (taskType: "task1" | "task2") => void;
}

export function QuestionPanel({ onTopicChange, onTaskTypeChange }: QuestionPanelProps) {
  const [activeTab, setActiveTab] = useState<'system' | 'custom'>('system');
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['topics'],
    queryFn: () => getTopics({ limit: 50, task_type: "task2" }),
  });

  const topics = data?.items || [];
  const currentTopic = topics[currentIndex];

  useEffect(() => {
    if (activeTab === 'system' && currentTopic) {
      onTopicChange(currentTopic.id);
      onTaskTypeChange(currentTopic.task_type);
    } else {
      onTopicChange(null);
      onTaskTypeChange("task2"); // Mặc định custom là task 2
    }
  }, [activeTab, currentTopic, onTopicChange, onTaskTypeChange]);

  const handleNextTopic = () => {
    if (topics.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % topics.length);
    }
  };

  return (
    <div className="w-[340px] flex-shrink-0 bg-zinc-50 border-r border-zinc-200 flex flex-col h-full overflow-y-auto">
      {/* Top Tabs */}
      <div className="flex border-b border-zinc-200">
        <button
          onClick={() => setActiveTab('system')}
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${
            activeTab === 'system'
              ? 'text-[#932120] border-b-2 border-[#932120] bg-white'
              : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
          }`}
        >
          <LayoutList className="w-4 h-4" />
          Đề ngẫu nhiên
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 ${
            activeTab === 'custom'
              ? 'text-[#932120] border-b-2 border-[#932120] bg-white'
              : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          Đề tự chọn
        </button>
      </div>

      {/* Main Content */}
      <div className="p-6 flex flex-col gap-6">
        {activeTab === 'system' && currentTopic ? (
          <>
            {/* Badges */}
            <div className="flex items-center gap-2">
              <span className="bg-[#932120]/10 text-[#932120] text-xs font-bold px-2 py-1 rounded-md uppercase">
                IELTS WRITING
              </span>
              <span className="bg-zinc-200 text-zinc-700 text-xs font-bold px-2 py-1 rounded-md uppercase">
                {currentTopic.task_type === 'task1' ? 'TASK 1' : 'TASK 2'}
              </span>
            </div>

            {/* Categories */}
            {currentTopic.category && (
              <div className="flex flex-wrap gap-2">
                <span className="text-xs font-medium bg-white border border-zinc-200 text-zinc-600 px-3 py-1 rounded-full shadow-sm">
                  {currentTopic.category.toUpperCase()}
                </span>
              </div>
            )}
          </>
        ) : activeTab === 'custom' ? (
          <>
            <div className="flex items-center gap-2">
              <span className="bg-[#932120]/10 text-[#932120] text-xs font-bold px-2 py-1 rounded-md uppercase">
                IELTS WRITING
              </span>
              <span className="bg-zinc-200 text-zinc-700 text-xs font-bold px-2 py-1 rounded-md uppercase">
                TỰ DO
              </span>
            </div>
          </>
        ) : null}

        {/* Prompt */}
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
            <Info className="w-4 h-4" />
            {activeTab === 'system' ? 'Đề bài (Prompt)' : 'Nhập đề bài của bạn'}
          </h2>
          
          {activeTab === 'system' ? (
            <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm text-zinc-800 text-sm leading-relaxed whitespace-pre-wrap">
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-[#932120]" />
                </div>
              ) : isError ? (
                <p className="text-red-500">Lỗi khi tải đề thi. Vui lòng thử lại sau.</p>
              ) : currentTopic ? (
                <>
                  <p className="font-bold mb-2">{currentTopic.title}</p>
                  <p>{currentTopic.prompt_content}</p>
                </>
              ) : (
                <p>Không có đề thi nào trong ngân hàng.</p>
              )}
            </div>
          ) : (
            <textarea
              className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm text-zinc-800 text-sm leading-relaxed w-full min-h-[160px] resize-none outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120] transition-all"
              placeholder="Dán nội dung đề bài IELTS Writing của bạn vào đây (tuỳ chọn)..."
            />
          )}
        </div>

        {/* Action Button */}
        {activeTab === 'system' && (
          <button 
            onClick={handleNextTopic}
            disabled={isLoading || topics.length <= 1}
            className="w-full py-2.5 rounded-lg border-2 border-[#932120] text-[#932120] font-semibold text-sm hover:bg-[#932120] hover:text-white disabled:opacity-50 transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <Lightbulb className="w-4 h-4" />
            Đổi đề bài khác
          </button>
        )}

        {/* Guidelines */}
        <div className="mt-4 flex flex-col gap-3">
          <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
            Hướng dẫn
          </h2>
          <ul className="text-sm text-zinc-600 list-disc list-inside space-y-2">
            <li>Viết ít nhất 250 từ cho Task 2 (150 từ cho Task 1).</li>
            <li>Dành khoảng 40 phút cho Task 2 (20 phút cho Task 1).</li>
            <li>Đưa ra lý do và dẫn chứng cụ thể cho luận điểm của bạn.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
