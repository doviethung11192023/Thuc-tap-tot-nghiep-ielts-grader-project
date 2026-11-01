"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, RotateCcw } from 'lucide-react';

interface WritingResultsHeaderProps {
  onRetake: () => void;
  returnUrl?: string;
}

export function WritingResultsHeader({ onRetake, returnUrl }: WritingResultsHeaderProps) {
  const exitTarget = returnUrl || '/test-practice';

  return (
    <div className="bg-white border-b border-zinc-200 px-5 py-2.5 h-14 flex items-center justify-between shadow-xs shrink-0 z-20">
      <div className="flex items-center gap-3">
        <Link 
          href={exitTarget}
          className="w-9 h-9 flex items-center justify-center hover:bg-zinc-100 rounded-xl transition-colors text-zinc-600 hover:text-zinc-900"
          title="Quay lại"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
              Đã chấm xong
            </span>
            <h1 className="font-bold text-zinc-900 text-sm md:text-base">
              Kết Quả Đánh Giá Chi Tiết: IELTS Writing Task 2
            </h1>
          </div>
          <p className="text-[11px] text-zinc-500 hidden sm:block">
            Phân tích đa tác nhân AI Grader theo 4 tiêu chí chuẩn IELTS và bộ lọc sửa lỗi tương tác.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onRetake}
          className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 h-9 px-4 rounded-xl text-sm font-bold transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" /> Làm lại bài
        </button>
        <Link
          href={exitTarget}
          className="bg-[#932120] text-white h-9 px-5 rounded-xl text-sm font-bold hover:bg-[#7a1a19] shadow-xs transition-colors flex items-center justify-center cursor-pointer"
        >
          Hoàn tất
        </Link>
      </div>
    </div>
  );
}
