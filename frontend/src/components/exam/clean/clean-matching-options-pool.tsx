"use client";

import React from 'react';

interface CleanMatchingOptionsPoolProps {
  optionsPool?: Array<{ key: string; text: string }> | null;
}

/**
 * Hiển thị bảng danh mục lựa chọn (A-F) cho câu hỏi dạng Matching (LS-04)
 */
export function CleanMatchingOptionsPool({ optionsPool }: CleanMatchingOptionsPoolProps) {
  if (!optionsPool || optionsPool.length === 0) return null;

  return (
    <div className="pl-10">
      <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2 text-xs text-zinc-700">
        <span className="font-bold text-zinc-900 uppercase text-[11px] tracking-wider block">
          Bảng danh mục lựa chọn (Options):
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {optionsPool.map((opt, oIdx) => (
            <div key={oIdx} className="flex items-start gap-2 bg-white p-1.5 rounded border border-zinc-200">
              <span className="font-bold font-mono text-zinc-900 bg-zinc-100 px-1.5 py-0.5 rounded text-[11px]">
                {opt.key}
              </span>
              <span className="text-zinc-700">{opt.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
