"use client";

import React from 'react';
import { BaseRendererProps, ReviewEvidenceAccordion } from './shared';
import { sanitizeHtml } from '@/lib/sanitize-html';

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
                              <span
                                key={iIdx}
                                id={`reading-question-${qNum}`}
                                className="inline-flex items-center gap-1.5 my-1 mr-2 align-middle"
                              >
                                <span className="w-5 h-5 rounded-full bg-zinc-800 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {qNum}
                                </span>
                                <input
                                  type="text"
                                  disabled={isReview}
                                  value={answer}
                                  aria-label={`Câu ${qNum}`}
                                  placeholder="Điền từ..."
                                  onChange={(e) => onAnswerChange?.(qNum, e.target.value)}
                                  className={`w-32 md:w-40 px-2.5 py-1 text-xs md:text-sm rounded-md border font-medium outline-none transition-all ${
                                    isReview
                                      ? isCorrect
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                                        : 'border-red-400 bg-red-50 text-red-800'
                                      : 'border-zinc-300 bg-zinc-50 focus:bg-white focus:border-[#932120] focus:ring-2 focus:ring-[#932120]/20'
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

  // Case B: Render HTML <table> template with inline inputs directly inside each <td> cell
  const templateStr = group.template || '';
  const rowMatches = templateStr.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  const parsedRows = rowMatches.map((rowHtml) => {
    const cellMatches = rowHtml.match(/<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi) || [];
    return cellMatches.map((cellHtml) => ({
      isHeader: /^<th/i.test(cellHtml),
      inner: cellHtml
        .replace(/^<(th|td)[^>]*>/i, '')
        .replace(/<\/(th|td)>$/i, '')
        .trim(),
    }));
  });

  const renderCellContent = (cellInner: string) => {
    const tokens = cellInner.split(/({{\d+}})/g);
    return tokens.map((part, idx) => {
      const m = part.match(/^{{(\d+)}}$/);
      if (!m) {
        return <span key={idx} dangerouslySetInnerHTML={{ __html: sanitizeHtml(part) }} />;
      }
      const qNum = Number(m[1]);
      const qData = group.questions.find((q) => q.question_number === qNum);
      const answer = String(userAnswers[qNum] ?? '');
      const hasAnswer = answer.trim().length > 0;
      const isCorrect = qData?.correct_answers?.some(
        (a) => a.toLowerCase().trim() === answer.toLowerCase().trim()
      );

      return (
        <span
          key={idx}
          id={`reading-question-${qNum}`}
          className={`inline-flex items-center align-middle mx-1 my-0.5 rounded-lg border shadow-2xs transition-all overflow-hidden ${
            isReview
              ? isCorrect
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-red-400 bg-red-50'
              : hasAnswer
                ? 'border-[#932120]/60 bg-white focus-within:border-[#932120] focus-within:ring-2 focus-within:ring-[#932120]/20'
                : 'border-zinc-300 bg-white hover:border-zinc-400 focus-within:border-[#932120] focus-within:ring-2 focus-within:ring-[#932120]/20'
          }`}
        >
          <span
            className={`px-2 py-1 text-[11px] font-bold select-none shrink-0 border-r ${
              isReview
                ? isCorrect
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-red-600 text-white border-red-500'
                : hasAnswer
                  ? 'bg-[#932120] text-white border-[#932120]'
                  : 'bg-zinc-100 text-zinc-700 border-zinc-200'
            }`}
          >
            {qNum}
          </span>
          <input
            type="text"
            disabled={isReview}
            value={answer}
            aria-label={`Câu ${qNum}`}
            placeholder="Điền từ..."
            onChange={(e) => onAnswerChange?.(qNum, e.target.value)}
            className={`w-28 sm:w-36 px-2.5 py-1 text-xs sm:text-sm font-semibold outline-none bg-transparent ${
              isReview
                ? isCorrect
                  ? 'text-emerald-900'
                  : 'text-red-900'
                : 'text-zinc-900 placeholder:text-zinc-400'
            }`}
          />
          {isReview && !isCorrect && qData?.correct_answers?.[0] && (
            <span className="px-2 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 border-l border-emerald-200">
              {qData.correct_answers[0]}
            </span>
          )}
        </span>
      );
    });
  };

  return (
    <div className="space-y-4">
      {parsedRows.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-2xs">
          <table className="w-full border-collapse text-xs sm:text-sm">
            <tbody>
              {parsedRows.map((cells, rIdx) => (
                <tr key={rIdx} className="border-b border-zinc-200 last:border-b-0 odd:bg-white even:bg-zinc-50/40">
                  {cells.map((cell, cIdx) => {
                    const Tag = cell.isHeader ? 'th' : 'td';
                    return (
                      <Tag
                        key={cIdx}
                        className={`p-3 md:p-3.5 border-r border-zinc-200 last:border-r-0 align-middle leading-relaxed ${
                          cell.isHeader
                            ? 'bg-zinc-100 font-bold text-zinc-900 text-left'
                            : 'text-zinc-800'
                        }`}
                      >
                        {renderCellContent(cell.inner)}
                      </Tag>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {group.questions.map((q) => {
            const answer = (userAnswers[q.question_number] as string) || '';
            const isCorrect = q.correct_answers?.some((a) => a.toLowerCase().trim() === answer.toLowerCase().trim());

            return (
              <div
                key={q.question_number}
                id={`reading-question-${q.question_number}`}
                className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-200 bg-zinc-50"
              >
                <span className="w-6 h-6 rounded-full bg-zinc-800 text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {q.question_number}
                </span>
                <input
                  type="text"
                  disabled={isReview}
                  value={answer}
                  aria-label={`Câu ${q.question_number}`}
                  placeholder={`Câu ${q.question_number}...`}
                  onChange={(e) => onAnswerChange?.(q.question_number, e.target.value)}
                  className={`flex-1 px-3 py-1.5 text-sm rounded-md border font-medium outline-none ${
                    isReview
                      ? isCorrect
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : 'border-red-400 bg-red-50 text-red-800'
                      : 'border-zinc-300 bg-white focus:border-[#932120] focus:ring-2 focus:ring-[#932120]/20'
                  }`}
                />
              </div>
            );
          })}
        </div>
      )}

      {isReview && (
        <div className="space-y-3 pt-3 border-t border-zinc-200">
          <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600">
            Giải thích chi tiết các câu trong bảng:
          </h4>
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
};
