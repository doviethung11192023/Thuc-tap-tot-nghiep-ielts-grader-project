"use client";

import React, { useState } from "react";
import { Headphones, BookOpen, PenTool, Mic, Filter, Loader2 } from "lucide-react";
import { useSkillExercises } from "@/hooks/useSkillExercises";
import { SkillExerciseCard } from "./SkillExerciseCard";

const SKILLS = ["Reading", "Listening", "Writing", "Speaking"] as const;
type SkillName = (typeof SKILLS)[number];

export function StudentSkillExercisesSection() {
  const [selectedSkill, setSelectedSkill] = useState<SkillName>("Reading");
  const [selectedQuestionType, setSelectedQuestionType] = useState<string | null>(null);

  const { typesSummary, exercises, total, loading, loadingTypes } = useSkillExercises(
    selectedSkill,
    selectedQuestionType
  );

  const getSkillIcon = (skill: string) => {
    if (skill === "Listening") return <Headphones className="w-4 h-4" />;
    if (skill === "Reading") return <BookOpen className="w-4 h-4" />;
    if (skill === "Writing") return <PenTool className="w-4 h-4" />;
    return <Mic className="w-4 h-4" />;
  };

  const activeTypeName =
    typesSummary.find((t) => t.key === selectedQuestionType)?.name || selectedQuestionType;

  return (
    <div className="space-y-4">
      {/* 4 Skill Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-2 rounded-2xl border border-zinc-200 shadow-2xs">
        {SKILLS.map((skill) => {
          const isSelected = selectedSkill === skill;
          return (
            <button
              key={skill}
              onClick={() => {
                setSelectedSkill(skill);
                setSelectedQuestionType(null);
              }}
              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isSelected
                  ? "bg-[#932120] text-white shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
              }`}
            >
              {getSkillIcon(skill)}
              <span>{skill}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Left Column: Question Types Filter */}
        <div className="w-full lg:w-72 xl:w-80 bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden shrink-0">
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
              onClick={() => setSelectedQuestionType(null)}
              className={`w-full text-left p-3 rounded-xl transition-all border cursor-pointer ${
                selectedQuestionType === null
                  ? "bg-red-50/80 border-[#932120] text-[#932120] font-bold shadow-2xs"
                  : "border-transparent text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold">Tất cả dạng bài</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-bold">
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
                    onClick={() => setSelectedQuestionType(type.key)}
                    className={`w-full text-left p-3 rounded-xl transition-all border cursor-pointer ${
                      isActive
                        ? "bg-red-50/80 border-[#932120] text-[#932120] font-bold shadow-2xs"
                        : "border-transparent text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold leading-tight">{type.name}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold shrink-0 ${
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

        {/* Right Column: Exercises Grid */}
        <div className="flex-1 w-full min-w-0 space-y-3.5">
          <div className="flex justify-between items-center bg-white p-3.5 rounded-2xl border border-zinc-200 shadow-2xs">
            <div>
              <h3 className="font-bold text-zinc-900 text-sm sm:text-base">
                Danh sách bài tập • {selectedSkill}
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                {selectedQuestionType ? (
                  <>
                    Đang lọc: <strong className="text-[#932120]">{activeTypeName}</strong> (
                    {exercises.length} bài)
                  </>
                ) : (
                  <>Hiển thị {exercises.length} bài tập chuyên biệt</>
                )}
              </p>
            </div>
            {selectedQuestionType && (
              <button
                onClick={() => setSelectedQuestionType(null)}
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
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
              {exercises.map((exercise) => (
                <SkillExerciseCard key={exercise.id} exercise={exercise} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
