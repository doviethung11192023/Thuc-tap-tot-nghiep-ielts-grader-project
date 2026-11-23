"use client";

import React from "react";
import Link from "next/link";
import { Edit3, ExternalLink, Clock, BookOpen } from "lucide-react";
import type { PracticeExerciseItem } from "@/services/student-test-practice";

interface AdminExerciseTableRowProps {
  exercise: PracticeExerciseItem;
}

export function AdminExerciseTableRow({ exercise }: AdminExerciseTableRowProps) {
  const practiceUrl = `/test-practice/${exercise.skill.toLowerCase()}/${exercise.test_id}?parts=${exercise.part_number}&mode=practice`;
  const editUrl = `/admin/tests/${exercise.test_id}/edit`;

  const diffColor =
    exercise.difficulty === "Dễ"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : exercise.difficulty === "Nâng cao"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <tr className="hover:bg-zinc-50/80 transition-colors">
      <td className="py-3.5 px-4">
        <div className="font-bold text-zinc-900 text-sm leading-snug line-clamp-1">{exercise.title}</div>
        {exercise.instructions && (
          <div className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5 italic">{exercise.instructions}</div>
        )}
      </td>
      <td className="py-3.5 px-4 whitespace-nowrap">
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#932120]/10 text-[#932120] uppercase">
          {exercise.skill}
        </span>
      </td>
      <td className="py-3.5 px-4 whitespace-nowrap">
        <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-zinc-100 text-zinc-800">
          {exercise.type}
        </span>
      </td>
      <td className="py-3.5 px-4 whitespace-nowrap">
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${diffColor}`}>
          {exercise.difficulty || "Trung bình"}
        </span>
      </td>
      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 font-medium text-zinc-700">
            <BookOpen className="w-3.5 h-3.5 text-zinc-400" /> {exercise.question_count} câu
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-zinc-400" /> {exercise.estimated_minutes}p
          </span>
        </div>
      </td>
      <td className="py-3.5 px-6 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5">
          <Link
            href={practiceUrl}
            target="_blank"
            className="p-1.5 text-zinc-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
            title="Làm thử bài tập này"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
          <Link
            href={editUrl}
            className="p-1.5 text-zinc-500 hover:text-[#932120] hover:bg-red-50 rounded-lg transition-colors"
            title="Soạn thảo / Chỉnh sửa đề"
          >
            <Edit3 className="w-4 h-4" />
          </Link>
        </div>
      </td>
    </tr>
  );
}
