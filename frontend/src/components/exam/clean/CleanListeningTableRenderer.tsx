"use client";

import React from 'react';
import { CleanListeningQuestion } from '@/mocks/clean-dataset/listening-test-1-clean';

interface CleanListeningTableRendererProps {
  tableData: any;
  title: string;
  subtitle?: string;
  questions: CleanListeningQuestion[];
  activeQuestionNumber: number;
  onSelectQuestion: (questionNumber: number) => void;
}

export function CleanListeningTableRenderer({
  tableData,
  title,
  subtitle,
  questions,
  activeQuestionNumber,
  onSelectQuestion
}: CleanListeningTableRendererProps) {
  if (!tableData || !tableData.cells) {
    return null;
  }

  // Nhóm cells theo hàng (tableData.number_of_column = 2)
  const numCols = tableData.number_of_column || 2;
  const rows: any[][] = [];
  for (let i = 0; i < tableData.cells.length; i += numCols) {
    rows.push(tableData.cells.slice(i, i + numCols));
  }

  // Map câu hỏi theo id hoặc question_number
  const questionMap = new Map<number, CleanListeningQuestion>();
  questions.forEach(q => {
    questionMap.set(q.id, q);
    questionMap.set(q.question_number, q);
  });

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-2xs">
      {/* Table Header / Title */}
      <div className="bg-zinc-50 border-b border-zinc-200 px-5 py-3">
        <h4 className="font-bold text-sm md:text-base text-zinc-900 tracking-tight uppercase">
          {title}
        </h4>
        {subtitle && (
          <p className="text-xs text-zinc-500 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      {/* Table Content */}
      <div className="p-4 md:p-6 overflow-x-auto">
        <table className="w-full border-collapse text-xs md:text-sm">
          <tbody>
            {rows.map((rowCells, rIdx) => {
              const headerCell = rowCells[0];
              const valueCell = rowCells[1];

              const headerText = headerCell?.data?.[0]?.value || '';

              // Xử lý các items trong ô giá trị
              return (
                <tr 
                  key={rIdx} 
                  className="border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50/50 transition-colors"
                >
                  {/* Cột nhãn / Header */}
                  <td className="py-3 px-3 md:px-4 font-semibold text-zinc-700 w-1/3 align-middle bg-zinc-50/30">
                    {headerText}
                  </td>

                  {/* Cột giá trị / Inputs */}
                  <td className="py-3 px-3 md:px-4 text-zinc-900 align-middle">
                    <div className="flex items-center flex-wrap gap-2">
                      {valueCell?.data?.map((item: any, iIdx: number) => {
                        // Nếu là text tĩnh (tiền tệ hoặc giá trị mặc định như Herbert Hewitt)
                        if (!item.is_input && item.value) {
                          return (
                            <span key={iIdx} className="font-medium text-zinc-700">
                              {item.value}
                            </span>
                          );
                        }

                        // Nếu là ô nhập của câu hỏi
                        if (item.is_input) {
                          const q = (item.question_id ? questions.find(qu => qu.id === item.question_id) : null) ||
                                    questions.find(qu => qu.question_number === item.question_number) ||
                                    (typeof item.question_number === 'number' && item.question_number > 0 && item.question_number <= questions.length ? questions[item.question_number - 1] : undefined);

                          if (!q) {
                            return (
                              <span key={iIdx} className="text-zinc-400 italic">
                                ({item.question_number || '?'})
                              </span>
                            );
                          }

                          const isActive = activeQuestionNumber === q.question_number;
                          const isCorrect = q.is_correct;

                          return (
                            <div
                              key={iIdx}
                              onClick={() => onSelectQuestion(q.question_number)}
                              className={`inline-flex items-center gap-2 p-1.5 px-3 rounded-xl border cursor-pointer transition-all ${
                                isActive 
                                  ? 'ring-2 ring-blue-500 shadow-xs' 
                                  : 'hover:shadow-2xs'
                              } ${
                                isCorrect
                                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                                  : 'bg-red-50/70 border-red-300 text-red-950'
                              }`}
                              title={`Xem giải thích câu ${q.question_number}`}
                            >
                              {/* Badge số thứ tự câu hỏi */}
                              <span 
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                                  isCorrect 
                                    ? 'bg-emerald-600 text-white' 
                                    : 'bg-red-600 text-white'
                                }`}
                              >
                                {q.question_number}
                              </span>

                              {/* Hiển thị câu trả lời */}
                              {isCorrect ? (
                                <span className="font-bold text-emerald-800 text-sm">
                                  {q.user_answer}
                                </span>
                              ) : (
                                <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                                  {/* Đáp án sai gạch ngang màu đỏ */}
                                  <span className="line-through text-red-600 font-semibold bg-white/80 px-1.5 py-0.5 rounded border border-red-200">
                                    {q.user_answer}
                                  </span>
                                  {/* Đáp án đúng màu xanh lá */}
                                  <span className="text-emerald-700 font-bold bg-white/90 px-1.5 py-0.5 rounded border border-emerald-300">
                                    {q.correct_answer}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        }

                        return null;
                      })}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
