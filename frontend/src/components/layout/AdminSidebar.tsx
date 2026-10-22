"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  BookOpen, 
  Users, 
  Library, 
  Activity, 
  BarChart, 
  LogOut, 
  FileText,
  Sliders,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

interface AdminSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
}

export function AdminSidebar({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onLogout
}: AdminSidebarProps) {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + "/");

  const navItems = [
    { href: "/admin/statistics", label: "Thống kê", icon: BarChart },
    { href: "/admin/tests", label: "Đề thi 4 Kỹ năng", icon: FileText },
    { href: "/admin/topics", label: "Chủ đề Writing", icon: Library },
    { href: "/admin/users", label: "Quản lý Học viên", icon: Users },
    { href: "/admin/settings", label: "Dữ liệu Lõi & Cài đặt", icon: Sliders },
    { href: "/admin/logs", label: "Hệ thống Logs", icon: Activity },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full select-none">
      {/* Brand Header */}
      <div className={`p-5 flex items-center border-b border-white/10 ${isCollapsed ? "justify-center" : "justify-between"}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="bg-white/20 p-2 rounded-xl shrink-0 shadow-xs">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <div className="truncate">
              <div className="font-extrabold text-white tracking-wider text-base leading-tight truncate">
                PTIT IELTS
              </div>
              <div className="text-[10px] text-red-200 uppercase tracking-widest font-bold mt-0.5">
                Admin Portal
              </div>
            </div>
          )}
        </div>
        
        {/* Mobile Close Button */}
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 text-red-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Đóng menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              title={isCollapsed ? item.label : undefined}
              className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl transition-all group ${
                active 
                  ? "bg-white text-[#932120] font-bold shadow-sm" 
                  : "text-red-100 hover:bg-white/10 hover:text-white font-medium"
              } ${isCollapsed ? "justify-center" : ""}`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${active ? "text-[#932120]" : "text-red-200 group-hover:text-white"}`} />
              {!isCollapsed && <span className="text-sm truncate">{item.label}</span>}
            </Link>
          );
        })}

        {/* Student Experience Bridge */}
        <div className="my-4 border-t border-white/10 pt-4">
          <Link
            href="/history"
            onClick={onCloseMobile}
            title={isCollapsed ? "Trải nghiệm Học viên" : undefined}
            className={`flex items-center gap-3.5 px-3 py-2.5 rounded-xl bg-white/10 text-white hover:bg-white hover:text-[#932120] transition-all shadow-xs group ${
              isCollapsed ? "justify-center" : ""
            }`}
          >
            <BookOpen className="w-5 h-5 shrink-0 text-red-200 group-hover:text-[#932120]" />
            {!isCollapsed && <span className="font-bold text-sm truncate">Trải nghiệm Học viên</span>}
          </Link>
        </div>
      </nav>

      {/* Footer Actions: Collapse Toggle + Logout */}
      <div className="p-3 border-t border-white/10 space-y-1.5">
        <button
          onClick={onToggleCollapse}
          className={`hidden lg:flex w-full items-center gap-3 px-3 py-2 text-xs font-semibold text-red-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors ${
            isCollapsed ? "justify-center" : ""
          }`}
          title={isCollapsed ? "Mở rộng thanh menu" : "Thu gọn thanh menu"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!isCollapsed && <span>Thu gọn sidebar</span>}
        </button>

        <button
          onClick={onLogout}
          title={isCollapsed ? "Đăng xuất" : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-200 hover:text-white hover:bg-white/10 transition-colors group ${
            isCollapsed ? "justify-center" : ""
          }`}
        >
          <LogOut className="w-5 h-5 shrink-0 text-red-200 group-hover:text-white" />
          {!isCollapsed && <span className="text-sm font-semibold truncate">Đăng xuất</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Persistent Sidebar */}
      <aside
        className={`hidden lg:flex flex-col h-screen sticky top-0 bg-[#932120] text-red-100 border-r border-[#7a1a19] shadow-xl shrink-0 transition-all duration-300 z-30 ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* 2. Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
        />
      )}

      {/* 3. Mobile Slide-over Drawer */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-[#932120] text-red-100 shadow-2xl transition-transform duration-300 ease-in-out ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
