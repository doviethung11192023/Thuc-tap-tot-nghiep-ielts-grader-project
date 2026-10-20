"use client";

import React from "react";
import { Search, RefreshCw, X } from "lucide-react";
import type { SkillType, ContentStatus, AllowedMode, TestSet } from "@/types/exam";
import { TestFilterChips } from "@/components/admin/TestFilterChips";

const SKILL_LABELS: Record<string, string> = {
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
  speaking: "Speaking",
};

interface TestFilterBarProps {
  skill: SkillType | undefined;
  status: ContentStatus | undefined;
  testSetId: string | undefined;
  allowedMode: AllowedMode | undefined;
  sortBy: string;
  search: string;
  testSets: TestSet[];
  isRefreshing: boolean;
  loading: boolean;
  onTabClick: (newSkill: SkillType | undefined) => void;
  onStatusChange: (status: ContentStatus | undefined) => void;
  onTestSetChange: (testSetId: string | undefined) => void;
  onModeChange: (mode: AllowedMode | undefined) => void;
  onSortChange: (sort: string) => void;
  onSearchChange: (val: string) => void;
  onResetAll: () => void;
  onRefresh: () => void;
}

export function TestFilterBar({
  skill,
  status,
  testSetId,
  allowedMode,
  sortBy,
  search,
  testSets,
  isRefreshing,
  loading,
  onTabClick,
  onStatusChange,
  onTestSetChange,
  onModeChange,
  onSortChange,
  onSearchChange,
  onResetAll,
  onRefresh,
}: TestFilterBarProps) {
  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200 shadow-xs space-y-3.5 w-full">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          <button
            onClick={() => onTabClick(undefined)}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              !skill ? "bg-[#932120] text-white shadow-xs" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            Tất cả
          </button>
          {(["reading", "listening", "writing", "speaking"] as SkillType[]).map((s) => (
            <button
              key={s}
              onClick={() => onTabClick(s)}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                skill === s ? "bg-[#932120] text-white shadow-xs" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {SKILL_LABELS[s]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tiêu đề..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 pr-8 py-2 border border-zinc-300 rounded-xl text-xs sm:text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-[#932120] focus:border-[#932120] w-full"
            />
            {search && (
              <button onClick={() => onSearchChange("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button onClick={onRefresh} className="p-2.5 border border-zinc-200 rounded-xl hover:bg-zinc-100 text-zinc-600 transition-colors shadow-2xs shrink-0" title="Tải lại danh sách">
            <RefreshCw className={`w-4 h-4 ${isRefreshing || loading ? "animate-spin text-[#932120]" : ""}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-zinc-100">
        <div>
          <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Trạng thái</label>
          <select value={status || ""} onChange={(e) => onStatusChange(e.target.value ? (e.target.value as ContentStatus) : undefined)} className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-800 bg-zinc-50 focus:bg-white focus:outline-none focus:border-[#932120]">
            <option value="">Tất cả trạng thái</option>
            <option value="published">Đã xuất bản</option>
            <option value="draft">Bản nháp</option>
            <option value="archived">Lưu trữ</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Bộ đề thi</label>
          <select value={testSetId || ""} onChange={(e) => onTestSetChange(e.target.value || undefined)} className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-800 bg-zinc-50 focus:bg-white focus:outline-none focus:border-[#932120] truncate">
            <option value="">Tất cả bộ đề ({testSets.length})</option>
            {testSets.map((ts) => (<option key={ts.id} value={ts.id}>{ts.name}</option>))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Chế độ làm bài</label>
          <select value={allowedMode || ""} onChange={(e) => onModeChange(e.target.value ? (e.target.value as AllowedMode) : undefined)} className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-800 bg-zinc-50 focus:bg-white focus:outline-none focus:border-[#932120]">
            <option value="">Tất cả chế độ</option>
            <option value="both">Both (Luyện & Thi)</option>
            <option value="practice">Chỉ Luyện tập</option>
            <option value="mock">Chỉ Thi thử</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Sắp xếp theo</label>
          <select value={sortBy} onChange={(e) => onSortChange(e.target.value)} className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-xl text-xs font-semibold text-zinc-800 bg-zinc-50 focus:bg-white focus:outline-none focus:border-[#932120]">
            <option value="newest">Mới nhất trước</option>
            <option value="oldest">Cũ nhất trước</option>
            <option value="title_asc">Tên A &rarr; Z</option>
            <option value="title_desc">Tên Z &rarr; A</option>
            <option value="duration_desc">Thời lượng nhiều nhất</option>
          </select>
        </div>
      </div>

      <TestFilterChips
        skill={skill}
        status={status}
        testSetId={testSetId}
        allowedMode={allowedMode}
        sortBy={sortBy}
        search={search}
        testSets={testSets}
        onRemoveSkill={() => onTabClick(undefined)}
        onRemoveStatus={() => onStatusChange(undefined)}
        onRemoveTestSet={() => onTestSetChange(undefined)}
        onRemoveMode={() => onModeChange(undefined)}
        onRemoveSort={() => onSortChange("newest")}
        onRemoveSearch={() => onSearchChange("")}
        onResetAll={onResetAll}
      />
    </div>
  );
}
