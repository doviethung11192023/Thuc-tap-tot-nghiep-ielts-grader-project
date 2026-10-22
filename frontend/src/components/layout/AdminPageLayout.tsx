"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldAlert, Loader2, ArrowRight, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { AdminHeader } from "@/components/layout/AdminHeader";

export function AdminPageLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  // 1. Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#932120]" />
          <span className="text-sm font-medium text-zinc-500">Đang xác thực quyền Quản trị...</span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated state
  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-[#932120]">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900">Yêu cầu đăng nhập Quản trị</h1>
        <p className="text-zinc-600 mt-2 max-w-md text-sm">
          Bạn cần đăng nhập bằng tài khoản có vai trò Quản trị viên (Admin) để truy cập cổng này.
        </p>
        <div className="mt-6">
          <Link
            href="/login"
            className="px-6 py-2.5 bg-[#932120] text-white rounded-lg text-sm font-bold hover:bg-[#7a1a19] transition-colors inline-flex items-center gap-2"
          >
            Đăng nhập ngay <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // 3. Unauthorized role (e.g. Expert or Student)
  if (user.role !== "admin") {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4 text-[#932120] shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900">403 Forbidden - Quyền truy cập bị từ chối</h1>
        <p className="text-zinc-600 mt-2 max-w-md text-sm">
          Khu vực này chỉ dành riêng cho <strong>Quản trị viên (Admin)</strong>. Tài khoản hiện tại của bạn không có quyền thực thi tác vụ quản trị.
        </p>
        
        <div className="mt-4 p-4 bg-white rounded-xl border border-zinc-200 text-left text-xs space-y-2 w-full max-w-md shadow-sm">
          <div className="flex justify-between items-center py-1 border-b border-zinc-100">
            <span className="text-zinc-500">Email đang đăng nhập:</span>
            <span className="font-semibold text-zinc-900">{user.email}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-zinc-500">Vai trò hiện tại:</span>
            <span className="px-2 py-0.5 rounded font-bold uppercase text-[10px] bg-amber-100 text-amber-800">
              {user.role === "expert" ? "Chuyên gia (Expert)" : user.role === "student" ? "Học viên (Student)" : user.role}
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button 
            onClick={handleLogout}
            className="px-5 py-2.5 bg-[#932120] text-white rounded-lg text-sm font-bold hover:bg-[#7a1a19] transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <LogOut className="w-4 h-4" /> Đăng xuất để đổi tài khoản Admin
          </button>
          {user.role === "expert" ? (
            <Link 
              href="/expert/profile" 
              className="px-5 py-2.5 bg-zinc-200 text-zinc-800 rounded-lg text-sm font-bold hover:bg-zinc-300 transition-colors flex items-center justify-center gap-2"
            >
              Về Cổng Chuyên gia <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link 
              href="/history" 
              className="px-5 py-2.5 bg-zinc-200 text-zinc-800 rounded-lg text-sm font-bold hover:bg-zinc-300 transition-colors flex items-center justify-center gap-2"
            >
              Về Cổng Học viên <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    );
  }

  // 4. Authorized Admin Portal Layout (Full-Width Responsive)
  return (
    <div className="min-h-screen bg-zinc-100 font-sans flex w-full">
      {/* Red Sidebar */}
      <AdminSidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {/* Top Header */}
        <AdminHeader
          user={user}
          onOpenMobile={() => setIsMobileOpen(true)}
        />

        {/* Page Content: 100% Full-Width without restrictive max-w */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto w-full">
          <div className="w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
