"use client";

import React from "react";
import { Menu, Search, ShieldCheck } from "lucide-react";
import type { User } from "@/types";
import { openCommandPalette } from "@/components/ui/command-palette";

interface AdminHeaderProps {
  user: User;
  onOpenMobile: () => void;
}

export function AdminHeader({ user, onOpenMobile }: AdminHeaderProps) {
  const initials = (user.full_name || user.email || "AD")
    .substring(0, 2)
    .toUpperCase();

  return (
    <header className="h-16 bg-[var(--ux-glass)] backdrop-blur-md border-b border-[var(--ux-line)] px-4 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 shadow-2xs shrink-0 w-full">
      {/* Left: Hamburger menu for mobile/tablet + Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobile}
          className="lg:hidden p-2 rounded-xl text-[var(--ux-ink-2)] hover:text-[var(--ux-ink)] hover:bg-[var(--ux-surface-2)] transition-colors cursor-pointer"
          aria-label="Mở menu quản trị"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 truncate">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <h2 className="text-xs sm:text-sm font-semibold text-[var(--ux-ink-2)] truncate">
            Hệ thống Quản trị Nền tảng IELTS Writing &amp; 4 Kỹ năng
          </h2>
        </div>
      </div>

      {/* Right: Quick Command Palette + User Information Chip */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={openCommandPalette}
          aria-label="Mở bảng tìm nhanh (Ctrl+K)"
          className="inline-flex items-center gap-2 h-9 px-3 rounded-xl bg-[var(--ux-surface-2)] hover:bg-[var(--ux-surface-3)] border border-[var(--ux-line)] text-xs font-semibold text-[var(--ux-ink-2)] transition-colors cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 text-[#932120]" />
          <span className="hidden sm:inline">Tìm nhanh...</span>
          <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded bg-[var(--ux-surface)] border border-[var(--ux-line)] text-[10px] font-mono font-bold text-[var(--ux-ink-3)]">
            Ctrl K
          </kbd>
        </button>

        <div className="text-right hidden sm:block">
          <div className="text-xs sm:text-sm font-bold text-[var(--ux-ink)] flex items-center justify-end gap-1.5">
            <span>{user.full_name || "Quản trị viên"}</span>
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-[11px] text-[var(--ux-ink-3)] font-medium">{user.email}</div>
        </div>

        <div
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#932120]/10 text-[#932120] flex items-center justify-center font-extrabold text-xs sm:text-sm border border-[#932120]/20 shadow-2xs select-none"
          title={`${user.full_name || "Admin"} (${user.email})`}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
