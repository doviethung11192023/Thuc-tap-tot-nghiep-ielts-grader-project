"use client";

import React, { useState } from "react";
import { Plus, Trash2, Image as ImageIcon } from "lucide-react";
import { deleteQuestion, deleteQuestionGroup } from "@/services/admin-content";
import { QuestionItemCard } from "@/components/admin/QuestionItemCard";
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
  const [deleting, setDeleting] = useState(false);

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

  const nextQNumber =
    (group.questions?.length || 0) > 0
      ? Math.max(...group.questions!.map((q) => q.number)) + 1
      : 1;

  return (
    <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-xs space-y-3 shadow-2xs">
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
            className="px-2.5 py-1 bg-[#932120] text-white rounded-lg font-bold hover:bg-[#7a1a19] flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm Câu Hỏi & Đáp Án
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={handleDeleteGroup}
            className="p-1 text-zinc-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer"
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
          <ImageIcon className="w-5 h-5 text-[#932120] shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-zinc-500 text-[11px] block">Hình ảnh đính kèm (R2 Key):</span>
            <span className="font-mono text-[11px] text-zinc-800 truncate block">{group.image_key}</span>
          </div>
        </div>
      )}

      {/* Questions list */}
      <div className="space-y-2 pt-1">
        {group.questions && group.questions.length > 0 ? (
          group.questions.map((q) => (
            <QuestionItemCard
              key={q.id}
              question={q}
              skill={skill}
              groupId={group.id}
              questionType={group.question_type}
              onEdit={onEditQuestion}
              onDelete={handleDeleteQ}
            />
          ))
        ) : (
          <div className="p-4 text-center bg-white rounded-xl border border-dashed border-zinc-300 text-zinc-400 text-xs">
            Chưa có câu hỏi nào trong nhóm này. Bấm <strong>&quot;+ Thêm Câu Hỏi & Đáp Án&quot;</strong> để bắt đầu nhập.
          </div>
        )}
      </div>
    </div>
  );
}
