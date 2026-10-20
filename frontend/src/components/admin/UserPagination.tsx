import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface UserPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  loading: boolean;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newSize: number) => void;
}

export function UserPagination({
  page,
  pageSize,
  total,
  loading,
  onPageChange,
  onPageSizeChange,
}: UserPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const getPageNumbers = () => {
    const delta = 1;
    const range: (number | string)[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) range.push(i);
      return range;
    }

    const left = Math.max(2, page - delta);
    const right = Math.min(totalPages - 1, page + delta);

    range.push(1);
    if (left > 2) range.push("...");
    for (let i = left; i <= right; i++) range.push(i);
    if (right < totalPages - 1) range.push("...");
    range.push(totalPages);
    return range;
  };

  return (
    <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="text-xs sm:text-sm text-zinc-600 font-medium text-center md:text-left">
        {total === 0 ? (
          <span>Không có người dùng nào</span>
        ) : (
          <span>
            Đang xem <span className="font-bold text-zinc-900">{(page - 1) * pageSize + 1}</span> -{" "}
            <span className="font-bold text-zinc-900">{Math.min(page * pageSize, total)}</span> trên tổng số{" "}
            <span className="font-bold text-zinc-900">{total}</span> người dùng
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-600">
          <span className="font-medium whitespace-nowrap">Hiển thị:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            disabled={loading}
            className="px-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs sm:text-sm font-semibold text-zinc-800 focus:outline-none focus:border-[#932120] cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
          >
            <option value={10}>10 / trang</option>
            <option value={20}>20 / trang</option>
            <option value={50}>50 / trang</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 select-none">
          <button
            onClick={() => onPageChange(1)}
            disabled={page <= 1 || loading}
            title="Trang đầu"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-2xs"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1 || loading}
            title="Trang trước"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-2xs"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1">
            {getPageNumbers().map((p, idx) => {
              if (typeof p === "string") {
                return (
                  <span key={`ellipsis-${idx}`} className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-xs text-zinc-400 font-bold select-none">
                    ...
                  </span>
                );
              }
              const isCurrent = p === page;
              return (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  disabled={loading}
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg text-xs sm:text-sm font-bold transition-all shadow-2xs flex items-center justify-center ${
                    isCurrent
                      ? "bg-[#932120] text-white border border-[#932120] hover:bg-[#7a1a19]"
                      : "bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900"
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages || loading}
            title="Trang kế tiếp"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-2xs"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => onPageChange(totalPages)}
            disabled={page >= totalPages || loading}
            title="Trang cuối"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-2xs"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
