"use client";

import React, { useState, useEffect, useCallback } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, ShieldCheck, UserPlus, BarChart3, Users as UsersIcon } from "lucide-react";
import { m } from "motion/react";
import { BlurFadeCard } from "@/components/motion";
import {
  getAdminUsers,
  updateUserStatus,
  resendUserInvite,
  getAdminLearnersAnalytics,
  getAdminLearnerWhiteBoxAudit,
} from "@/services/users";
import { useAuth } from "@/hooks/useAuth";
import { extractApiErrorMessage } from "@/lib/api-error";
import { toast } from "sonner";
import { User } from "@/types";
import { UserTable } from "@/components/admin/UserTable";
import { UserPagination } from "@/components/admin/UserPagination";
import { UserCreateModal } from "@/components/admin/UserCreateModal";
import { LearnerAnalyticsMatrix } from "@/components/admin/LearnerAnalyticsMatrix";
import { LearnerWhiteBoxAuditModal } from "@/components/admin/LearnerWhiteBoxAuditModal";

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"accounts" | "analytics">("accounts");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalRole, setModalRole] = useState<"admin" | "expert">("expert");
  const [auditUserId, setAuditUserId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: accountsData, isLoading: loadingAccounts } = useQuery({
    queryKey: ["admin-users", page, pageSize, debouncedSearch, selectedRole],
    queryFn: () => {
      const params: NonNullable<Parameters<typeof getAdminUsers>[0]> = { page, limit: pageSize };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (selectedRole !== "all") params.role = selectedRole;
      return getAdminUsers(params);
    },
    enabled: viewMode === "accounts",
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });

  const { data: analyticsData, isLoading: loadingAnalytics } = useQuery({
    queryKey: ["admin-learners-analytics", page, pageSize, debouncedSearch],
    queryFn: () => {
      const params: NonNullable<Parameters<typeof getAdminLearnersAnalytics>[0]> = { page, limit: pageSize };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      return getAdminLearnersAnalytics(params);
    },
    enabled: viewMode === "analytics",
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
  });

  const handlePrefetchAudit = useCallback(
    (userId: string) => {
      queryClient.prefetchQuery({
        queryKey: ["admin-learner-audit", userId],
        queryFn: () => getAdminLearnerWhiteBoxAudit(userId),
        staleTime: 60 * 1000,
      });
    },
    [queryClient]
  );

  const users: User[] = accountsData?.items || [];
  const total = viewMode === "analytics" ? analyticsData?.total || 0 : accountsData?.total || 0;
  const activeTotal: number | undefined = accountsData?.active_total;
  const bannedTotal: number | undefined = accountsData?.banned_total;

  const handleToggleStatus = async (targetUser: User) => {
    if (currentUser?.id === targetUser.id) return toast.error("Không thể tự khóa tài khoản của chính mình!");
    try {
      const newStatus = !targetUser.is_active;
      await updateUserStatus(targetUser.id, { is_active: newStatus });
      toast.success(`Đã ${newStatus ? "mở khóa" : "khóa"} tài khoản thành công`);
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (error: unknown) {
      toast.error(extractApiErrorMessage(error, "Lỗi khi cập nhật trạng thái"));
    }
  };

  const handleResendInvite = async (targetUser: User) => {
    setResendingId(targetUser.id);
    try {
      await resendUserInvite(targetUser.id);
      toast.success(`Đã gửi lại thư mời kích hoạt tới ${targetUser.email}!`);
    } catch (err: unknown) {
      toast.error(extractApiErrorMessage(err, "Không thể gửi lại thư mời kích hoạt"));
    } finally {
      setResendingId(null);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">Quản lý Học viên & Minh chứng Số liệu</h1>
          <p className="text-sm sm:text-base text-zinc-500 mt-1">Phân quyền tài khoản và kiểm toán 1:1 mọi chỉ số BR-12 / BR-17 của từng học viên</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button onClick={() => { setModalRole("admin"); setIsModalOpen(true); }} className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-black text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-xs cursor-pointer">
            <ShieldCheck className="w-4 h-4 text-amber-400" /> Tạo Admin
          </button>
          <button onClick={() => { setModalRole("expert"); setIsModalOpen(true); }} className="inline-flex items-center gap-2 bg-[#932120] hover:bg-[#7a1a19] text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-xs cursor-pointer">
            <UserPlus className="w-4 h-4" /> Tạo Expert
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 pb-3">
        {(
          [
            { id: "analytics", label: "Thống kê & Minh chứng Học viên (White-Box Audit)", Icon: BarChart3 },
            { id: "accounts", label: "Danh sách Tài khoản & Phân quyền", Icon: UsersIcon },
          ] as const
        ).map(({ id, label, Icon }) => {
          const isActive = viewMode === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                setViewMode(id);
                setPage(1);
              }}
              className={`relative inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                isActive
                  ? "text-white"
                  : "bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {isActive && (
                <m.span
                  layoutId="admin-users-mode-pill"
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-xl bg-[#932120] shadow-xs"
                />
              )}
              <Icon className="w-4 h-4 relative z-10" />
              <span className="relative z-10">{label}</span>
            </button>
          );
        })}
      </div>

      {viewMode === "accounts" && (
        <div className="flex border-b border-zinc-200 gap-6 text-sm font-bold overflow-x-auto">
          {[{ id: "all", label: "Tất cả" }, { id: "learner", label: "Học viên (Learner)" }, { id: "expert", label: "Chuyên gia (Expert)" }, { id: "admin", label: "Quản trị viên (Admin)" }].map((tab) => (
            <button key={tab.id} onClick={() => { setSelectedRole(tab.id); setPage(1); }} className={`pb-3 border-b-2 transition-colors whitespace-nowrap cursor-pointer ${selectedRole === tab.id ? "border-[#932120] text-[#932120]" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <BlurFadeCard inView={false}>
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden w-full">
        <div className="p-4 sm:p-5 border-b border-zinc-200 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-zinc-50/50">
          <div className="relative w-full md:max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input type="text" placeholder="Tìm kiếm email, họ tên..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 pr-4 py-2.5 border border-zinc-300 rounded-xl text-sm text-zinc-900 bg-white focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120] w-full" />
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            <span className="text-xs sm:text-sm font-semibold text-zinc-700 bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-lg">
              Tổng: {total}
            </span>
            {viewMode === "accounts" && activeTotal !== undefined && (
              <>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg">
                  Hoạt động: {activeTotal}
                </span>
                <span className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-lg">
                  Đã khóa: {bannedTotal ?? 0}
                </span>
              </>
            )}
          </div>
        </div>

        {viewMode === "analytics" ? (
          <LearnerAnalyticsMatrix
            items={analyticsData?.items || []}
            loading={loadingAnalytics}
            elapsedMs={analyticsData?.elapsed_ms}
            cacheHit={analyticsData?.cache_hit}
            onOpenAudit={(uid) => setAuditUserId(uid)}
            onPrefetchAudit={handlePrefetchAudit}
          />
        ) : (
          <UserTable
            users={users}
            loading={loadingAccounts}
            currentUserId={currentUser?.id}
            resendingId={resendingId}
            onToggleStatus={handleToggleStatus}
            onResendInvite={handleResendInvite}
            onOpenAudit={(u) => setAuditUserId(u.id)}
            onPrefetchAudit={handlePrefetchAudit}
          />
        )}

        <UserPagination page={page} pageSize={pageSize} total={total} loading={viewMode === "analytics" ? loadingAnalytics : loadingAccounts} onPageChange={setPage} onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(1); }} />
        </div>
      </BlurFadeCard>

      <UserCreateModal isOpen={isModalOpen} initialRole={modalRole} onClose={() => setIsModalOpen(false)} onSuccess={() => { setIsModalOpen(false); queryClient.invalidateQueries({ queryKey: ["admin-users"] }); }} />
      <LearnerWhiteBoxAuditModal userId={auditUserId} onClose={() => setAuditUserId(null)} />
    </div>
  );
}
