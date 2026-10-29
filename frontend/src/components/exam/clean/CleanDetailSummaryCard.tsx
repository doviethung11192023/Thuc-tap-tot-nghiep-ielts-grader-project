"use client";

import React from "react";
import { CleanReadingQuestion } from "@/mocks/clean-dataset/reading-test-1-clean";
import { Check, X, FileText } from "lucide-react";

interface CleanDetailSummaryCardProps {
  template: string;
  questions: CleanReadingQuestion[];
  onSelectQuestion?: (qNum: number) => void;
}

export function CleanDetailSummaryCard({
  template,
  questions,
  onSelectQuestion,
}: CleanDetailSummaryCardProps) {
  if (!template) return null;

  // Tách template theo các token {{qNum}}
  const parts = template.split(/(\{\{\d+\}\})/g);
  const qMap = new Map<number, CleanReadingQuestion>();
  questions.forEach((q) => qMap.set(q.question_number, q));

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/20 p-4 md:p-5 shadow-2xs space-y-3">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-900 border-b border-blue-100 pb-2.5">
        <FileText className="w-4 h-4 text-blue-600" />
        <span>Đoạn văn tóm tắt & Đối chiếu kết quả điền từ</span>
      </div>

      <div className="text-sm md:text-base leading-loose text-zinc-800 font-serif">
        {parts.map((part, idx) => {
          const match = part.match(/^\{\{(\d+)\}\}$/);
          if (!match) {
            if (part.includes('•') || part.includes('\uFFFD')) {
              const subParts = part.split(/([•\uFFFD])/g);
              return (
                <span key={idx}>
                  {subParts.map((sub, sIdx) => {
                    if (sub === '•' || sub === '\uFFFD') {
                      return (
                        <span key={sIdx} className="text-[#932120] font-bold mx-1.5 inline-block">
                          •
                        </span>
                      );
                    }
                    return <span key={sIdx}>{sub}</span>;
                  })}
                </span>
              );
            }
            return <span key={idx}>{part}</span>;
          }

          const qNum = Number(match[1]);
          const q = qMap.get(qNum);

          if (!q) {
            return (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-0.5 mx-1 rounded border border-zinc-300 bg-zinc-100 text-xs font-mono font-bold text-zinc-600"
              >
                [{qNum}]
              </span>
            );
          }

          const isCorrect = q.is_correct;
          const userAns = q.user_answer || "Chưa điền";
          const correctAns = q.correct_answer;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectQuestion?.(qNum)}
              title={`Bấm để xem chi tiết câu ${qNum}`}
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 mx-1 my-0.5 rounded-lg border text-xs sm:text-sm font-sans font-medium transition-all cursor-pointer shadow-2xs hover:scale-105 ${
                isCorrect
                  ? "border-emerald-400 bg-emerald-50 text-emerald-950"
                  : "border-red-300 bg-red-50 text-red-950"
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${
                  isCorrect ? "bg-emerald-600" : "bg-red-600"
                }`}
              >
                {qNum}
              </span>

              {isCorrect ? (
                <span className="flex items-center gap-1 font-semibold text-emerald-800">
                  <span>{userAns}</span>
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <span className="line-through text-red-700/80">{userAns}</span>
                  <span className="font-bold text-emerald-700 bg-emerald-100/90 px-1.5 py-0.2 rounded text-[11px] sm:text-xs">
                    {correctAns}
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
