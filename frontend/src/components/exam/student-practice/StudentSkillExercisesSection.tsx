"use client";

import React, { useState } from "react";
import { Headphones, BookOpen, PenTool, Mic, Filter, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { m } from "motion/react";
import { StaggerGrid } from "@/components/motion";
import { useSkillExercises } from "@/hooks/useSkillExercises";
import { SkillExerciseCard } from "./SkillExerciseCard";

const SKILLS = ["Reading", "Listening", "Writing", "Speaking"] as const;
type SkillName = (typeof SKILLS)[number];
const PAGE_LIMIT = 12;

export function StudentSkillExercisesSection() {
  const [selectedSkill, setSelectedSkill] = useState<SkillName>("Reading");
  const [selectedQuestionType, setSelectedQuestionType] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);

  const { typesSummary, exercises, total, loading, loadingTypes } = useSkillExercises(
    selectedSkill,
    selectedQuestionType,
    page,
    PAGE_LIMIT
  );

  const getSkillIcon = (skill: string) => {
    if (skill === "Listening") return <Headphones className="w-4 h-4" />;
    if (skill === "Reading") return <BookOpen className="w-4 h-4" />;
    if (skill === "Writing") return <PenTool className="w-4 h-4" />;
    return <Mic className="w-4 h-4" />;
  };

  const activeTypeObj = typesSummary.find((t) => t.key === selectedQuestionType);
  const activeTypeName = activeTypeObj?.name || selectedQuestionType;
  const filteredTotal = selectedQuestionType ? (activeTypeObj?.count ?? total) : total;
  const totalPages = Math.max(1, Math.ceil(filteredTotal / PAGE_LIMIT));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-2 rounded-2xl border border-zinc-200 shadow-2xs">
        {SKILLS.map((skill) => {
          const isSelected = selectedSkill === skill;
          return (
            <button
              key={skill}
              type="button"
              onClick={() => {
                setSelectedSkill(skill);
                setSelectedQuestionType(null);
                setPage(1);
              }}
              className={`relative py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                isSelected ? "text-white" : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
              }`}
            >
              {isSelected && (
                <m.span
                  layoutId="skill-exercises-tab-pill"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-xl bg-[#932120] shadow-xs"
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {getSkillIcon(skill)}
                <span>{skill}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start">
        <div className="w-full lg:w-64 xl:w-72 bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden shrink-0">
          <div className="p-3.5 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-zinc-900 text-sm">Dạng bài tiêu biểu</h3>
              <p className="text-[11px] text-zinc-500">
                {typesSummary.length} Dạng bài chuẩn {selectedSkill}
              </p>
            </div>
            <Filter className="w-4 h-4 text-zinc-400" />
          </div>

          <div className="p-2 space-y-1 max-h-[540px] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => { setSelectedQuestionType(null); setPage(1); }}
              className={`w-full text-left p-3 rounded-xl transition-all border cursor-pointer ${
                selectedQuestionType === null
                  ? "bg-red-50/80 border-[#932120] text-[#932120] font-bold shadow-2xs"
                  : "border-transparent text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-bold">Tất cả dạng bài</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-bold shrink-0">
                  {total}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5 font-normal">
                Toàn bộ bài tập thực tế từ các đề thi
              </p>
            </button>

            {loadingTypes ? (
              <div className="flex items-center justify-center py-8 text-zinc-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#932120]" />
                <span className="text-xs">Đang tải dạng bài...</span>
              </div>
            ) : (
              typesSummary.map((type) => {
                const isActive = selectedQuestionType === type.key;
                return (
                  <button
                    key={type.key}
                    onClick={() => { setSelectedQuestionType(type.key); setPage(1); }}
                    className={`w-full text-left p-3 rounded-xl transition-all border cursor-pointer ${
                      isActive
                        ? "bg-red-50/80 border-[#932120] text-[#932120] font-bold shadow-2xs"
                        : "border-transparent text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold leading-snug break-words">{type.name}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ${
                          isActive ? "bg-[#932120] text-white" : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {type.count} bài
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="flex-1 w-full min-w-0 space-y-3.5">
          <div className="flex justify-between items-center gap-2 flex-wrap bg-white p-3.5 rounded-2xl border border-zinc-200 shadow-2xs">
            <div>
              <h3 className="font-bold text-zinc-900 text-sm sm:text-base">
                Danh sách bài tập • {selectedSkill}
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                {selectedQuestionType ? (
                  <>
                    Đang lọc: <strong className="text-[#932120]">{activeTypeName}</strong> (Hiển thị {exercises.length} / {filteredTotal} bài)
                  </>
                ) : (
                  <>Hiển thị {exercises.length} / {total} bài tập chuyên biệt</>
                )}
              </p>
            </div>
            {selectedQuestionType && (
              <button
                onClick={() => { setSelectedQuestionType(null); setPage(1); }}
                className="text-xs font-bold text-zinc-500 hover:text-[#932120] underline transition-colors cursor-pointer"
              >
                Xóa lọc
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-zinc-200 gap-3 text-zinc-500">
              <Loader2 className="w-7 h-7 animate-spin text-[#932120]" />
              <p className="text-xs font-medium">Đang tải kho bài tập theo dạng...</p>
            </div>
          ) : exercises.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-zinc-200 text-zinc-500">
              <p className="text-sm font-bold">Chưa có bài tập cho dạng bài này</p>
              <p className="text-xs mt-1 text-zinc-400">
                Admin đang cập nhật thêm nội dung đề thi thực chiến.
              </p>
            </div>
          ) : (
            <>
              <StaggerGrid className="grid grid-cols-1 2xl:grid-cols-2 gap-3.5">
                {exercises.map((exercise, idx) => (
                  <SkillExerciseCard key={exercise.id} exercise={exercise} index={idx} />
                ))}
              </StaggerGrid>
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t border-zinc-200">
                  <span className="text-xs text-zinc-500">Trang {page} / {totalPages}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-xs font-semibold hover:bg-zinc-50 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" /> Trang trước
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="px-3 py-1.5 rounded-xl border border-zinc-200 bg-white text-xs font-semibold hover:bg-zinc-50 disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      Trang sau <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
