"use client";

import React, { useState } from "react";
import { Plus, Filter, Loader2, BookOpen, Layers } from "lucide-react";
import { useSkillExercises } from "@/hooks/useSkillExercises";
import { AdminExerciseTableRow } from "./AdminExerciseTableRow";
import type { SkillType } from "@/types/exam";

const SKILLS = ["Reading", "Listening", "Writing", "Speaking"] as const;
type SkillName = (typeof SKILLS)[number];

interface AdminExerciseTypeManagerProps {
  onOpenCreateExercise: (skill: SkillType, questionType?: string) => void;
}

export function AdminExerciseTypeManager({ onOpenCreateExercise }: AdminExerciseTypeManagerProps) {
  const [selectedSkill, setSelectedSkill] = useState<SkillName>("Reading");
  const [selectedQuestionType, setSelectedQuestionType] = useState<string | null>(null);

  const { typesSummary, exercises, total, loading, loadingTypes } = useSkillExercises(
    selectedSkill,
    selectedQuestionType
  );

  const activeTypeName =
    typesSummary.find((t) => t.key === selectedQuestionType)?.name || selectedQuestionType;

  return (
    <div className="space-y-5">
      {/* Skill Tabs & Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-zinc-200 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {SKILLS.map((s) => {
            const isSelected = selectedSkill === s;
            return (
              <button
                key={s}
                onClick={() => {
                  setSelectedSkill(s);
                  setSelectedQuestionType(null);
                }}
                className={`py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? "bg-[#932120] text-white shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onOpenCreateExercise(selectedSkill.toLowerCase() as SkillType, selectedQuestionType || undefined)}
          className="px-4 py-2 bg-[#932120] text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-[#7a1a19] transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Soạn Bài Tập {selectedSkill}
        </button>
      </div>

      {/* Question Type Filter Pills */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between text-xs text-zinc-500 font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-zinc-400" /> Phân Loại Dạng Bài ({selectedSkill})
          </span>
          {selectedQuestionType && (
            <button
              onClick={() => setSelectedQuestionType(null)}
              className="text-[#932120] hover:underline font-bold normal-case cursor-pointer"
            >
              Xóa lọc (Hiển thị tất cả {total} bài)
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => setSelectedQuestionType(null)}
            className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              selectedQuestionType === null
                ? "bg-red-50/80 border-[#932120] text-[#932120] shadow-2xs"
                : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            Tất cả dạng bài ({total})
          </button>

          {loadingTypes ? (
            <div className="flex items-center gap-1 text-xs text-zinc-400 py-1.5 px-3">
              <Loader2 className="w-3 h-3 animate-spin text-[#932120]" /> Đang nạp dạng bài...
            </div>
          ) : (
            typesSummary.map((t) => {
              const isActive = selectedQuestionType === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setSelectedQuestionType(t.key)}
                  className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? "bg-red-50/80 border-[#932120] text-[#932120] shadow-2xs"
                      : "border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  <span>{t.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? "bg-[#932120] text-white" : "bg-zinc-100 text-zinc-500"}`}>
                    {t.count}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Exercises Table */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#932120]" />
            <span className="font-bold text-zinc-900 text-sm">
              Danh Sách Bài Tập: {activeTypeName ? activeTypeName : `Tất cả bài tập ${selectedSkill}`}
            </span>
            <span className="text-xs text-zinc-500">({exercises.length} bài)</span>
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs sm:text-sm min-w-[760px]">
            <thead className="bg-zinc-50/50 text-zinc-500 font-bold border-b border-zinc-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Bài Tập / Nhóm Câu Hỏi</th>
                <th className="py-3 px-4">Kỹ Năng</th>
                <th className="py-3 px-4">Dạng Câu Hỏi</th>
                <th className="py-3 px-4">Độ Khó</th>
                <th className="py-3 px-4">Quy Mô</th>
                <th className="py-3 px-6 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-zinc-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#932120] mb-3" />
                    Đang nạp danh sách bài tập theo dạng...
                  </td>
                </tr>
              ) : exercises.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-zinc-500">
                    Chưa có bài tập nào cho dạng bài này. Nhấn <strong>&quot;Soạn Bài Tập&quot;</strong> để tạo mới.
                  </td>
                </tr>
              ) : (
                exercises.map((ex) => <AdminExerciseTableRow key={ex.id} exercise={ex} />)
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
