"use client";

import React from "react";
import { Search, BookOpen, Headphones, PenTool, Mic, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import type { PublishedTestItem } from "@/types/test-practice";
import { DirectTestCard } from "./DirectTestCard";

interface StudentDirectTestsSectionProps {
  skill: string;
  setSkill: (s: string) => void;
  difficulty: string;
  setDifficulty: (d: string) => void;
  search: string;
  setSearch: (s: string) => void;
  tests: PublishedTestItem[];
  total: number;
  page: number;
  setPage: (p: number) => void;
  limit: number;
  loading: boolean;
  onOpenTestPrep: (test: PublishedTestItem) => void;
}

const SKILL_OPTIONS = [
  { value: "All", label: "Tất cả" },
  { value: "Reading", label: "Reading" },
  { value: "Listening", label: "Listening" },
  { value: "Writing", label: "Writing" },
  { value: "Speaking", label: "Speaking" },
];

const DIFFICULTY_OPTIONS = [
  { value: "All", label: "Độ khó: Tất cả" },
  { value: "easy", label: "Dễ" },
  { value: "medium", label: "Vừa" },
  { value: "hard", label: "Khó" },
];

export function StudentDirectTestsSection({
  skill,
  setSkill,
  difficulty,
  setDifficulty,
  search,
  setSearch,
  tests,
  total,
  page,
  setPage,
  limit,
  loading,
  onOpenTestPrep,
}: StudentDirectTestsSectionProps) {
  const totalPages = Math.ceil(total / limit) || 1;

  const getSkillIcon = (s: string) => {
    switch (s?.toLowerCase()) {
      case "listening": return <Headphones className="w-3.5 h-3.5" />;
      case "writing": return <PenTool className="w-3.5 h-3.5" />;
      case "speaking": return <Mic className="w-3.5 h-3.5" />;
      default: return <BookOpen className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h3 className="text-base font-black text-zinc-900 tracking-tight flex items-center gap-2">
            <span>Danh Sách Đề Thi Luyện Tập Trực Tiếp</span>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-[#932120]" />}
          </h3>
          <p className="text-xs text-zinc-500 font-medium">
            Chọn đề thi thực tế đã xuất bản từ ngân hàng đề để bắt đầu làm bài ngay
          </p>
        </div>
        <div className="text-xs font-semibold text-zinc-500">
          Tổng cộng: <strong className="text-zinc-900">{total}</strong> bài thi
        </div>
      </div>

      {/* Filters Bar & Search */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 bg-white p-3 sm:p-3.5 rounded-2xl border border-zinc-200 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 custom-scrollbar">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider mr-1 shrink-0">Kỹ năng:</span>
          {SKILL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSkill(opt.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                skill.toLowerCase() === opt.value.toLowerCase()
                  ? "bg-[#932120] text-white shadow-xs"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
              }`}
            >
              {opt.value !== "All" && getSkillIcon(opt.value)}
              <span>{opt.label}</span>
            </button>
          ))}

          <span className="text-zinc-300 mx-1">|</span>
          {DIFFICULTY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDifficulty(opt.value)}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                difficulty.toLowerCase() === opt.value.toLowerCase()
                  ? "bg-zinc-800 text-white shadow-xs"
                  : "bg-zinc-50 text-zinc-600 border border-zinc-200 hover:bg-zinc-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-72 shrink-0">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên bài thi..."
            className="w-full pl-9 pr-4 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#932120]/30 font-medium transition-all"
          />
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Grid bài thi với Smart Prefetch */}
      {tests.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4.5">
          {tests.map((test) => (
            <DirectTestCard key={test.id} test={test} onOpenTestPrep={onOpenTestPrep} />
          ))}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-2xl border border-zinc-200 text-center space-y-2">
          <BookOpen className="w-10 h-10 text-zinc-300 mx-auto" />
          <h4 className="font-bold text-zinc-800 text-base">Không tìm thấy bài thi phù hợp</h4>
          <p className="text-xs text-zinc-500">Vui lòng thử tìm kiếm với từ khóa khác hoặc đổi bộ lọc kỹ năng / độ khó.</p>
        </div>
      )}

      {/* Phân trang */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-zinc-200">
          <span className="text-xs text-zinc-500">
            Trang {page} / {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-semibold hover:bg-zinc-50 disabled:opacity-40 transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Trang trước
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-semibold hover:bg-zinc-50 disabled:opacity-40 transition-colors flex items-center gap-1"
            >
              Trang sau <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
