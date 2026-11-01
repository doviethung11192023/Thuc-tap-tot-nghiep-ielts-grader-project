"use client";

import React, { useState } from "react";
import { FileText, Plus, Database, Loader2, RotateCcw, FolderKanban } from "lucide-react";
import { DatasetIngestModal } from "@/components/admin/DatasetIngestModal";
import { CreateTestModal } from "@/components/admin/CreateTestModal";
import { AdminTestSetManagerModal } from "@/components/admin/AdminTestSetManagerModal";
import { TestTableRow } from "@/components/admin/TestTableRow";
import { TestFilterBar } from "@/components/admin/TestFilterBar";
import { TestPagination } from "@/components/admin/TestPagination";
import { TestBulkActionBar } from "@/components/admin/TestBulkActionBar";
import { AdminModeSwitcher, type AdminTestViewMode } from "@/components/admin/AdminModeSwitcher";
import { AdminExerciseTypeManager } from "@/components/admin/AdminExerciseTypeManager";
import { useAdminTests } from "@/hooks/useAdminTests";
import { bulkAssignTestsToSet } from "@/services/admin-test-sets";
import type { SkillType } from "@/types/exam";

const SKILL_LABELS: Record<string, string> = {
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
  speaking: "Speaking",
};

export default function AdminTestsPage() {
  const [viewMode, setViewMode] = useState<AdminTestViewMode>("full");
  const [createFormat, setCreateFormat] = useState<"full" | "exercise">("full");
  const [createSkill, setCreateSkill] = useState<SkillType>("reading");

  const {
    page, setPage, limit, skill, status, setStatus, testSetId, setTestSetId,
    difficulty, setDifficulty, allowedMode, setAllowedMode, sortBy, setSortBy,
    search, setSearch, tests, total, testSets, selectedIds, loading, isRefreshing,
    isPendingTransition, hasActiveFilters, handleTabClick, handleStatusChange,
    handleBulkStatus, handleDelete, toggleSelectAll, toggleSelectOne,
    resetAllFilters, clearCacheAndRefresh,
  } = useAdminTests("full");

  const [isIngestOpen, setIsIngestOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSetManagerOpen, setIsSetManagerOpen] = useState(false);

  const totalPages = Math.ceil(total / limit) || 1;
  const isAllSelected = tests.length > 0 && selectedIds.length === tests.length;

  const handleBulkAssignSet = async (targetSetId: string | null) => {
    if (selectedIds.length === 0) return;
    try {
      await bulkAssignTestsToSet(selectedIds, targetSetId);
      toggleSelectAll(false);
      clearCacheAndRefresh(false);
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Lỗi khi gán bộ đề");
    }
  };

  return (
    <div className="space-y-6 sm:space-y-7 w-full">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-7 rounded-2xl border border-zinc-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-[#932120]" />
            Ngân Hàng Đề Thi 4 Kỹ Năng (IELTS Content)
            {(isRefreshing || isPendingTransition) && <Loader2 className="w-4 h-4 animate-spin text-[#932120]" />}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Quản trị đề thi thử hoàn chỉnh 4 kỹ năng và kho bài tập luyện tập chuyên sâu theo dạng bài
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setIsSetManagerOpen(true)} className="px-4 py-2.5 bg-white text-zinc-800 rounded-xl text-xs sm:text-sm font-bold hover:bg-zinc-50 transition-colors flex items-center gap-2 border border-zinc-300 shadow-xs cursor-pointer">
            <FolderKanban className="w-4 h-4 text-[#932120]" /> Quản Lý Bộ Đề
          </button>
          <button onClick={() => setIsIngestOpen(true)} className="px-4 py-2.5 bg-zinc-100 text-zinc-800 rounded-xl text-xs sm:text-sm font-bold hover:bg-zinc-200 transition-colors flex items-center gap-2 border border-zinc-300 shadow-xs cursor-pointer">
            <Database className="w-4 h-4 text-[#932120]" /> Nạp từ Dataset Crawled
          </button>
          <button
            onClick={() => {
              setCreateFormat(viewMode === "exercises" ? "exercise" : "full");
              setIsCreateOpen(true);
            }}
            className="px-4 py-2.5 bg-[#932120] text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-[#7a1a19] transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" /> {viewMode === "exercises" ? "Soạn Bài Tập Theo Dạng" : "Soạn Đề Thi Mới"}
          </button>
        </div>
      </div>

      {/* Mode Switcher: Full Tests vs Question Type Exercises */}
      <AdminModeSwitcher viewMode={viewMode} onChange={setViewMode} fullCount={total} />

      {viewMode === "exercises" ? (
        <AdminExerciseTypeManager
          onOpenCreateExercise={(s) => {
            setCreateFormat("exercise");
            setCreateSkill(s);
            setIsCreateOpen(true);
          }}
        />
      ) : (
        <>
          <TestFilterBar
            skill={skill} status={status} testSetId={testSetId} difficulty={difficulty}
            allowedMode={allowedMode} sortBy={sortBy} search={search} testSets={testSets}
            isRefreshing={isRefreshing} loading={loading} onTabClick={handleTabClick}
            onStatusChange={(st) => { setStatus(st); setPage(1); }}
            onTestSetChange={(ts) => { setTestSetId(ts); setPage(1); }}
            onDifficultyChange={(d) => { setDifficulty(d); setPage(1); }}
            onModeChange={(m) => { setAllowedMode(m); setPage(1); }}
            onSortChange={(s) => { setSortBy(s); setPage(1); }}
            onSearchChange={(val) => { setSearch(val); setPage(1); }}
            onResetAll={resetAllFilters}
            onRefresh={() => clearCacheAndRefresh(false)}
          />

          <TestBulkActionBar
            selectedCount={selectedIds.length}
            onBulkStatus={handleBulkStatus}
            onClearSelection={() => toggleSelectAll(false)}
            testSets={testSets}
            onBulkAssignSet={handleBulkAssignSet}
          />

          <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden relative w-full">
            {(isRefreshing || isPendingTransition) && <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#932120] animate-pulse z-10" />}

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs sm:text-sm min-w-[760px]">
                <thead className="bg-zinc-50 text-zinc-500 font-bold border-b border-zinc-200 uppercase tracking-wider">
                  <tr>
                    <th className="py-4 pl-6 pr-2 w-10">
                      <input type="checkbox" checked={isAllSelected} onChange={(e) => toggleSelectAll(e.target.checked)} className="w-4 h-4 rounded text-[#932120] focus:ring-[#932120] cursor-pointer" />
                    </th>
                    <th className="py-4 px-4">Bài Thi & Bộ Đề</th>
                    <th className="py-4 px-4">Kỹ Năng</th>
                    <th className="py-4 px-4">Độ Khó</th>
                    <th className="py-4 px-4">Chế Độ</th>
                    <th className="py-4 px-4">Thời Lượng</th>
                    <th className="py-4 px-4">Trạng Thái</th>
                    <th className="py-4 px-6 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-zinc-700">
                  {loading && tests.length === 0 ? (
                    <tr><td colSpan={8} className="py-16 text-center text-zinc-400"><Loader2 className="w-8 h-8 animate-spin mx-auto text-[#932120] mb-3" />Đang nạp dữ liệu đề thi...</td></tr>
                  ) : tests.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-zinc-500 text-sm">
                        {hasActiveFilters ? (
                          <div className="space-y-3">
                            <p>Không tìm thấy đề thi nào khớp với bộ lọc hiện tại.</p>
                            <button onClick={resetAllFilters} className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-2xs">
                              <RotateCcw className="w-3.5 h-3.5" /> Đặt lại bộ lọc
                            </button>
                          </div>
                        ) : (
                          <span>Chưa có đề thi nào trong phân hệ này. Nhấn <strong>&quot;Soạn Đề Mới&quot;</strong> để tạo.</span>
                        )}
                      </td>
                    </tr>
                  ) : (
                    tests.map((t) => (
                      <TestTableRow key={t.id} test={t} skillLabel={SKILL_LABELS[t.skill] || t.skill} isSelected={selectedIds.includes(t.id)} onToggleSelect={toggleSelectOne} onStatusChange={handleStatusChange} onDelete={handleDelete} />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <TestPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
          </div>
        </>
      )}

      <DatasetIngestModal isOpen={isIngestOpen} onClose={() => setIsIngestOpen(false)} onSuccess={() => clearCacheAndRefresh(true)} />
      <CreateTestModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreated={() => clearCacheAndRefresh(true)} defaultFormat={createFormat} defaultSkill={createSkill} />
      <AdminTestSetManagerModal
        isOpen={isSetManagerOpen}
        onClose={() => setIsSetManagerOpen(false)}
        onSelectSetFilter={(id) => {
          setTestSetId(id);
          setPage(1);
          setIsSetManagerOpen(false);
        }}
        onChanged={() => clearCacheAndRefresh(false)}
      />
    </div>
  );
}
