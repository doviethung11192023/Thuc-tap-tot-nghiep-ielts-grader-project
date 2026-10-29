"use client";

import React from "react";
import Link from "next/link";
import { Library, Flame, Bookmark, ChevronRight, Headphones, BookOpen, PenTool, Mic } from "lucide-react";
import type { ExamCollection } from "@/types/test-practice";

interface StudentCollectionsSectionProps {
  collections: ExamCollection[];
  loading?: boolean;
}

export function StudentCollectionsSection({ collections, loading = false }: StudentCollectionsSectionProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-zinc-900 tracking-tight flex items-center gap-2">
              <Library className="w-4 h-4 text-[#932120]" />
              <span>Bộ Đề Thi Tuyển Chọn</span>
            </h3>
            <p className="text-xs text-zinc-500 font-medium">
              Đang tải danh sách bộ đề thi từ hệ thống...
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden animate-pulse">
              <div className="h-40 bg-zinc-200/80" />
              <div className="p-3 space-y-2.5">
                <div className="h-3.5 bg-zinc-200 rounded w-1/2" />
                <div className="h-3 bg-zinc-100 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!collections || collections.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-black text-zinc-900 tracking-tight flex items-center gap-2">
            <Library className="w-4 h-4 text-[#932120]" />
            <span>Bộ Đề Thi Tuyển Chọn</span>
          </h3>
          <p className="text-xs text-zinc-500 font-medium">
            Chọn bộ đề để khám phá các đề thi và rẽ nhánh làm bài theo từng kỹ năng
          </p>
        </div>
        <span className="text-xs font-semibold text-zinc-500 hidden sm:inline-block">
          {collections.length} bộ đề hoàn chỉnh
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {collections.map((col) => (
          <Link
            key={col.id}
            href={`/test-practice/set/${col.id}`}
            className="bg-white rounded-2xl border border-zinc-200 shadow-2xs hover:shadow-md transition-all group overflow-hidden flex flex-col hover:border-[#932120]/40"
          >
            <div className="h-40 bg-zinc-100 relative overflow-hidden shrink-0">
              <img
                src={col.imageUrl}
                alt={col.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />

              {col.isHot && (
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 bg-red-600 text-white text-[10px] font-black rounded-lg shadow-xs uppercase tracking-wider">
                  <Flame className="w-3 h-3 fill-white" />
                  <span>HOT</span>
                </div>
              )}

              <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/80 backdrop-blur-xs flex items-center justify-center text-zinc-600 hover:text-[#932120]">
                <Bookmark className="w-3.5 h-3.5" />
              </div>

              <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
                <h4 className="font-bold text-xs sm:text-sm line-clamp-1 text-white group-hover:text-amber-200 transition-colors">
                  {col.title}
                </h4>
              </div>
            </div>

            <div className="p-3 flex-1 flex flex-col justify-between space-y-2.5">
              <div className="flex items-center justify-between text-xs text-zinc-600 font-medium">
                <span className="text-[11px] font-semibold text-zinc-500">
                  {col.completedTestsCount}/{col.testsCount} tests
                </span>

                <div className="flex items-center gap-1.5 text-zinc-400">
                  {col.skillsIncluded.includes("Listening") && <span title="Listening"><Headphones className="w-3.5 h-3.5" /></span>}
                  {col.skillsIncluded.includes("Reading") && <span title="Reading"><BookOpen className="w-3.5 h-3.5" /></span>}
                  {col.skillsIncluded.includes("Writing") && <span title="Writing"><PenTool className="w-3.5 h-3.5" /></span>}
                  {col.skillsIncluded.includes("Speaking") && <span title="Speaking"><Mic className="w-3.5 h-3.5" /></span>}
                </div>
              </div>

              <div className="pt-1 border-t border-zinc-100 flex items-center justify-between text-[11px] font-bold text-[#932120] group-hover:translate-x-0.5 transition-transform">
                <span>Chi tiết bộ đề</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
