"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import type { IngestResponse } from "@/types/exam";

interface IngestResultCardProps {
  result: IngestResponse;
}

export function IngestResultCard({ result }: IngestResultCardProps) {
  return (
    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
      <div className="flex items-center gap-2.5 text-emerald-800 font-bold text-sm">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
        <span>Nạp Dữ Liệu Thành Công!</span>
      </div>
      <p className="text-[11px] text-emerald-700 leading-relaxed">
        Toàn bộ cấu trúc bài thi, phần thi, nhóm câu hỏi và đáp án chi tiết đã được đồng bộ vào Ngân hàng đề thi IELTS Grader.
      </p>

      <div className="grid grid-cols-2 gap-2.5 pt-2 text-xs">
        <div className="p-2.5 bg-white rounded-xl border border-emerald-100">
          <span className="text-zinc-500 block text-[11px]">Bài thi mới tạo:</span>
          <strong className="text-lg text-emerald-800 font-bold">+{result.tests_created}</strong>
          {(result.tests_skipped_existing ?? 0) > 0 && (
            <span className="text-[10px] text-zinc-500 block mt-0.5">
              (Bỏ qua {result.tests_skipped_existing} bài đã có)
            </span>
          )}
        </div>
        <div className="p-2.5 bg-white rounded-xl border border-emerald-100">
          <span className="text-zinc-500 block text-[11px]">Phần thi (Sections):</span>
          <strong className="text-lg text-zinc-900 font-bold">+{result.sections_created}</strong>
        </div>
        <div className="p-2.5 bg-white rounded-xl border border-emerald-100">
          <span className="text-zinc-500 block text-[11px]">Nhóm dạng bài:</span>
          <strong className="text-lg text-zinc-900 font-bold">+{result.question_groups_created}</strong>
        </div>
        <div className="p-2.5 bg-white rounded-xl border border-emerald-100">
          <span className="text-zinc-500 block text-[11px]">Câu hỏi & Đáp án:</span>
          <strong className="text-lg text-zinc-900 font-bold">+{result.questions_created}</strong>
        </div>
      </div>

      {result.errors && result.errors.length > 0 && (
        <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
          Có {result.errors.length} cảnh báo nhỏ trong quá trình xử lý.
        </div>
      )}
    </div>
  );
}
