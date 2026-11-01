"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { QuestionTypeReportRow } from "@/types/learning-profile";

interface QuestionTypeReportTableProps {
  reportRows: QuestionTypeReportRow[];
}

export function QuestionTypeReportTable({ reportRows }: QuestionTypeReportTableProps) {
  const [selectedSkill, setSelectedSkill] = useState<string>("Reading");

  const filtered = reportRows.filter(
    (r) => r.skill.toLowerCase() === selectedSkill.toLowerCase()
  );

  return (
    <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-zinc-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-black text-zinc-900 text-sm tracking-tight">Báo cáo dạng bài toàn thời gian</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Phân tích chi tiết số câu đúng, sai và độ chính xác từng dạng bài</p>
        </div>

        {/* Skill filter pills */}
        <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-xl border border-zinc-200">
          {["Reading", "Listening", "Writing", "Speaking"].map((sk) => (
            <button
              key={sk}
              onClick={() => setSelectedSkill(sk)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedSkill === sk
                  ? "bg-white text-[#932120] shadow-2xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              {sk}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50 text-zinc-500 font-bold border-b border-zinc-200/80">
            <tr>
              <th className="py-3 px-5">Loại câu hỏi</th>
              <th className="py-3 px-4 text-center">Tổng số câu</th>
              <th className="py-3 px-4 text-center text-emerald-700">Câu đúng</th>
              <th className="py-3 px-4 text-center text-rose-700">Câu sai</th>
              <th className="py-3 px-5 text-center">Tỷ lệ chính xác</th>
              <th className="py-3 px-4 text-center">Luyện gần nhất</th>
              <th className="py-3 px-5 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 font-medium">
            {filtered.map((row) => (
              <tr key={row.type_name} className="hover:bg-zinc-50/60 transition-colors">
                <td className="py-3.5 px-5 font-bold text-zinc-900">{row.type_name}</td>
                <td className="py-3.5 px-4 text-center text-zinc-700">{row.total_questions}</td>
                <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">{row.correct}</td>
                <td className="py-3.5 px-4 text-center text-rose-600 font-bold">{row.incorrect}</td>
                <td className="py-3.5 px-5 text-center">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                      row.accuracy >= 60
                        ? "bg-emerald-100 text-emerald-800"
                        : row.accuracy >= 40
                        ? "bg-amber-100 text-amber-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {row.accuracy}%
                  </span>
                </td>
                <td className="py-3.5 px-4 text-center text-zinc-500">{row.last_practiced}</td>
                <td className="py-3.5 px-5 text-right">
                  <Link
                    href={`/test-practice?tab=by-type&skill=${row.skill.toLowerCase()}&type=${encodeURIComponent(row.type_name)}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                  >
                    <span>Luyện tập thêm</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
