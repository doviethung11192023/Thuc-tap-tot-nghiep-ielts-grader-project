"use client";

import React from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, History, RotateCcw } from 'lucide-react';

interface CleanDetailErrorStateProps {
  title?: string;
  message: string;
  onBack?: () => void;
  onRetry?: () => void;
}

export function CleanDetailErrorState({
  title = "Không thể tải dữ liệu bài làm",
  message,
  onBack,
  onRetry,
}: CleanDetailErrorStateProps) {
  return (
    <div className="min-h-[65vh] w-full flex items-center justify-center p-6 bg-zinc-50">
      <div className="max-w-md w-full bg-white border border-zinc-200 rounded-3xl p-8 text-center shadow-sm space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 text-[#932120] flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-extrabold text-zinc-900">{title}</h2>
          <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">{message}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-700 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại</span>
            </button>
          )}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-700 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Thử lại</span>
            </button>
          )}
          <Link
            href="/test-practice/history"
            className="px-5 py-2.5 rounded-xl bg-[#932120] hover:bg-[#7a1a19] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <History className="w-4 h-4" />
            <span>Về Lịch sử làm bài</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
