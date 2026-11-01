"use client";

import React from "react";
import Link from "next/link";
import { BookOpen, Clock } from "lucide-react";
import { prefetchExamContent } from "@/services/exam-content-cache";
import type { PracticeExerciseItem } from "@/services/student-test-practice";

interface SkillExerciseCardProps {
  exercise: PracticeExerciseItem;
}

export function SkillExerciseCard({ exercise }: SkillExerciseCardProps) {
  const practicePath = `/test-practice/${exercise.skill.toLowerCase()}/${exercise.test_id}?parts=${exercise.part_number}&mode=practice`;

  const handlePrefetch = () => {
    if (exercise.test_id) {
      prefetchExamContent(exercise.test_id).catch(() => {});
    }
  };

  const diffColor =
    exercise.difficulty === "Dễ"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : exercise.difficulty === "Nâng cao"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <div
      onMouseEnter={handlePrefetch}
      onTouchStart={handlePrefetch}
      className="bg-white p-4.5 rounded-2xl border border-zinc-200 shadow-2xs hover:border-zinc-300 hover:shadow-xs transition-all flex flex-col justify-between gap-3.5"
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="px-2 py-0.5 bg-zinc-100 text-zinc-700 text-[11px] font-bold rounded-md uppercase tracking-wider truncate max-w-[200px]">
            {exercise.type}
          </span>
          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${diffColor}`}>
            {exercise.difficulty || "Trung bình"}
          </span>
        </div>
        <h4 className="font-bold text-zinc-900 text-sm leading-snug line-clamp-2">
          {exercise.title}
        </h4>
        {exercise.instructions && (
          <p className="text-[11px] text-zinc-500 line-clamp-1 italic">
            {exercise.instructions}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between pt-2.5 border-t border-zinc-100 text-xs">
        <div className="flex items-center gap-2.5 text-zinc-500 font-medium">
          <span className="flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
            {exercise.question_count} câu
          </span>
          <span className="text-zinc-300">•</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            {exercise.estimated_minutes} phút
          </span>
        </div>
        <Link
          href={practicePath}
          onMouseEnter={handlePrefetch}
          className="px-4 py-2 bg-zinc-900 hover:bg-[#932120] text-white text-xs font-bold rounded-xl transition-all whitespace-nowrap shadow-2xs cursor-pointer"
        >
          Bắt đầu luyện
        </Link>
      </div>
    </div>
  );
}
