"use client";

import React, { useState } from "react";
import { FileText, Plus, Database, Loader2, RotateCcw } from "lucide-react";
import { DatasetIngestModal } from "@/components/admin/DatasetIngestModal";
import { CreateTestModal } from "@/components/admin/CreateTestModal";
import { TestTableRow } from "@/components/admin/TestTableRow";
import { TestFilterBar } from "@/components/admin/TestFilterBar";
import { TestPagination } from "@/components/admin/TestPagination";
import { TestBulkActionBar } from "@/components/admin/TestBulkActionBar";
import { useAdminTests } from "@/hooks/useAdminTests";

const SKILL_LABELS: Record<string, string> = {
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
  speaking: "Speaking",
};

export default function AdminTestsPage() {
  const {
    page,
    setPage,
    limit,
    skill,
    status,
    setStatus,
    testSetId,
    setTestSetId,
    allowedMode,
    setAllowedMode,
    sortBy,
    setSortBy,
    search,
    setSearch,
    tests,
    total,
    testSets,
    selectedIds,
    loading,
    isRefreshing,
    isPendingTransition,
    hasActiveFilters,
    handleTabClick,
    handleStatusChange,
    handleBulkStatus,
    handleDelete,
    toggleSelectAll,
    toggleSelectOne,
    resetAllFilters,
    clearCacheAndRefresh,
  } = useAdminTests();

  const [isIngestOpen, setIsIngestOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const totalPages = Math.ceil(total / limit) || 1;
  const isAllSelected = tests.length > 0 && selectedIds.length === tests.length;

  return (
    <div className="space-y-6 sm:space-y-8 w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-7 rounded-2xl border border-zinc-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-[#932120]" />
            Ngân Hàng Đề Thi 4 Kỹ Năng (IELTS Content)
            {(isRefreshing || isPendingTransition) && <Loader2 className="w-4 h-4 animate-spin text-[#932120]" />}
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">Quản trị đề thi Reading, Listening, Writing, Speaking và bộ đề thi thử thực chiến</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setIsIngestOpen(true)} className="px-4 py-2.5 bg-zinc-100 text-zinc-800 rounded-xl text-xs sm:text-sm font-bold hover:bg-zinc-200 transition-colors flex items-center gap-2 border border-zinc-300 shadow-xs">
            <Database className="w-4 h-4 text-[#932120]" /> Nạp từ Dataset Crawled
          </button>
          <button onClick={() => setIsCreateOpen(true)} className="px-4 py-2.5 bg-[#932120] text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-[#7a1a19] transition-colors flex items-center gap-2 shadow-xs">
            <Plus className="w-4 h-4" /> Soạn Đề Mới
          </button>
        </div>
      </div>

      <TestFilterBar
        skill={skill}
        status={status}
        testSetId={testSetId}
        allowedMode={allowedMode}
        sortBy={sortBy}
        search={search}
        testSets={testSets}
        isRefreshing={isRefreshing}
        loading={loading}
        onTabClick={handleTabClick}
        onStatusChange={(st) => { setStatus(st); setPage(1); }}
        onTestSetChange={(ts) => { setTestSetId(ts); setPage(1); }}
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
      />

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden relative w-full">
        {(isRefreshing || isPendingTransition) && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#932120] animate-pulse z-10" />
        )}

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs sm:text-sm min-w-[760px]">
            <thead className="bg-zinc-50 text-zinc-500 font-bold border-b border-zinc-200 uppercase tracking-wider">
              <tr>
                <th className="py-4 pl-6 pr-2 w-10">
                  <input type="checkbox" checked={isAllSelected} onChange={(e) => toggleSelectAll(e.target.checked)} className="w-4 h-4 rounded text-[#932120] focus:ring-[#932120] cursor-pointer" title={isAllSelected ? "Bỏ chọn tất cả" : "Chọn tất cả trang này"} />
                </th>
                <th className="py-4 px-4">Bài Thi & Bộ Đề</th>
                <th className="py-4 px-4">Kỹ Năng</th>
                <th className="py-4 px-4">Chế Độ</th>
                <th className="py-4 px-4">Thời Lượng</th>
                <th className="py-4 px-4">Trạng Thái</th>
                <th className="py-4 px-6 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-700">
              {loading && tests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-zinc-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#932120] mb-3" />
                    Đang nạp dữ liệu đề thi...
                  </td>
                </tr>
              ) : tests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-zinc-500 text-sm">
                    {hasActiveFilters ? (
                      <div className="space-y-3">
                        <p>Không tìm thấy đề thi nào khớp với bộ lọc hiện tại.</p>
                        <button onClick={resetAllFilters} className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-2xs">
                          <RotateCcw className="w-3.5 h-3.5" /> Đặt lại bộ lọc
                        </button>
                      </div>
                    ) : (
                      <span>Chưa có đề thi nào. Nhấn <strong>&quot;Nạp từ Dataset Crawled&quot;</strong> để quét và nạp đề.</span>
                    )}
                  </td>
                </tr>
              ) : (
                tests.map((t) => (
                  <TestTableRow
                    key={t.id}
                    test={t}
                    skillLabel={SKILL_LABELS[t.skill] || t.skill}
                    isSelected={selectedIds.includes(t.id)}
                    onToggleSelect={toggleSelectOne}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <TestPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </div>

      <DatasetIngestModal isOpen={isIngestOpen} onClose={() => setIsIngestOpen(false)} onSuccess={() => clearCacheAndRefresh(true)} />
      <CreateTestModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onCreated={() => clearCacheAndRefresh(true)} />
    </div>
  );
}
