"use client";

import React from "react";
import { CleanReadingQuestion } from "@/mocks/clean-dataset/reading-test-1-clean";
import { Check, FileText } from "lucide-react";

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

  const qMap = new Map<number, CleanReadingQuestion>();
  questions.forEach((q) => qMap.set(q.question_number, q));

  const renderTokenizedText = (text: string) => {
    const parts = text.split(/(\{\{\d+\}\})/g);

    return parts.map((part, idx) => {
      const match = part.match(/^\{\{(\d+)\}\}$/);
      if (!match) {
        const cleaned = part.replace(/[•\uFFFD]/g, "").replace(/\s{2,}/g, " ");
        return <span key={idx}>{cleaned}</span>;
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
      const userAns = Array.isArray(q.user_answer)
        ? q.user_answer.join(", ")
        : (q.user_answer || "Chưa điền");
      const correctAns = Array.isArray(q.correct_answer)
        ? q.correct_answer.join(", ")
        : (q.correct_answer || "");

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
    });
  };

  const isHtmlTable = /<table[\s\S]*?>/i.test(template);

  if (isHtmlTable) {
    const rowMatches = template.match(/<tr[\s\S]*?<\/tr>/gi) || [];
    const rows = rowMatches.map((rowHtml) => {
      const cellMatches = rowHtml.match(/<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi) || [];
      return cellMatches.map((cellHtml) => {
        const isHeader = /^<th/i.test(cellHtml);
        const inner = cellHtml
          .replace(/^<(th|td)[^>]*>/i, "")
          .replace(/<\/(th|td)>$/i, "")
          .trim();
        return { isHeader, inner };
      });
    });

    return (
      <div className="rounded-xl border border-blue-200 bg-white p-4 md:p-5 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-900 border-b border-blue-100 pb-2.5">
          <FileText className="w-4 h-4 text-blue-600" />
          <span>Bảng tóm tắt & Đối chiếu kết quả (Table Completion)</span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <table className="w-full border-collapse text-xs md:text-sm">
            <tbody>
              {rows.map((cells, rIdx) => (
                <tr key={rIdx} className="border-b border-zinc-200 last:border-b-0">
                  {cells.map((cell, cIdx) => {
                    const Tag = cell.isHeader ? "th" : "td";
                    return (
                      <Tag
                        key={cIdx}
                        className={`p-2.5 md:p-3 border-r border-zinc-200 last:border-r-0 align-top ${
                          cell.isHeader
                            ? "bg-zinc-100 font-bold text-zinc-900 text-left"
                            : "bg-white text-zinc-800"
                        }`}
                      >
                        {renderTokenizedText(cell.inner)}
                      </Tag>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50/20 p-4 md:p-5 shadow-2xs space-y-3">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-900 border-b border-blue-100 pb-2.5">
        <FileText className="w-4 h-4 text-blue-600" />
        <span>Đoạn văn tóm tắt & Đối chiếu kết quả điền từ</span>
      </div>

      <div className="text-sm md:text-base leading-loose text-zinc-800 font-serif">
        {renderTokenizedText(template)}
      </div>
    </div>
  );
}
