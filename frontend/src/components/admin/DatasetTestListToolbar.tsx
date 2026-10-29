"use client";

import React from "react";
import { Search } from "lucide-react";
import type { SkillType } from "@/types/exam";

interface DatasetTestListToolbarProps {
  skillFilter: SkillType | "all";
  setSkillFilter: (s: SkillType | "all") => void;
  statusFilter: "all" | "pending" | "imported";
  setStatusFilter: (st: "all" | "pending" | "imported") => void;
  search: string;
  setSearch: (q: string) => void;
  counts: { all: number; reading: number; listening: number; writing: number; speaking: number; pending: number; imported: number };
}

export function DatasetTestListToolbar({
  skillFilter,
  setSkillFilter,
  statusFilter,
  setStatusFilter,
  search,
  setSearch,
  counts
}: DatasetTestListToolbarProps) {
  return (
    <div className="space-y-2">
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
    </div>
  );
}
