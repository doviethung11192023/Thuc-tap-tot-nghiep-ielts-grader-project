"use client";

import React from 'react';
import { ArrowLeft, Clock, Send, ZoomIn, ZoomOut } from 'lucide-react';

interface ReadingWorkspaceHeaderProps {
  title: string;
  mode: 'exam' | 'practice';
  fontSize: number;
  onFontSizeChange: (updater: (prev: number) => number) => void;
  timerSeconds: number;
  initialExamSeconds: number;
  onExitClick: () => void;
  onSubmit: () => void;
}

export function ReadingWorkspaceHeader({
  title,
  mode,
  fontSize,
  onFontSizeChange,
  timerSeconds,
  initialExamSeconds,
  onExitClick,
  onSubmit,
}: ReadingWorkspaceHeaderProps) {
  const formatDisplayTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white border-b border-zinc-200 px-5 py-2.5 h-14 flex items-center justify-between shadow-xs shrink-0 z-20">
      <div className="flex items-center gap-3">
        <button
          onClick={onExitClick}
          className="w-9 h-9 flex items-center justify-center hover:bg-zinc-100 rounded-xl transition-colors text-zinc-600 hover:text-zinc-900"
          title="Thoát phòng thi"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-bold text-zinc-900 text-sm md:text-base truncate max-w-[280px] sm:max-w-md">
            {title}
          </h1>
          <p className="text-[11px] text-zinc-500">
            Chế độ:{' '}
            <span className="font-semibold text-[#932120] uppercase">
              {mode === 'exam' ? 'Phòng thi giới hạn giờ' : 'Luyện tập tự do'}
            </span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Font Resizing Controls */}
        <div className="hidden sm:flex items-center gap-1 bg-zinc-100 p-1 rounded-xl text-zinc-700">
          <button
            onClick={() => onFontSizeChange(prev => Math.max(14, prev - 1))}
            className="p-1.5 hover:bg-white rounded-lg transition-colors text-xs font-bold"
            title="Giảm cỡ chữ"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold px-1 select-none">{fontSize}px</span>
          <button
            onClick={() => onFontSizeChange(prev => Math.min(22, prev + 1))}
            className="p-1.5 hover:bg-white rounded-lg transition-colors text-xs font-bold"
            title="Tăng cỡ chữ"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        {/* Active Timer Display */}
        <div className="flex items-center gap-2 bg-red-50 text-[#932120] border border-red-100 px-3.5 py-1.5 rounded-xl text-sm font-bold shadow-xs">
          <Clock className="w-4 h-4 text-[#932120]" />
          {mode === 'exam' ? (
            <span>{formatDisplayTime(timerSeconds)} / {formatDisplayTime(initialExamSeconds)}</span>
          ) : (
            <span>⏱️ {formatDisplayTime(timerSeconds)}</span>
          )}
        </div>

        {/* Submit Button */}
        <button
          onClick={onSubmit}
          className="flex items-center gap-2 bg-[#932120] text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-[#7a1a19] shadow-md transition-all active:scale-95"
        >
          <Send className="w-4 h-4" /> Nộp bài
        </button>
      </div>
    </div>
  );
}
