"use client";

import React from "react";
import Link from "next/link";
import { Edit3, Trash2, CheckCircle2, Archive } from "lucide-react";
import type { TestItem, ContentStatus } from "@/types/exam";

interface TestTableRowProps {
  test: TestItem;
  skillLabel: string;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  onStatusChange: (testId: string, newStatus: ContentStatus) => void;
  onDelete: (testId: string, title: string) => void;
}

export function TestTableRow({
  test: t,
  skillLabel,
  isSelected = false,
  onToggleSelect,
  onStatusChange,
  onDelete,
}: TestTableRowProps) {
  return (
    <tr className={`transition-colors ${isSelected ? "bg-red-50/40" : "hover:bg-zinc-50/80"}`}>
      <td className="py-4 pl-6 pr-2 w-10">
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(t.id)}
            className="w-4 h-4 rounded text-[#932120] focus:ring-[#932120] cursor-pointer"
          />
        )}
      </td>
      <td className="py-4 px-4 font-medium text-zinc-900">
        <div className="text-sm sm:text-base font-bold text-zinc-900 line-clamp-2">
          {t.title}
        </div>
        {t.test_sets && (
          <span className="text-xs text-zinc-500 font-medium">
            Bộ đề: {t.test_sets.name}
          </span>
        )}
      </td>
      <td className="py-4 px-4">
        <span className="px-2.5 py-1 rounded-md font-bold uppercase text-xs bg-red-50 text-[#932120] border border-red-200/70 inline-block">
          {skillLabel}
        </span>
      </td>
      <td className="py-4 px-4 capitalize text-xs sm:text-sm text-zinc-600 font-medium">
        {t.allowed_mode}
      </td>
      <td className="py-4 px-4 text-xs sm:text-sm text-zinc-700 font-semibold whitespace-nowrap">
        {t.duration_min ? `${t.duration_min} phút` : "--"}
      </td>
      <td className="py-4 px-4">
        {t.status === "published" ? (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 whitespace-nowrap">
            Đã xuất bản
          </span>
        ) : t.status === "archived" ? (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-200 text-zinc-700 whitespace-nowrap">
            Lưu trữ
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 whitespace-nowrap">
            Bản nháp
          </span>
        )}
      </td>
      <td className="py-4 px-6 text-right whitespace-nowrap">
        <div className="inline-flex items-center gap-1">
          <Link
            href={`/admin/tests/${t.id}/edit`}
            className="p-2 text-zinc-600 hover:text-[#932120] hover:bg-zinc-100 rounded-lg inline-flex items-center transition-colors shadow-2xs"
            title="Soạn thảo chi tiết bài thi"
          >
            <Edit3 className="w-4 h-4" />
          </Link>
          {t.status === "draft" ? (
            <button
              onClick={() => onStatusChange(t.id, "published")}
              className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg inline-flex items-center transition-colors shadow-2xs"
              title="Xuất bản đề thi"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => onStatusChange(t.id, "archived")}
              className="p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg inline-flex items-center transition-colors shadow-2xs"
              title="Lưu trữ đề thi"
            >
              <Archive className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => onDelete(t.id, t.title)}
            className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg inline-flex items-center transition-colors shadow-2xs"
            title="Xóa bài thi"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
