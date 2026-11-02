"use client";

import React from 'react';
import { Check, X } from 'lucide-react';

interface OptionItem {
  key: string;
  text: string;
}

interface CleanMultipleChoiceOptionsListProps {
  options: OptionItem[];
  userAnsNorm: string;
  correctAnsNorm: string;
  isCorrect: boolean;
  normalize: (val: any) => string;
}

/**
 * Hiển thị danh sách các thẻ lựa chọn A, B, C, D kèm đánh dấu đáp án học viên và đáp án đúng
 */
export function CleanMultipleChoiceOptionsList({
  options,
  userAnsNorm,
  correctAnsNorm,
  isCorrect,
  normalize,
}: CleanMultipleChoiceOptionsListProps) {
  return (
    <div className="space-y-2 pl-10">
      {options.map((opt, optIdx) => {
        const optTextNorm = normalize(opt.text);
        const optKeyNorm = normalize(opt.key);

        const isCorrectOption =
          correctAnsNorm === optTextNorm ||
          correctAnsNorm === optKeyNorm ||
          correctAnsNorm.startsWith(optKeyNorm + '.') ||
          correctAnsNorm.startsWith(optTextNorm);

        const isUserSelected =
          userAnsNorm === optTextNorm ||
          userAnsNorm === optKeyNorm ||
          userAnsNorm.startsWith(optKeyNorm + '.') ||
          userAnsNorm.startsWith(optTextNorm);

        let cardStyle = "border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800";
        let radioStyle = "border-zinc-300 text-zinc-400";

        if (isCorrectOption) {
          cardStyle = "border-emerald-500 bg-emerald-50/40 text-emerald-950 font-semibold shadow-2xs";
          radioStyle = "border-emerald-500 bg-emerald-600 text-white";
        } else if (isUserSelected && !isCorrect) {
          cardStyle = "border-red-400 bg-red-50/40 text-red-950 font-medium";
          radioStyle = "border-red-500 bg-red-600 text-white";
        }

        return (
          <div
            key={optIdx}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-sm transition-all ${cardStyle}`}
          >
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${radioStyle}`}
            >
              {isCorrectOption ? (
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              ) : isUserSelected ? (
                <X className="w-3.5 h-3.5 stroke-[3]" />
              ) : (
                opt.key
              )}
            </div>

            <div className="flex-1">
              <span>{opt.text}</span>
              {isCorrectOption && (
                <span className="ml-2 text-xs text-emerald-700 font-bold">(Đáp án đúng)</span>
              )}
              {isUserSelected && !isCorrectOption && (
                <span className="ml-2 text-xs text-red-600 font-semibold">(Bạn đã chọn)</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
