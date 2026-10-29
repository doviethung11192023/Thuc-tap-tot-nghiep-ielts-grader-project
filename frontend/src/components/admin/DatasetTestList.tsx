"use client";

import React, { useState, useMemo } from "react";
import type { ScannedTestItem, SkillType } from "@/types/exam";
import { DatasetTestRow } from "@/components/admin/DatasetTestRow";
import { DatasetTestListToolbar } from "@/components/admin/DatasetTestListToolbar";

interface DatasetTestListProps {
  tests: ScannedTestItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectMultiple: (ids: string[]) => void;
  onDeselectAll: () => void;
  onDifficultyChange?: (id: string, diff: "easy" | "medium" | "hard") => void;
  disabled?: boolean;
}

export function DatasetTestList({
  tests,
  selectedIds,
  onToggleSelect,
  onSelectMultiple,
  onDeselectAll,
  onDifficultyChange,
  disabled = false
}: DatasetTestListProps) {
  const [skillFilter, setSkillFilter] = useState<SkillType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "imported">("all");
  const [search, setSearch] = useState("");

  const filteredTests = useMemo(() => {
    return tests.filter((t) => {
      if (skillFilter !== "all" && t.skill !== skillFilter) return false;
      if (statusFilter === "pending" && t.is_imported) return false;
      if (statusFilter === "imported" && !t.is_imported) return false;
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const matchesTitle = t.title.toLowerCase().includes(query);
        const matchesFolder = t.folder.toLowerCase().includes(query);
        const matchesCat = t.category.toLowerCase().includes(query);
        if (!matchesTitle && !matchesFolder && !matchesCat) return false;
      }
      return true;
    });
  }, [tests, skillFilter, statusFilter, search]);

  const counts = useMemo(() => {
    return {
      all: tests.length,
      reading: tests.filter((t) => t.skill === "reading").length,
      listening: tests.filter((t) => t.skill === "listening").length,
      writing: tests.filter((t) => t.skill === "writing").length,
      speaking: tests.filter((t) => t.skill === "speaking").length,
      pending: tests.filter((t) => !t.is_imported).length,
      imported: tests.filter((t) => t.is_imported).length,
    };
  }, [tests]);

  return (
    <div className="space-y-2.5">
      <DatasetTestListToolbar
        skillFilter={skillFilter}
        setSkillFilter={setSkillFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        search={search}
        setSearch={setSearch}
        counts={counts}
      />

      {/* Quick Selection Toolbar */}
      <div className="flex items-center justify-between px-1 text-[11px] text-zinc-500">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectMultiple(tests.filter((t) => !t.is_imported).map((t) => t.id))}
            className="text-amber-700 font-bold hover:underline"
          >
            + Chọn tất cả {counts.pending} bài chưa nạp
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => onSelectMultiple(filteredTests.map((t) => t.id))}
            className="text-zinc-700 font-semibold hover:underline"
          >
            Chọn {filteredTests.length} bài hiển thị
          </button>
          {selectedIds.size > 0 && (
            <>
              <span>•</span>
              <button
                type="button"
                onClick={onDeselectAll}
                className="text-rose-600 font-medium hover:underline"
              >
                Bỏ chọn
              </button>
            </>
          )}
        </div>
        <span className="font-bold text-[#932120]">
          Đã chọn: {selectedIds.size} / {tests.length} bài
        </span>
      </div>

      {/* Test Items Scroll List */}
      <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white max-h-[300px] overflow-y-auto divide-y divide-zinc-100">
        {filteredTests.length === 0 ? (
          <div className="py-8 text-center text-zinc-400 text-xs">
            Không tìm thấy đề thi phù hợp với bộ lọc.
          </div>
        ) : (
          filteredTests.map((t) => (
            <DatasetTestRow
              key={t.id}
              test={t}
              isSelected={selectedIds.has(t.id)}
              disabled={disabled}
              onToggleSelect={onToggleSelect}
              onDifficultyChange={onDifficultyChange}
            />
          ))
        )}
      </div>
    </div>
  );
}
