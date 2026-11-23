"use client";

import React from "react";
import { Edit2, Trash2, Check, X, Filter } from "lucide-react";
import type { AdminTestSetItem } from "@/services/admin-test-sets";

interface AdminTestSetRowProps {
  item: AdminTestSetItem;
  isEditing: boolean;
  editName: string;
  onEditNameChange: (val: string) => void;
  onStartEdit: (item: AdminTestSetItem) => void;
  onSaveEdit: (setId: string) => void;
  onCancelEdit: () => void;
  onDelete: (setId: string, name: string) => void;
  onSelectSetFilter?: (setId: string) => void;
  disabled?: boolean;
}

export function AdminTestSetRow({
  item,
  isEditing,
  editName,
  onEditNameChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onSelectSetFilter,
  disabled,
}: AdminTestSetRowProps) {
  return (
    <div className="p-4 rounded-2xl border border-zinc-200/90 hover:border-zinc-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
      <div className="min-w-0 flex-1">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => onEditNameChange(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-zinc-300 text-xs sm:text-sm font-bold text-zinc-900 w-full"
            />
            <button onClick={() => onSaveEdit(item.id)} disabled={disabled} className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={onCancelEdit} className="p-1.5 text-zinc-400 hover:text-zinc-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div>
            <h4 className="text-sm font-bold text-zinc-900 truncate">{item.name}</h4>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-500">
              <span className="font-semibold text-zinc-700">{item.total_tests} bài thi</span>
              <span>•</span>
              <span className="text-emerald-600 font-medium">{item.published_tests} đã xuất bản</span>
              {item.skills.length > 0 && (
                <>
                  <span>•</span>
                  <span>{item.skills.join(", ")}</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {onSelectSetFilter && (
          <button
            onClick={() => onSelectSetFilter(item.id)}
            className="px-2.5 py-1.5 rounded-xl border border-zinc-200 bg-zinc-50/80 hover:bg-zinc-100 hover:border-zinc-300 active:scale-95 text-xs font-bold text-zinc-700 flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
            title="Xem danh sách bài thi thuộc bộ này"
          >
            <Filter className="w-3.5 h-3.5 text-[#932120]" />
            <span>Xem đề</span>
          </button>
        )}
        <button onClick={() => onStartEdit(item)} className="p-2 text-zinc-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors" title="Đổi tên">
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onDelete(item.id, item.name)} className="p-2 text-zinc-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors" title="Xóa bộ đề">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
