"use client";

import React, { useEffect, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useReducedMotion } from "motion/react";
import {
  ArrowRightLeft,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { AdminSlaPipelineStrip } from "@/components/admin/reviews/AdminSlaPipelineStrip";
import { BlurFadeCard } from "@/components/motion";
import { toast } from "sonner";
import {
  adminAssignReview,
  adminAutoDispatchReviews,
  getAdminReviews,
  type AdminExpertWorkload,
  type AdminReviewItem,
  type AdminReviewsSummary,
} from "@/services/admin-reviews";
import { AdminAssignExpertModal } from "@/components/admin/reviews/AdminAssignExpertModal";
import { AdminExpertKpiTable } from "@/components/admin/expert-governance/AdminExpertKpiTable";
import { extractApiErrorMessage } from "@/lib/api-error";

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  waiting: { label: "Chờ phân bổ", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  assigned: { label: "Đã giao Expert", cls: "bg-sky-50 text-sky-800 border-sky-200" },
  in_progress: { label: "Đang chấm", cls: "bg-blue-50 text-blue-800 border-blue-200" },
  completed: { label: "Đã hoàn thành", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  cancelled: { label: "Đã hủy", cls: "bg-zinc-100 text-zinc-600 border-zinc-200" },
};

function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AdminReviewsDispatchPage() {
  const prefersReduced = useReducedMotion();
  const [tbodyRef, setTbodyAnimate] = useAutoAnimate<HTMLTableSectionElement>({
    duration: 200,
    easing: "ease-out",
  });
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  useEffect(() => {
    setTbodyAnimate(!prefersReduced);
  }, [prefersReduced, setTbodyAnimate]);
  const [statusFilter, setStatusFilter] = useState("");
  const [skillFilter, setSkillFilter] = useState("");
  const [expertFilter, setExpertFilter] = useState("");
  const [search, setSearch] = useState("");
  const [dispatching, setDispatching] = useState(false);
  const [assignTarget, setAssignTarget] = useState<AdminReviewItem | null>(null);
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"queue" | "performance">("queue");

  const limit = 15;

  const { data, isLoading: loading, refetch } = useQuery({
    queryKey: ["admin-reviews", page, limit, statusFilter, skillFilter, expertFilter, search],
    queryFn: () =>
      getAdminReviews({
        page,
        limit,
        status: statusFilter || undefined,
        skill: skillFilter || undefined,
        expert_id: expertFilter || undefined,
        search: search.trim() || undefined,
      }),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });

  const items: AdminReviewItem[] = data?.items || [];
  const total: number = data?.total || 0;
  const experts: AdminExpertWorkload[] = data?.experts || [];
  const summary: AdminReviewsSummary = data?.summary || {
    total: 0,
    waiting: 0,
    assigned: 0,
    completed: 0,
    available_experts: 0,
  };

  const loadReviews = async () => {
    await refetch();
  };

  const handleAutoDispatch = async () => {
    try {
      setDispatching(true);
      const res = await adminAutoDispatchReviews();
      toast.success(res?.meta?.message || "Đã chạy phân bổ tự động");
      await queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    } catch (err: unknown) {
      toast.error(extractApiErrorMessage(err, "Không thể phân bổ tự động lúc này"));
    } finally {
      setDispatching(false);
    }
  };

  const handleConfirmAssign = async (expertId: string, note: string) => {
    if (!assignTarget) return;
    try {
      setAssignSubmitting(true);
      const res = await adminAssignReview(assignTarget.request_id, {
        expert_id: expertId,
        note: note.trim() || undefined,
      });
      toast.success(res?.meta?.message || "Đã cập nhật chuyên gia phụ trách");
      setAssignTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    } catch (err: unknown) {
      toast.error(extractApiErrorMessage(err, "Không thể gán bài cho chuyên gia này"));
    } finally {
      setAssignSubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6 sm:space-y-8 w-full">
      {/* Header */}
      <div className="border-b border-zinc-200 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
            Điều phối Chấm bài Chuyên gia
          </h1>
          <p className="text-sm sm:text-base text-zinc-500 mt-1">
            Theo dõi bài đang nằm ở chuyên gia nào và gán / chuyển giao trực tiếp theo yêu cầu.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="inline-flex p-1 bg-zinc-100 rounded-xl border border-zinc-200">
            <button
              type="button"
              onClick={() => setActiveTab("queue")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                activeTab === "queue" ? "bg-white text-zinc-900 shadow-xs" : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Hàng đợi điều phối
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("performance")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                activeTab === "performance" ? "bg-white text-[#932120] shadow-xs" : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Hiệu suất &amp; Thưởng Phạt Expert
            </button>
          </div>
          {activeTab === "queue" && (
            <>
              <button
                type="button"
                onClick={() => void handleAutoDispatch()}
                disabled={dispatching || summary.waiting === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#932120] hover:bg-[#7a1b1a] text-white text-xs sm:text-sm font-bold shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {dispatching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Phân bổ tự động ({summary.waiting})
              </button>
              <button
                type="button"
                onClick={() => void loadReviews()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs sm:text-sm font-bold text-zinc-700 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#932120]" : ""}`} />
                Làm mới
              </button>
            </>
          )}
        </div>
      </div>

      {activeTab === "performance" ? (
        <AdminExpertKpiTable interactive />
      ) : (
        <>
      {/* Interactive SLA Pipeline Strip (Lucian Workflow Systems) */}
      <AdminSlaPipelineStrip
        summary={summary}
        expertsTotal={experts.length}
        activeStatus={statusFilter}
        onSelectStatus={(nextStatus) => {
          setStatusFilter(nextStatus);
          setPage(1);
        }}
      />

      {/* Filter + Table */}
      <BlurFadeCard inView={false} index={1}>
        <div className="bg-white p-5 sm:p-7 rounded-2xl border border-zinc-200 shadow-xs w-full space-y-5">
        <div className="flex flex-col xl:flex-row gap-3 items-stretch xl:items-center">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo mã request, attempt, email học viên hoặc chuyên gia..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#932120]/20 focus:border-[#932120]"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <select
              aria-label="Lọc theo trạng thái"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#932120]/20"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="waiting">Chờ phân bổ</option>
              <option value="assigned">Đã giao Expert</option>
              <option value="completed">Đã hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
            </select>

            <select
              aria-label="Lọc theo kỹ năng"
              value={skillFilter}
              onChange={(e) => {
                setSkillFilter(e.target.value);
                setPage(1);
              }}
              className="px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#932120]/20"
            >
              <option value="">Tất cả kỹ năng</option>
              <option value="writing">Writing</option>
              <option value="speaking">Speaking</option>
            </select>

            <select
              aria-label="Lọc theo chuyên gia"
              value={expertFilter}
              onChange={(e) => {
                setExpertFilter(e.target.value);
                setPage(1);
              }}
              className="w-full sm:max-w-[210px] truncate px-3.5 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#932120]/20"
            >
              <option value="">Tất cả chuyên gia</option>
              {experts.map((exp) => (
                <option key={exp.user_id} value={exp.user_id}>
                  {exp.full_name} ({exp.active_open}/{exp.max_active_reviews})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-zinc-200 rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
                <th className="py-3.5 px-4">Yêu cầu / Attempt</th>
                <th className="py-3.5 px-4">Học viên</th>
                <th className="py-3.5 px-4">Đề thi &amp; Kỹ năng</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-4">Chuyên gia đang giữ</th>
                <th className="py-3.5 px-4 text-right">Điều phối</th>
              </tr>
            </thead>
            <tbody ref={tbodyRef} className="divide-y divide-zinc-100 text-sm">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#932120]" />
                    Đang tải danh sách điều phối...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    Không có yêu cầu chấm bài nào khớp bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const badge = STATUS_BADGE[item.status] || {
                    label: item.status,
                    cls: "bg-zinc-100 text-zinc-700 border-zinc-200",
                  };
                  const canAssign = item.status !== "completed" && item.status !== "cancelled";

                  return (
                    <tr key={item.request_id} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-mono text-xs font-bold text-zinc-900">
                          #{item.request_id.slice(0, 8)}
                        </div>
                        <div className="font-mono text-[11px] text-zinc-400 mt-0.5">
                          att: #{(item.attempt_id || "").slice(0, 8)}
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">
                          {formatDateTime(item.requested_at)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        <div className="font-semibold text-zinc-900">{item.learner.full_name}</div>
                        <div className="text-xs text-zinc-500">{item.learner.email}</div>
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        <div className="font-medium text-zinc-900 max-w-[220px] truncate" title={item.test_title}>
                          {item.test_title}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold uppercase bg-zinc-100 text-zinc-700">
                            {item.skill}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-zinc-50 text-zinc-600 border border-zinc-200">
                            {item.source === "mock" ? "Mock Test" : "Practice"}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${badge.cls}`}>
                          {badge.label}
                        </span>
                        {item.reassigned_count > 0 && (
                          <div className="text-[11px] text-amber-700 font-medium mt-1">
                            Đã chuyển {item.reassigned_count} lần
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 align-top">
                        {item.current_assignment ? (
                          <div>
                            <div className="font-semibold text-zinc-900">
                              {item.current_assignment.expert_name}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {item.current_assignment.expert_email}
                            </div>
                            <div className="text-[11px] text-zinc-400 mt-0.5">
                              Giao lúc {formatDateTime(item.current_assignment.assigned_at)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-amber-700">Chưa có chuyên gia nhận</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 align-top text-right">
                        {canAssign ? (
                          <button
                            type="button"
                            onClick={() => setAssignTarget(item)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 bg-white hover:border-[#932120] hover:text-[#932120] text-xs font-bold text-zinc-700 transition-colors cursor-pointer"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            {item.current_assignment ? "Chuyển Expert" : "Gán Expert"}
                          </button>
                        ) : (
                          <span className="text-xs text-zinc-400">Đã chốt</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-between pt-2 text-xs sm:text-sm text-zinc-600">
            <span>
              Trang <strong>{page}</strong> / {totalPages} ({total} yêu cầu)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-50 cursor-pointer"
              >
                Trước
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-50 cursor-pointer"
              >
                Sau
              </button>
            </div>
          </div>
        )}
        </div>
      </BlurFadeCard>

      <AdminAssignExpertModal
        review={assignTarget}
        experts={experts}
        submitting={assignSubmitting}
        onClose={() => setAssignTarget(null)}
        onConfirm={handleConfirmAssign}
      />
        </>
      )}
    </div>
  );
}
