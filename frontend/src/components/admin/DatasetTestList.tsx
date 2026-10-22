"use client";

import React, { useState, useMemo } from "react";
import { Search } from "lucide-react";
import type { ScannedTestItem, SkillType } from "@/types/exam";
import { DatasetTestRow } from "@/components/admin/DatasetTestRow";

interface DatasetTestListProps {
  tests: ScannedTestItem[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectMultiple: (ids: string[]) => void;
  onDeselectAll: () => void;
  disabled?: boolean;
}

export function DatasetTestList({
  tests,
  selectedIds,
  onToggleSelect,
  onSelectMultiple,
  onDeselectAll,
  disabled = false
}: DatasetTestListProps) {
  const [skillFilter, setSkillFilter] = useState<SkillType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "imported">("all");
  const [search, setSearch] = useState("");

  // Filtered tests based on skill, status, and search query
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

  // Skill counts for quick badges
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

  const handleSelectAllFiltered = () => {
    onSelectMultiple(filteredTests.map((t) => t.id));
  };

  const handleSelectAllPending = () => {
    onSelectMultiple(tests.filter((t) => !t.is_imported).map((t) => t.id));
  };

  return (
    <div className="space-y-2.5">
      {/* Skill Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => setSkillFilter("all")}
          className={`px-2.5 py-1 rounded-lg font-bold transition-colors shrink-0 ${
            skillFilter === "all" ? "bg-[#932120] text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
          }`}
        >
          Tất cả ({counts.all})
        </button>
        {(["reading", "listening", "writing", "speaking"] as SkillType[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSkillFilter(s)}
            className={`px-2.5 py-1 rounded-lg font-bold transition-colors shrink-0 capitalize ${
              skillFilter === s ? "bg-[#932120] text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            {s} ({counts[s]})
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-50 p-2 rounded-xl border border-zinc-200 text-xs">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
              statusFilter === "all" ? "bg-zinc-800 text-white" : "text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            Tất cả
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("pending")}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
              statusFilter === "pending" ? "bg-amber-700 text-white" : "text-amber-800 hover:bg-amber-100"
            }`}
          >
            Chưa nạp ({counts.pending})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("imported")}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
              statusFilter === "imported" ? "bg-emerald-700 text-white" : "text-emerald-800 hover:bg-emerald-100"
            }`}
          >
            Đã có ({counts.imported})
          </button>
        </div>

        <div className="relative flex-1 min-w-[160px] max-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-zinc-400" />
          <input
            type="text"
            placeholder="Tìm tên đề, thư mục..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1 bg-white border border-zinc-200 rounded-lg text-xs focus:ring-1 focus:ring-[#932120]"
          />
        </div>
      </div>

      {/* Quick Selection Toolbar */}
      <div className="flex items-center justify-between px-1 text-[11px] text-zinc-500">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSelectAllPending}
            className="text-amber-700 font-bold hover:underline"
          >
            + Chọn tất cả {counts.pending} bài chưa nạp
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={handleSelectAllFiltered}
            className="text-zinc-700 font-semibold hover:underline"
          >
            Chọn {filteredTests.length} bài đang hiển thị
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
            />
          ))
        )}
      </div>
    </div>
  );
}
