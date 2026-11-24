// Lucian UX/UI Prompt #046 inspired · Command Palette (MIT adapted for MoonLab IELTS)
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Command } from "cmdk";
import { usePathname, useRouter } from "next/navigation";
import { m, AnimatePresence } from "motion/react";
import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  FileText,
  GraduationCap,
  History,
  LayoutDashboard,
  Library,
  Search,
  Settings,
  ShieldCheck,
  Terminal,
  User,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const COMMAND_PALETTE_OPEN_EVENT = "moonlab:open-command-palette";

/** Programmatically open the global Ctrl+K / Cmd+K Command Palette from any header button. */
export function openCommandPalette() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(COMMAND_PALETTE_OPEN_EVENT));
  }
}

interface PaletteCommand {
  id: string;
  label: string;
  group: string;
  href: string;
  keywords: string[];
  icon: React.ReactNode;
}

export function GlobalCommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  const isInExamRoom = Boolean(
    pathname?.includes("/test-practice/reading/") ||
      pathname?.includes("/test-practice/listening/") ||
      pathname?.includes("/test-practice/writing/") ||
      pathname?.includes("/test-practice/speaking/")
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        if (isInExamRoom) return;
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    const onOpenEvt = () => {
      if (!isInExamRoom) setOpen(true);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(COMMAND_PALETTE_OPEN_EVENT, onOpenEvt);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(COMMAND_PALETTE_OPEN_EVENT, onOpenEvt);
    };
  }, [isInExamRoom]);

  useEffect(() => {
    if (open) {
      setSearch("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const commands = useMemo<PaletteCommand[]>(() => {
    const items: PaletteCommand[] = [
      {
        id: "learning-profile",
        label: "Hồ sơ năng lực & Lộ trình cá nhân",
        group: "Cổng Học viên",
        href: "/learning-profile",
        keywords: ["learning profile", "roadmap", "streak", "band", "tong quan"],
        icon: <LayoutDashboard className="w-4 h-4 text-[#932120]" />,
      },
      {
        id: "test-practice",
        label: "Kho đề thi IELTS 4 kỹ năng",
        group: "Cổng Học viên",
        href: "/test-practice",
        keywords: ["test", "de thi", "reading", "listening", "writing", "speaking", "luyen de"],
        icon: <Library className="w-4 h-4 text-[#932120]" />,
      },
      {
        id: "practice-history",
        label: "Lịch sử luyện đề & Phân tích dạng bài",
        group: "Cổng Học viên",
        href: "/test-practice/history",
        keywords: ["history", "lich su", "radar", "diem so"],
        icon: <History className="w-4 h-4 text-emerald-700" />,
      },
      {
        id: "writing-history",
        label: "Lịch sử bài thi Writing",
        group: "Cổng Học viên",
        href: "/history",
        keywords: ["writing", "essay", "bai viet"],
        icon: <FileText className="w-4 h-4 text-amber-700" />,
      },
      {
        id: "profile",
        label: "Hồ sơ tài khoản & Mục tiêu Band",
        group: "Cổng Học viên",
        href: "/profile",
        keywords: ["profile", "target", "password", "voice consent"],
        icon: <User className="w-4 h-4 text-zinc-600" />,
      },
    ];

    if (user?.role === "expert" || user?.role === "admin") {
      items.push(
        {
          id: "expert-profile",
          label: "Hồ sơ Chuyên gia & Chỉ số RPS 30 ngày",
          group: "Cổng Chuyên gia",
          href: "/expert/profile",
          keywords: ["expert", "rps", "chuyen gia", "sla"],
          icon: <GraduationCap className="w-4 h-4 text-[#932120]" />,
        },
        {
          id: "expert-assignments",
          label: "Danh sách bài chấm & SLA 48h",
          group: "Cổng Chuyên gia",
          href: "/expert/assignments",
          keywords: ["assignments", "cham bai", "pending", "deadline"],
          icon: <ClipboardCheck className="w-4 h-4 text-emerald-700" />,
        }
      );
    }

    if (user?.role === "admin") {
      items.push(
        {
          id: "admin-stats",
          label: "Thống kê Hệ thống & AI Metrics",
          group: "Quản trị Hệ thống",
          href: "/admin/statistics",
          keywords: ["admin", "statistics", "ai health", "cohort", "kpi"],
          icon: <BarChart3 className="w-4 h-4 text-[#932120]" />,
        },
        {
          id: "admin-reviews",
          label: "Điều phối bài chấm Chuyên gia",
          group: "Quản trị Hệ thống",
          href: "/admin/reviews",
          keywords: ["reviews", "dispatch", "phan bo", "chuyen gia"],
          icon: <ShieldCheck className="w-4 h-4 text-amber-700" />,
        },
        {
          id: "admin-tests",
          label: "Quản lý Ngân hàng đề thi (72 đề)",
          group: "Quản trị Hệ thống",
          href: "/admin/tests",
          keywords: ["tests", "cms", "de thi", "publish", "draft"],
          icon: <BookOpen className="w-4 h-4 text-emerald-700" />,
        },
        {
          id: "admin-users",
          label: "Quản lý Người dùng & Minh chứng",
          group: "Quản trị Hệ thống",
          href: "/admin/users",
          keywords: ["users", "tai khoan", "audit"],
          icon: <Users className="w-4 h-4 text-sky-700" />,
        },
        {
          id: "admin-logs",
          label: "Nhật ký Hàng đợi & Lỗi AI",
          group: "Quản trị Hệ thống",
          href: "/admin/logs",
          keywords: ["logs", "errors", "retry", "arq"],
          icon: <Terminal className="w-4 h-4 text-zinc-700" />,
        },
        {
          id: "admin-settings",
          label: "Cấu hình Hệ thống & Bảng quy đổi Band",
          group: "Quản trị Hệ thống",
          href: "/admin/settings",
          keywords: ["settings", "config", "band conversion", "ai tutor"],
          icon: <Settings className="w-4 h-4 text-zinc-700" />,
        }
      );
    }

    return items;
  }, [user?.role]);

  const groups = useMemo(() => {
    const map = new Map<string, PaletteCommand[]>();
    for (const cmd of commands) {
      const list = map.get(cmd.group) ?? [];
      list.push(cmd);
      map.set(cmd.group, list);
    }
    return Array.from(map.entries());
  }, [commands]);

  const handleSelect = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[110] flex items-start justify-center pt-[12vh] px-4"
          onClick={() => setOpen(false)}
        >
          <m.div
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-zinc-950/45 backdrop-blur-[2px]"
          />
          <m.div
            role="dialog"
            aria-modal="true"
            aria-label="Điều hướng nhanh MoonLab"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--ux-line-2)] bg-[var(--ux-surface)] shadow-2xl"
          >
            <Command label="Điều hướng nhanh MoonLab" className="ux flex flex-col">
              <div className="flex items-center gap-2.5 border-b border-[var(--ux-line)] px-4 h-13">
                <Search className="w-4 h-4 text-[var(--ux-ink-3)] shrink-0" />
                <Command.Input
                  ref={inputRef}
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Tìm nhanh trang, kho đề, lịch sử, cổng chuyên gia..."
                  className="flex-1 bg-transparent text-sm font-medium text-[var(--ux-ink)] placeholder:text-[var(--ux-ink-3)] outline-none border-0 h-full"
                />
                <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-[var(--ux-surface-2)] border border-[var(--ux-line)] text-[11px] font-bold text-[var(--ux-ink-3)]">
                  ESC
                </kbd>
              </div>

              <Command.List className="max-h-[340px] overflow-y-auto p-2 custom-scrollbar">
                <Command.Empty className="py-10 text-center text-xs font-medium text-[var(--ux-ink-3)]">
                  Không tìm thấy mục phù hợp với &ldquo;{search}&rdquo;.
                </Command.Empty>

                {groups.map(([groupName, groupItems]) => (
                  <Command.Group
                    key={groupName}
                    heading={groupName}
                    className="px-1 py-1 [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-extrabold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[var(--ux-ink-3)]"
                  >
                    {groupItems.map((item) => (
                      <Command.Item
                        key={item.id}
                        value={`${item.label} ${item.keywords.join(" ")}`}
                        onSelect={() => handleSelect(item.href)}
                        className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-semibold text-[var(--ux-ink-2)] cursor-pointer transition-colors aria-selected:bg-[var(--ux-accent-soft)] aria-selected:text-[var(--ux-ink)]"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--ux-surface-2)] border border-[var(--ux-line)]">
                          {item.icon}
                        </span>
                        <span className="flex-1 truncate">{item.label}</span>
                        {pathname === item.href && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-[#932120] border border-rose-200">
                            Đang mở
                          </span>
                        )}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>

              <div className="flex items-center justify-between border-t border-[var(--ux-line)] bg-[var(--ux-surface-2)]/60 px-4 py-2 text-[11px] font-medium text-[var(--ux-ink-3)]">
                <span>↑↓ Di chuyển · ↵ Mở trang</span>
                <span>Ctrl / ⌘ + K</span>
              </div>
            </Command>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}
