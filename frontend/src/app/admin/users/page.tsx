"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Search, ShieldCheck, UserPlus } from "lucide-react";
import { getAdminUsers, updateUserStatus, resendUserInvite } from "@/services/users";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
import { User } from "@/types";
import { UserTable } from "@/components/admin/UserTable";
import { UserPagination } from "@/components/admin/UserPagination";
import { UserCreateModal } from "@/components/admin/UserCreateModal";

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalRole, setModalRole] = useState<"admin" | "expert">("expert");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: pageSize };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (selectedRole !== "all") params.role = selectedRole;
      const data = await getAdminUsers(params);
      setUsers(data.items || []);
      setTotal(data.total || 0);
    } catch (error: any) {
      toast.error(error.response?.status === 403 ? "403 Forbidden: Cần quyền Admin" : "Không thể tải người dùng");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, selectedRole]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleToggleStatus = async (targetUser: User) => {
    if (currentUser?.id === targetUser.id) {
      toast.error("Không thể tự khóa tài khoản của chính mình!");
      return;
    }
    try {
      const newStatus = !targetUser.is_active;
      await updateUserStatus(targetUser.id, { is_active: newStatus });
      toast.success(`Đã ${newStatus ? "mở khóa" : "khóa"} tài khoản thành công`);
      setUsers((prev) => prev.map((u) => (u.id === targetUser.id ? { ...u, is_active: newStatus } : u)));
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Lỗi khi cập nhật trạng thái");
    }
  };

  const handleResendInvite = async (targetUser: User) => {
    setResendingId(targetUser.id);
    try {
      await resendUserInvite(targetUser.id);
      toast.success(`Đã gửi lại thư mời kích hoạt tới ${targetUser.email}!`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Không thể gửi lại thư mời kích hoạt");
    } finally {
      setResendingId(null);
    }
  };

  const handleOpenModal = (role: "admin" | "expert") => {
    setModalRole(role);
    setIsModalOpen(true);
  };

  const activeCount = users.filter((u) => u.is_active).length;
  const bannedCount = users.filter((u) => !u.is_active).length;

  return (
    <div className="space-y-6 sm:space-y-8 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">Quản lý Tài khoản & Phân quyền</h1>
          <p className="text-sm sm:text-base text-zinc-500 mt-1">Danh sách người dùng, quản trị khóa và cấp quyền Quản trị viên / Chuyên gia</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => handleOpenModal("admin")} className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-black text-white px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors border border-zinc-800">
            <ShieldCheck className="w-4 h-4 text-amber-400" /> Tạo tài khoản Admin
          </button>
          <button onClick={() => handleOpenModal("expert")} className="inline-flex items-center gap-2 bg-[#932120] hover:bg-[#7a1a19] text-white px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors">
            <UserPlus className="w-4 h-4" /> Tạo tài khoản Expert
          </button>
        </div>
      </div>

      <div className="flex border-b border-zinc-200 gap-4 sm:gap-8 text-sm sm:text-base font-bold overflow-x-auto">
        {[
          { id: "all", label: "Tất cả" },
          { id: "student", label: "Học viên (Student)" },
          { id: "expert", label: "Chuyên gia (Expert)" },
          { id: "admin", label: "Quản trị viên (Admin)" },
        ].map((tab) => (
          <button key={tab.id} onClick={() => { setSelectedRole(tab.id); setPage(1); }} className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${selectedRole === tab.id ? "border-[#932120] text-[#932120]" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden w-full">
        <div className="p-4 sm:p-5 border-b border-zinc-200 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-zinc-50/50">
          <div className="relative w-full md:max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input type="text" placeholder="Tìm kiếm email, họ tên..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 pr-4 py-2.5 border border-zinc-300 rounded-xl text-sm text-zinc-900 bg-white placeholder:text-zinc-400 font-medium focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120] w-full" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs sm:text-sm font-semibold text-zinc-700 bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-lg">Tổng: {total}</span>
            <span className="text-xs sm:text-sm font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">Hoạt động: {activeCount}</span>
            <span className="text-xs sm:text-sm font-semibold text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">Bị khóa: {bannedCount}</span>
          </div>
        </div>

        <UserTable users={users} loading={loading} currentUserId={currentUser?.id} resendingId={resendingId} onToggleStatus={handleToggleStatus} onResendInvite={handleResendInvite} />
        <UserPagination page={page} pageSize={pageSize} total={total} loading={loading} onPageChange={setPage} onPageSizeChange={(newSize) => { setPageSize(newSize); setPage(1); }} />
      </div>

      <UserCreateModal isOpen={isModalOpen} initialRole={modalRole} onClose={() => setIsModalOpen(false)} onSuccess={() => { setIsModalOpen(false); fetchUsers(); }} />
    </div>
  );
}
