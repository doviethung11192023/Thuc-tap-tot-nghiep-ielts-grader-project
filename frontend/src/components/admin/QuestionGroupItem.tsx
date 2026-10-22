"use client";

import React, { useState } from "react";
import { Plus, Trash2, Edit3, Image as ImageIcon, Volume2, ChevronDown, ChevronUp, Eye } from "lucide-react";
import { deleteQuestion, deleteQuestionGroup } from "@/services/admin-content";
import type { QuestionGroup, Question, SkillType } from "@/types/exam";

interface QuestionGroupItemProps {
  group: QuestionGroup;
  groupIndex: number;
  skill: SkillType;
  onRefresh: () => void;
  onEditQuestion: (q: Question, groupId: string, qType: string) => void;
  onAddQuestion: (groupId: string, qType: string, nextNumber: number) => void;
}

export function QuestionGroupItem({
  group,
  groupIndex,
  skill,
  onRefresh,
  onEditQuestion,
  onAddQuestion,
}: QuestionGroupItemProps) {
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});
  const [deleting, setDeleting] = useState(false);

  const toggleDetails = (qId: string) => {
    setExpandedDetails((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  const handleDeleteGroup = async () => {
    if (!confirm(`Xóa toàn bộ nhóm dạng bài "${group.question_type}" cùng các câu hỏi bên trong?`)) return;
    setDeleting(true);
    try {
      await deleteQuestionGroup(group.id);
      onRefresh();
    } catch (err) {
      alert("Lỗi khi xóa nhóm câu hỏi");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteQ = async (qId: string, qNum: number) => {
    if (!confirm(`Xóa câu hỏi #${qNum}?`)) return;
    try {
      await deleteQuestion(qId);
      onRefresh();
    } catch (err) {
      alert("Lỗi khi xóa câu hỏi");
    }
  };

  const nextQNumber = (group.questions?.length || 0) > 0
    ? Math.max(...group.questions!.map((q) => q.number)) + 1
    : 1;

  return (
    <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs space-y-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-200">
        <div className="flex items-center gap-2">
          <span className="font-bold text-zinc-900 text-sm">
            Nhóm {groupIndex + 1}: <span className="text-[#932120] uppercase">{group.question_type}</span>
          </span>
          <span className="px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-700 font-semibold text-[10px]">
            {group.questions?.length || 0} câu hỏi
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAddQuestion(group.id, group.question_type, nextQNumber)}
            className="px-2.5 py-1 bg-[#932120] text-white rounded-lg font-bold hover:bg-[#7a1a19] flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm Câu Hỏi
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={handleDeleteGroup}
            className="p-1 text-zinc-400 hover:text-red-600 rounded hover:bg-red-50"
            title="Xóa nhóm này"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {group.instructions && (
        <div className="text-[11px] text-zinc-600 bg-white p-2.5 rounded-xl border border-zinc-200 italic leading-relaxed">
          {group.instructions}
        </div>
      )}

      {group.image_key && (
        <div className="p-2.5 bg-white rounded-xl border border-zinc-200 flex items-center gap-3">
          <ImageIcon className="w-5 h-5 text-[#932120] flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-zinc-500 text-[11px] block">Hình ảnh đính kèm (R2 Key):</span>
            <span className="font-mono text-zinc-800 text-[11px] truncate block">{group.image_key}</span>
          </div>
          {group.image_key.startsWith("http") && (
            <a
              href={group.image_key}
              target="_blank"
              rel="noreferrer"
              className="text-[#932120] font-bold hover:underline flex items-center gap-1"
            >
              <Eye className="w-3.5 h-3.5" /> Xem
            </a>
          )}
        </div>
      )}

      {/* Questions list */}
      <div className="space-y-2 pt-1">
        {group.questions && group.questions.length > 0 ? (
          group.questions.map((q) => {
            const ak = Array.isArray(q.question_answer_keys)
              ? q.question_answer_keys[0]
              : (q.question_answer_keys as any);
            const isExpanded = expandedDetails[q.id];

            return (
              <div key={q.id} className="p-3 bg-white rounded-xl border border-zinc-200 shadow-xs space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1">
                    <span className="w-6 h-6 rounded-md bg-[#932120]/10 text-[#932120] font-bold text-xs flex items-center justify-center flex-shrink-0">
                      #{q.number}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-zinc-900 leading-snug">{q.prompt}</p>

                      {ak?.accepted_answers && ak.accepted_answers.length > 0 && (
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Đáp án: {ak.accepted_answers.join(" | ")}
                          </span>
                          {q.max_words && (
                            <span className="text-[10px] text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
                              Tối thiểu: {q.max_words} từ
                            </span>
                          )}
                        </div>
                      )}

                      {skill === "speaking" && (
                        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-zinc-500">
                          {q.prep_time_sec !== undefined && <span>Chuẩn bị: <strong>{q.prep_time_sec}s</strong></span>}
                          {q.answer_time_sec !== undefined && <span>Nói: <strong>{q.answer_time_sec}s</strong></span>}
                          {q.prompt_audio_key && (
                            <span className="text-zinc-600 flex items-center gap-1">
                              <Volume2 className="w-3.5 h-3.5 text-[#932120]" /> Audio R2
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEditQuestion(q, group.id, group.question_type)}
                      className="p-1.5 text-zinc-500 hover:text-[#932120] hover:bg-zinc-100 rounded-lg"
                      title="Chỉnh sửa câu hỏi"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteQ(q.id, q.number)}
                      className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      title="Xóa câu hỏi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {(ak?.evidence || ak?.explanation) && (
                      <button
                        type="button"
                        onClick={() => toggleDetails(q.id)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-lg"
                        title="Xem lời giải & dẫn chứng"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="pt-2 border-t border-zinc-100 text-[11px] space-y-1.5 bg-zinc-50/50 p-2 rounded-lg">
                    {ak?.evidence && (
                      <p className="text-zinc-600">
                        <strong className="text-zinc-800">Dẫn chứng:</strong> {ak.evidence}
                      </p>
                    )}
                    {ak?.explanation && (
                      <p className="text-zinc-600 whitespace-pre-line font-mono text-[10px]">
                        <strong className="text-zinc-800 font-sans text-[11px]">Giải thích 4 bước:</strong>
                        <br />
                        {ak.explanation}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-3 text-center bg-white rounded-xl border border-dashed border-zinc-300 text-zinc-400 text-xs">
            Chưa có câu hỏi nào trong nhóm này. Bấm <strong>"+ Thêm Câu Hỏi"</strong> để soạn câu hỏi.
          </div>
        )}
      </div>
    </div>
  );
}
