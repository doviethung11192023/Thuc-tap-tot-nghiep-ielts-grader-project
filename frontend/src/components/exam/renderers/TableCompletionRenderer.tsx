"use client";

import React from 'react';
import { BaseRendererProps, ReviewEvidenceAccordion } from './shared';

interface TableCellItem {
  is_input?: boolean;
  value?: string;
  question_number?: number;
  question_id?: string | number;
}

interface TableCell {
  is_header?: boolean;
  data?: TableCellItem[];
}

export const TableCompletionRenderer: React.FC<BaseRendererProps> = ({
  group,
  mode,
  userAnswers,
  onAnswerChange,
  onSelectEvidence,
}) => {
  const isReview = mode === 'review';
  const tableData = group.table_data;

  // Case A: Structured table_data
  if (tableData && Array.isArray(tableData.cells)) {
    const numCols = Math.max(1, Number(tableData.number_of_column || 2));
    const cells: TableCell[] = tableData.cells;
    const rows: TableCell[][] = [];
    for (let i = 0; i < cells.length; i += numCols) {
      rows.push(cells.slice(i, i + numCols));
    }

    return (
      <div className="space-y-6">
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-2xs">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {rows.map((rowCells, rIdx) => (
                <tr key={rIdx} className="border-b border-zinc-200 last:border-b-0">
                  {rowCells.map((cell, cIdx) => {
                    const isHdr = cell.is_header || rIdx === 0;
                    const Tag = isHdr ? 'th' : 'td';
                    const cellBg = isHdr ? 'bg-zinc-100 font-bold text-zinc-900' : 'bg-white text-zinc-800';

                    return (
                      <Tag
                        key={cIdx}
                        className={`p-3 md:p-4 border-r border-zinc-200 last:border-r-0 align-top ${cellBg}`}
                      >
                        <div className="space-y-2">
                          {(cell.data || []).map((item, iIdx) => {
                            if (!item.is_input) {
                              return (
                                <span key={iIdx} className="mr-1.5 font-normal leading-relaxed">
                                  {item.value}
                                </span>
                              );
                            }

                            // Input slot
                            const qNum = item.question_number || (group.questions[iIdx]?.question_number) || (rIdx + 1);
                            const qData = group.questions.find((q) => q.question_number === qNum);
                            const answer = (userAnswers[qNum] as string) || '';
                            const isCorrect = qData?.correct_answers?.some(
                              (a) => a.toLowerCase().trim() === answer.toLowerCase().trim()
                            );

                            return (
                              <span key={iIdx} className="inline-flex items-center gap-1.5 my-1 mr-2 align-middle">
                                <span className="w-5 h-5 rounded-full bg-zinc-800 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {qNum}
                                </span>
                                <input
                                  type="text"
                                  disabled={isReview}
                                  value={answer}
                                  placeholder="Điền từ..."
                                  onChange={(e) => onAnswerChange?.(qNum, e.target.value)}
                                  className={`w-32 md:w-40 px-2.5 py-1 text-xs md:text-sm rounded-md border font-medium outline-none transition-all ${
                                    isReview
                                      ? isCorrect
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                                        : 'border-red-400 bg-red-50 text-red-800'
                                      : 'border-zinc-300 bg-zinc-50 focus:bg-white focus:border-[#932120] focus:ring-1 focus:ring-[#932120]'
                                  }`}
                                />
                                {isReview && !isCorrect && qData?.correct_answers?.[0] && (
                                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                    {qData.correct_answers[0]}
                                  </span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      </Tag>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Review Evidence Panel */}
        {isReview && (
          <div className="space-y-3 pt-4 border-t border-zinc-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600">Giải thích chi tiết các câu trong bảng:</h4>
            {group.questions.map((q) => (
              <div key={q.question_number} className="p-3 rounded-lg border border-zinc-200 bg-zinc-50/50">
                <span className="font-bold text-xs mr-2 text-zinc-700">Câu {q.question_number}:</span>
                <span className="text-xs text-emerald-700 font-semibold mr-3">
                  Đáp án: {q.correct_answers?.join(' / ')}
                </span>
                <ReviewEvidenceAccordion explanation={q.explanation} evidenceQuote={q.evidence_quote} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Case B: Fallback when template contains HTML table
  const templateStr = group.template || '';
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-zinc-200 p-4 bg-white shadow-2xs">
        <div
          className="prose prose-sm max-w-none [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-zinc-200 [&_th]:p-2.5 [&_th]:bg-zinc-100 [&_td]:border [&_td]:border-zinc-200 [&_td]:p-2.5"
          dangerouslySetInnerHTML={{ __html: templateStr.replace(/{{(\d+)}}/g, '[$1: __________]') }}
        />
      </div>

      {/* Inputs list directly beneath table */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        {group.questions.map((q) => {
          const answer = (userAnswers[q.question_number] as string) || '';
          const isCorrect = q.correct_answers?.some((a) => a.toLowerCase().trim() === answer.toLowerCase().trim());

          return (
            <div key={q.question_number} className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-200 bg-zinc-50">
              <span className="w-6 h-6 rounded-full bg-zinc-800 text-white text-xs font-bold flex items-center justify-center shrink-0">
                {q.question_number}
              </span>
              <input
                type="text"
                disabled={isReview}
                value={answer}
                placeholder={`Câu ${q.question_number}...`}
                onChange={(e) => onAnswerChange?.(q.question_number, e.target.value)}
                className={`flex-1 px-3 py-1.5 text-sm rounded-md border font-medium outline-none ${
                  isReview
                    ? isCorrect
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                      : 'border-red-400 bg-red-50 text-red-800'
                    : 'border-zinc-300 bg-white focus:border-[#932120]'
                }`}
              />
              {isReview && !isCorrect && q.correct_answers?.[0] && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                  {q.correct_answers[0]}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
