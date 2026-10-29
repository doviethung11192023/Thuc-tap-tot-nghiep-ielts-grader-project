"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Headphones, BookOpen, PenTool, Mic, Filter, Clock } from "lucide-react";
import { mockQuestionTypes, mockExercises } from "@/mocks/test-practice";

const SKILLS = ["Reading", "Listening", "Writing", "Speaking"] as const;
type SkillName = (typeof SKILLS)[number];

export function StudentSkillExercisesSection() {
  const [selectedSkill, setSelectedSkill] = useState<SkillName>("Reading");
  const [selectedQuestionType, setSelectedQuestionType] = useState<string | null>(null);

  const filteredExercises = mockExercises.filter((e) => {
    if (e.skill !== selectedSkill) return false;
    if (selectedQuestionType && selectedQuestionType !== "All") {
      return (
        e.type.toLowerCase().includes(selectedQuestionType.toLowerCase()) ||
        selectedQuestionType.toLowerCase().includes(e.type.toLowerCase())
      );
    }
    return true;
  });

  const getSkillIcon = (skill: string) => {
    if (skill === "Listening") return <Headphones className="w-4 h-4" />;
    if (skill === "Reading") return <BookOpen className="w-4 h-4" />;
    if (skill === "Writing") return <PenTool className="w-4 h-4" />;
    return <Mic className="w-4 h-4" />;
  };

  return (
    <div className="space-y-4">
      {/* 4 Skill Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-2 rounded-2xl border border-zinc-200 shadow-2xs">
        {SKILLS.map((skill) => {
          const isSelected = selectedSkill === skill;
          const count = mockExercises.filter((e) => e.skill === skill).length;
          return (
            <button
              key={skill}
              onClick={() => {
                setSelectedSkill(skill);
                setSelectedQuestionType(null);
              }}
              className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                isSelected ? "bg-[#932120] text-white shadow-xs" : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
              }`}
            >
              {getSkillIcon(skill)}
              <span>{skill}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? "bg-white/20 text-white" : "bg-zinc-200 text-zinc-600"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Left Column: Question Types */}
        <div className="w-full lg:w-72 xl:w-80 bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden shrink-0">
          <div className="p-3.5 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-zinc-900 text-sm">Dạng bài tiêu biểu</h3>
              <p className="text-[11px] text-zinc-500">{mockQuestionTypes[selectedSkill]?.length || 0} Dạng bài chuẩn {selectedSkill}</p>
            </div>
            <Filter className="w-4 h-4 text-zinc-400" />
          </div>

          <div className="p-2 space-y-1 max-h-[540px] overflow-y-auto custom-scrollbar">
            <button
              onClick={() => setSelectedQuestionType(null)}
              className={`w-full text-left p-3 rounded-xl transition-all border ${
                selectedQuestionType === null ? "bg-red-50/80 border-[#932120] text-[#932120] font-bold shadow-2xs" : "border-transparent text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold">Tất cả dạng bài</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-bold">
                  {mockExercises.filter((e) => e.skill === selectedSkill).length}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 mt-0.5 font-normal">Hiển thị toàn bộ bài tập luyện tập</p>
            </button>

            {mockQuestionTypes[selectedSkill]?.map((type) => {
              const isActive = selectedQuestionType === type.name;
              const countForType = mockExercises.filter(
                (e) => e.skill === selectedSkill && (e.type.toLowerCase().includes(type.name.toLowerCase()) || type.name.toLowerCase().includes(e.type.toLowerCase()))
              ).length;

              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedQuestionType(type.name)}
                  className={`w-full text-left p-3 rounded-xl transition-all border ${
                    isActive ? "bg-red-50/80 border-[#932120] text-[#932120] font-bold shadow-2xs" : "border-transparent text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold leading-tight">{type.name}</span>
                    {countForType > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold shrink-0 ${isActive ? "bg-[#932120] text-white" : "bg-zinc-100 text-zinc-600"}`}>
                        {countForType}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1 font-normal flex items-center justify-between">
                    <span>Độ chính xác:</span>
                    <strong className="text-emerald-700 font-bold">{type.accuracy > 0 ? `${type.accuracy}%` : "-.-"}</strong>
                  </p>
                </button>
              );
            })}
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
                  <>Đang lọc theo: <strong className="text-[#932120]">{selectedQuestionType}</strong> ({filteredExercises.length} bài)</>
                ) : (
                  <>Hiển thị {filteredExercises.length} bài tập chuyên biệt</>
                )}
              </p>
            </div>
            {selectedQuestionType && (
              <button onClick={() => setSelectedQuestionType(null)} className="text-xs font-bold text-zinc-500 hover:text-[#932120] underline transition-colors">
                Xóa lọc
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
            {filteredExercises.map((exercise) => {
              const practicePath = `/test-practice/${exercise.skill.toLowerCase()}/sample?mode=practice`;
              const diffColor = exercise.difficulty === "Dễ"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : exercise.difficulty === "Nâng cao"
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : "bg-amber-50 text-amber-700 border-amber-200";

              return (
                <div key={exercise.id} className="bg-white p-4.5 rounded-2xl border border-zinc-200 shadow-2xs hover:border-zinc-300 hover:shadow-xs transition-all flex flex-col justify-between gap-3.5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 bg-zinc-100 text-zinc-700 text-[11px] font-bold rounded-md uppercase tracking-wider truncate max-w-[200px]">
                        {exercise.type}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${diffColor}`}>
                        {exercise.difficulty || "Trung bình"}
                      </span>
                    </div>
                    <h4 className="font-bold text-zinc-900 text-sm leading-snug line-clamp-2">{exercise.title}</h4>
                  </div>
                  <div className="flex items-center justify-between pt-2.5 border-t border-zinc-100 text-xs">
                    <div className="flex items-center gap-2.5 text-zinc-500 font-medium">
                      <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5 text-zinc-400" />{exercise.questionCount} câu</span>
                      <span className="text-zinc-300">•</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-zinc-400" />{exercise.timeMinutes || 8} phút</span>
                    </div>
                    <Link href={practicePath} className="px-4 py-2 bg-zinc-900 hover:bg-[#932120] text-white text-xs font-bold rounded-xl transition-all whitespace-nowrap shadow-2xs">
                      Bắt đầu luyện
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
