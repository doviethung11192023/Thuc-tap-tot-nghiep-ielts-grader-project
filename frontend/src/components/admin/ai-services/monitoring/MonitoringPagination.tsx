"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  unit?: string;
}

/** Thanh phân trang đơn giản cho các bảng giám sát. */
export function MonitoringPagination({ page, limit, total, onPageChange, unit = "dòng" }: Props) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return (
    <div className="px-4 sm:px-6 py-3 border-t border-zinc-200 bg-zinc-50/50 flex items-center justify-between gap-3 text-xs sm:text-sm text-zinc-600">
      <span className="font-medium">
        {from}–{to} / {total} {unit}
      </span>
      <div className="flex items-center gap-2">
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Trang trước"
          className="p-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-semibold">Trang {page}/{totalPages}</span>
        <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} aria-label="Trang sau"
          className="p-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
