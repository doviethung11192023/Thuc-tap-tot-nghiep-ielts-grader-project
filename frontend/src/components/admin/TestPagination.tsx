"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TestPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (p: number) => void;
}

export function TestPagination({
  page,
  totalPages,
  total,
  onPageChange,
}: TestPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="p-4 sm:p-5 border-t border-zinc-200 bg-zinc-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-zinc-600 font-medium">
      <span>
        Hiển thị trang <strong className="text-zinc-900">{page}</strong> /{" "}
        <strong className="text-zinc-900">{totalPages}</strong> (Tổng cộng{" "}
        <strong className="text-zinc-900">{total}</strong> bài thi)
      </span>
      <div className="flex items-center gap-1.5">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="p-2 border border-zinc-200 rounded-lg bg-white hover:bg-zinc-100 disabled:opacity-40 disabled:pointer-events-none transition-colors shadow-2xs"
          title="Trang trước"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="px-3 py-1 bg-white border border-zinc-200 rounded-lg text-xs font-bold text-zinc-800 shadow-2xs">
          {page}
        </span>
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          className="p-2 border border-zinc-200 rounded-lg bg-white hover:bg-zinc-100 disabled:opacity-40 disabled:pointer-events-none transition-colors shadow-2xs"
          title="Trang kế tiếp"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
