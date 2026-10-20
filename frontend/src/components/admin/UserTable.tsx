import React from "react";
import {
  Loader2,
  ShieldCheck,
  GraduationCap,
  User as UserIcon,
  CheckCircle2,
  Clock,
  Mail,
  UserCheck,
  UserX,
} from "lucide-react";
import { User } from "@/types";

interface UserTableProps {
  users: User[];
  loading: boolean;
  currentUserId?: string;
  resendingId: string | null;
  onToggleStatus: (targetUser: User) => void;
  onResendInvite: (targetUser: User) => void;
}

export function UserTable({
  users,
  loading,
  currentUserId,
  resendingId,
  onToggleStatus,
  onResendInvite,
}: UserTableProps) {
  const roleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <ShieldCheck className="w-3.5 h-3.5" /> Admin
          </span>
        );
      case "expert":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-[#932120]/10 text-[#932120] border border-[#932120]/20">
            <GraduationCap className="w-3.5 h-3.5 text-[#932120]" /> Expert
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
            <UserIcon className="w-3.5 h-3.5" /> Student
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-72">
        <Loader2 className="w-8 h-8 animate-spin text-[#932120]" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto min-h-[300px] w-full">
      <table className="w-full text-left border-collapse min-w-[760px]">
        <thead>
          <tr className="bg-zinc-50 border-b border-zinc-200 text-xs sm:text-sm uppercase tracking-wider text-zinc-500 font-bold">
            <th className="px-6 py-4">Người dùng</th>
            <th className="px-6 py-4">Vai trò</th>
            <th className="px-6 py-4 text-center">Kích hoạt</th>
            <th className="px-6 py-4 text-center">Trạng thái</th>
            <th className="px-6 py-4">Ngày tham gia</th>
            <th className="px-6 py-4 text-center w-36">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {users.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 text-sm">
                Không tìm thấy người dùng nào phù hợp
              </td>
            </tr>
          ) : (
            users.map((u) => (
              <tr key={u.id} className="hover:bg-zinc-50/70 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-sm font-bold text-zinc-700 shrink-0">
                      {(u.full_name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm sm:text-base font-bold text-zinc-900">{u.full_name || "Chưa đặt tên"}</div>
                      <div className="text-xs sm:text-sm text-zinc-500">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">{roleBadge(u.role)}</td>
                <td className="px-6 py-4 text-center">
                  {u.is_activated !== false ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Đã kích hoạt
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      <Clock className="w-3.5 h-3.5 text-amber-600" /> Chờ kích hoạt
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded text-xs font-bold ${
                      u.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {u.is_active ? "Active" : "Locked"}
                  </span>
                </td>
                <td className="px-6 py-4 text-xs sm:text-sm text-zinc-600 whitespace-nowrap">
                  {new Date(u.created_at).toLocaleDateString("vi-VN")}
                </td>
                <td className="px-6 py-4 text-center w-36">
                  <div className="flex items-center justify-center">
                    {currentUserId === u.id ? (
                      <span className="px-2.5 py-1 text-xs font-semibold text-zinc-400 bg-zinc-100 rounded-lg border border-zinc-200/60 inline-flex items-center">
                        Tài khoản này
                      </span>
                    ) : (
                      <div className="inline-flex items-center gap-2">
                        {u.is_activated === false ? (
                          <button
                            onClick={() => onResendInvite(u)}
                            disabled={resendingId === u.id}
                            className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-blue-600 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 border border-blue-200 transition-all shadow-2xs disabled:opacity-50"
                            title="Gửi lại thư mời kích hoạt"
                          >
                            {resendingId === u.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                            ) : (
                              <Mail className="w-4 h-4" />
                            )}
                          </button>
                        ) : (
                          <div className="w-8 h-8" aria-hidden="true" />
                        )}
                        <button
                          onClick={() => onToggleStatus(u)}
                          className={`w-8 h-8 rounded-lg inline-flex items-center justify-center transition-all shadow-2xs ${
                            u.is_active
                              ? "text-red-600 bg-red-50 hover:bg-red-100 border border-red-200"
                              : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
                          }`}
                          title={u.is_active ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                        >
                          {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
