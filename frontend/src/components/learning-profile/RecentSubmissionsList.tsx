"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import type { RecentSubmissionItem } from "@/types/learning-profile";

interface RecentSubmissionsListProps {
  submissions?: RecentSubmissionItem[];
}

export function RecentSubmissionsList({ submissions = [] }: RecentSubmissionsListProps) {
  return (
    <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-2xs overflow-hidden w-full">
      <div className="p-5 sm:p-6 border-b border-zinc-200/80 flex justify-between items-center">
        <div>
          <h3 className="font-black text-zinc-900 text-sm tracking-tight">Bài làm gần đây</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Lịch sử bài thi và bài viết tự do đã nộp</p>
        </div>
        <Link
          href="/history"
          className="text-xs font-bold text-[#932120] hover:text-[#7a1a19] flex items-center gap-1 transition-colors"
        >
          <span>Xem tất cả</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="divide-y divide-zinc-100">
        {submissions.length === 0 ? (
          <div className="py-12 px-6 text-center text-zinc-500">
            <FileText className="w-8 h-8 mx-auto text-zinc-300 mb-2" />
            <p className="text-xs font-semibold">Chưa có bài thi nào gần đây.</p>
            <Link href="/test-practice" className="text-xs text-[#932120] font-bold hover:underline mt-1 inline-block">
              Bắt đầu luyện tập ngay &rarr;
            </Link>
          </div>
        ) : (
          submissions.map((item) => (
            <div
              key={item.id}
              className="p-4 sm:px-6 hover:bg-zinc-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                  >
                    Test Practice
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-zinc-900 truncate" title={item.title}>
                    {item.title}
                  </h4>
                </div>
                <div className="mt-1 flex items-center gap-3 text-[11px] text-zinc-500">
                  <span>{item.date}</span>
                  <span
                    className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[10px] ${
                      item.status === "completed" || item.status === "scored"
                        ? "bg-emerald-100 text-emerald-800"
                        : item.status === "failed"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                <div className="text-right">
                  <div className="text-base sm:text-lg font-black text-[#932120]">
                    {item.band !== null ? item.band.toFixed(1) : "-"}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-zinc-400">Band</div>
                </div>
                <Link
                  href={item.link}
                  className="px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300 text-zinc-700 text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                >
                  <span>Chi tiết</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
