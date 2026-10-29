"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, RotateCcw, MoreVertical } from 'lucide-react';

interface CleanListeningDetailHeaderProps {
  testId: string;
  onRetake: () => void;
  onBack?: () => void;
}

export function CleanListeningDetailHeader({
  testId,
  onRetake,
  onBack
}: CleanListeningDetailHeaderProps) {
  return (
    <header className="bg-white border-b border-zinc-200 px-5 py-2.5 h-14 flex items-center justify-between shadow-2xs shrink-0 z-20">
      <div className="flex items-center gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 flex items-center justify-center hover:bg-zinc-100 rounded-xl transition-colors text-zinc-600 hover:text-zinc-900 border border-zinc-200 cursor-pointer"
            title="Quay lại màn hình tóm tắt"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        ) : (
          <Link
            href={`/test-practice/listening/${testId}/summary`}
            className="w-9 h-9 flex items-center justify-center hover:bg-zinc-100 rounded-xl transition-colors text-zinc-600 hover:text-zinc-900 border border-zinc-200"
            title="Quay lại màn hình tóm tắt"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
        )}

        {/* Logo MoonLab */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-base shadow-xs">
            M
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-base tracking-tight text-zinc-900 leading-none">
              MoonLab
            </span>
            <span className="text-[10px] text-zinc-400 font-medium tracking-wider">
              IELTS LISTENING
            </span>
          </div>
        </div>
      </div>

      {/* Nút hành động */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onRetake}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-blue-200 hover:border-blue-400 text-blue-700 bg-blue-50/50 hover:bg-blue-100/60 font-semibold text-xs md:text-sm transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Làm lại</span>
        </button>

        <Link
          href={`/test-practice/listening/${testId}/summary`}
          className="px-5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs md:text-sm shadow-xs transition-colors"
        >
          Hoàn thành
        </Link>

        <button
          type="button"
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 transition-colors"
          title="Tùy chọn khác"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
