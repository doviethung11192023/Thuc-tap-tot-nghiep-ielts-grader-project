"use client";

import React from "react";
import { CheckCircle2, Clock, BookOpen, Headphones, PenTool, Mic } from "lucide-react";
import type { ScannedTestItem } from "@/types/exam";

interface DatasetTestRowProps {
  test: ScannedTestItem;
  isSelected: boolean;
  disabled?: boolean;
  onToggleSelect: (id: string) => void;
}

const SKILL_ICONS: Record<string, React.ReactNode> = {
  reading: <BookOpen className="w-3.5 h-3.5 text-sky-600" />,
  listening: <Headphones className="w-3.5 h-3.5 text-emerald-600" />,
  writing: <PenTool className="w-3.5 h-3.5 text-amber-600" />,
  speaking: <Mic className="w-3.5 h-3.5 text-rose-600" />
};

export function DatasetTestRow({
  test,
  isSelected,
  disabled = false,
  onToggleSelect
}: DatasetTestRowProps) {
  return (
    <div
      onClick={() => !disabled && onToggleSelect(test.id)}
      className={`p-2.5 flex items-center justify-between gap-3 text-xs transition-colors cursor-pointer select-none ${
        isSelected ? "bg-red-50/50 hover:bg-red-50" : "hover:bg-zinc-50"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => {}}
          disabled={disabled}
          className="w-4 h-4 rounded text-[#932120] border-zinc-300 focus:ring-[#932120] pointer-events-none"
        />
        <div className="flex items-center gap-1.5 shrink-0">
          {SKILL_ICONS[test.skill]}
          <span className="font-bold uppercase text-[10px] text-zinc-500">
            [{test.skill}]
          </span>
        </div>
        <div className="truncate">
          <span className="font-semibold text-zinc-900 block truncate" title={test.title}>
            {test.title}
          </span>
          <span className="text-[10px] text-zinc-400 block truncate">
            {test.category ? `${test.category} • ` : ""}{test.folder}
          </span>
        </div>
      </div>

      <div className="shrink-0">
        {test.is_imported ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Đã có
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
            <Clock className="w-3 h-3" /> Chưa nạp
          </span>
        )}
      </div>
    </div>
  );
}
