"use client";

import React from "react";
import type { ExamCollection } from "@/types/test-practice";

interface ExamCollectionHeaderProps {
  collection: ExamCollection;
}

export function ExamCollectionHeader({ collection }: ExamCollectionHeaderProps) {
  return (
    <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center gap-6">
      <div className="w-32 h-44 sm:w-36 sm:h-48 rounded-2xl overflow-hidden shrink-0 shadow-md border border-zinc-200 relative">
        <img
          src={collection.imageUrl}
          alt={collection.title}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex-1 space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-[#932120] text-xs font-bold border border-red-100">
          <span>Bộ đề thi IELTS Academic</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
          {collection.title}
        </h1>

        <div className="flex items-center gap-2 text-sm text-zinc-600 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Đã làm {collection.completedTestsCount}/{collection.testsCount} đề</span>
        </div>

        <p className="text-xs sm:text-sm text-zinc-500 max-w-2xl font-normal leading-relaxed">
          Hệ thống bài thi chuẩn hóa quốc tế với đầy đủ 4 kỹ năng Listening, Reading, Writing và Speaking. Hỗ trợ chấm điểm AI chuyên sâu theo 4 tiêu chí của Đại học Cambridge.
        </p>
      </div>
    </div>
  );
}
