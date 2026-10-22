"use client";

import React from "react";
import { Menu, ShieldCheck } from "lucide-react";
import type { User } from "@/types";

interface AdminHeaderProps {
  user: User;
  onOpenMobile: () => void;
}

export function AdminHeader({ user, onOpenMobile }: AdminHeaderProps) {
  const initials = (user.full_name || user.email || "AD")
    .substring(0, 2)
    .toUpperCase();

  return (
    <header className="h-16 bg-white border-b border-zinc-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 shadow-xs shrink-0 w-full">
      {/* Left: Hamburger menu for mobile/tablet + Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobile}
          className="lg:hidden p-2 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
          aria-label="Mở menu quản trị"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 truncate">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <h2 className="text-xs sm:text-sm font-semibold text-zinc-600 truncate">
            Hệ thống Quản trị Nền tảng IELTS Writing & 4 Kỹ năng
          </h2>
        </div>
      </div>

      {/* Right: User Information Chip */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right hidden sm:block">
          <div className="text-xs sm:text-sm font-bold text-zinc-900 flex items-center justify-end gap-1.5">
            <span>{user.full_name || "Quản trị viên"}</span>
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-[11px] text-zinc-400 font-medium">{user.email}</div>
        </div>

        <div
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#932120]/10 text-[#932120] flex items-center justify-center font-extrabold text-xs sm:text-sm border border-[#932120]/20 shadow-xs select-none"
          title={`${user.full_name || "Admin"} (${user.email})`}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
