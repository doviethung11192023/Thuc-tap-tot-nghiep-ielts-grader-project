"use client";

import React, { useState } from "react";
import { Edit3, Trash2, ChevronDown, ChevronUp, Volume2 } from "lucide-react";
import type { Question, SkillType } from "@/types/exam";

interface QuestionItemCardProps {
  question: Question;
  skill: SkillType;
  groupId: string;
  questionType: string;
  onEdit: (q: Question, groupId: string, qType: string) => void;
  onDelete: (qId: string, qNum: number) => void;
}

export function QuestionItemCard({
  question,
  skill,
  groupId,
  questionType,
  onEdit,
  onDelete,
}: QuestionItemCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const akRaw = question.question_answer_keys;
  const ak = Array.isArray(akRaw) ? akRaw[0] : (akRaw as any);

  return (
    <div className="p-3 bg-white rounded-xl border border-zinc-200 shadow-2xs space-y-2 text-xs">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1">
          <span className="w-6 h-6 rounded-md bg-[#932120]/10 text-[#932120] font-bold text-xs flex items-center justify-center shrink-0">
            #{question.number}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-zinc-900 leading-snug">{question.prompt}</p>

            {ak?.accepted_answers && ak.accepted_answers.length > 0 && (
              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Đáp án chuẩn: {ak.accepted_answers.join(" | ")}
                </span>
                {question.max_words && (
                  <span className="text-[10px] text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
                    Tối đa: {question.max_words} từ
                  </span>
                )}
              </div>
            )}

            {skill === "speaking" && (
              <div className="mt-1.5 flex items-center gap-3 text-[11px] text-zinc-500">
                {question.prep_time_sec !== undefined && <span>Chuẩn bị: <strong>{question.prep_time_sec}s</strong></span>}
                {question.answer_time_sec !== undefined && <span>Nói: <strong>{question.answer_time_sec}s</strong></span>}
                {question.prompt_audio_key && (
                  <span className="text-zinc-600 flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5 text-[#932120]" /> Audio R2
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(question, groupId, questionType)}
            className="p-1.5 text-zinc-500 hover:text-[#932120] hover:bg-zinc-100 rounded-lg cursor-pointer"
            title="Chỉnh sửa câu hỏi & đáp án"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(question.id, question.number)}
            className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
            title="Xóa câu hỏi"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {(ak?.evidence || ak?.explanation) && (
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg cursor-pointer"
              title="Xem lời giải & dẫn chứng"
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="pt-2 border-t border-zinc-100 text-[11px] space-y-1.5 bg-zinc-50/70 p-2.5 rounded-lg">
          {ak?.evidence && (
            <p className="text-zinc-700">
              <strong className="text-zinc-900 font-bold">Dẫn chứng:</strong> {ak.evidence}
            </p>
          )}
          {ak?.explanation && (
            <p className="text-zinc-700 whitespace-pre-line font-mono text-[10px]">
              <strong className="text-zinc-900 font-sans text-[11px] font-bold">Giải thích 4 bước:</strong>
              <br />
              {ak.explanation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
