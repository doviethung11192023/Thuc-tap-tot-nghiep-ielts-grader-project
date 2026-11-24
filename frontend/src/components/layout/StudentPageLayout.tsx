"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BookOpen, LayoutDashboard, Library, User, LogOut, Menu, Search } from "lucide-react";
import { m } from "motion/react";
import { AuthGuard } from "@/components/guards/AuthGuard";
import { useAuth } from "@/hooks/useAuth";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { HeaderStreakPill } from "@/components/layout/HeaderStreakPill";
import { openCommandPalette } from "@/components/ui/command-palette";
import { MobileDrawer } from "@/components/ui/mobile-drawer";
import { usePathname, useRouter } from "next/navigation";

export function StudentPageLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + "/");

  // RD-05: Ẩn Header & Sidebar trong phòng thi (trừ trang /summary cần header + scroll tự nhiên)
  const isSummary = pathname?.includes("/summary");
  const isWorkspace =
    !isSummary &&
    (pathname?.includes("/test-practice/reading/") ||
      pathname?.includes("/test-practice/listening/") ||
      pathname?.includes("/test-practice/writing/") ||
      pathname?.includes("/test-practice/speaking/") ||
      pathname?.startsWith("/results/"));

  const handleLogout = async () => {
    setMobileMenuOpen(false);
    await signOut();
    router.push("/login");
  };

  const initials = (user?.full_name || user?.email || "U").substring(0, 2).toUpperCase();

  const navItems = [
    { href: "/learning-profile", label: "Learning Profile", icon: LayoutDashboard },
    { href: "/test-practice", label: "Test Practice", icon: Library },
    { href: "/profile", label: "Hồ sơ cá nhân", icon: User },
  ];

  const renderSidebarNav = (mobile = false) => (
    <>
      <nav className="space-y-1.5" aria-label="Điều hướng Học viên">
        {user?.role === "admin" && (
          <div className="mb-5">
            <Link
              href="/admin/statistics"
              onClick={() => mobile && setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-[#932120] bg-rose-50 border border-rose-200 rounded-xl hover:bg-rose-100 transition-colors font-bold shadow-2xs"
            >
              <LayoutDashboard className="w-5 h-5" />
              Về trang Quản trị
            </Link>
          </div>
        )}
        {user?.role === "expert" && (
          <div className="mb-5">
            <Link
              href="/expert/profile"
              onClick={() => mobile && setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-amber-800 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors font-bold shadow-2xs"
            >
              <BookOpen className="w-5 h-5 text-amber-700" />
              Cổng Chuyên gia
            </Link>
          </div>
        )}
        {navItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => mobile && setMobileMenuOpen(false)}
              className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-semibold text-sm ${
                active ? "text-white" : "text-[var(--ux-ink-2)] hover:bg-[var(--ux-surface-2)] hover:text-[var(--ux-ink)]"
              }`}
            >
              {active && !mobile && (
                <m.div
                  layoutId="student-nav-active"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  className="absolute inset-0 rounded-xl bg-[#932120] shadow-md -z-10"
                />
              )}
              {active && mobile && <span className="absolute inset-0 rounded-xl bg-[#932120] shadow-sm -z-10" />}
              <Icon className={`w-5 h-5 relative z-10 ${active ? "text-red-100" : "text-[var(--ux-ink-3)]"}`} />
              <span className="relative z-10">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-8 pt-6 border-t border-[var(--ux-line)]">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-red-600 rounded-xl hover:bg-red-50 transition-colors font-semibold text-sm text-left cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          Đăng xuất
        </button>
      </div>
    </>
  );

  return (
    <AuthGuard>
      <div className={`min-h-screen bg-[var(--ux-page)] font-sans flex flex-col ${isWorkspace ? "h-screen overflow-hidden" : ""}`}>
        {!isWorkspace && (
          <header className="bg-[#932120] text-white shadow-md sticky top-0 z-50 border-b border-black/10">
            <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16 gap-3">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(true)}
                    aria-label="Mở menu điều hướng"
                    className="lg:hidden p-2 -ml-1 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                  <Link href="/learning-profile" className="flex items-center gap-3">
                    <div className="bg-white p-1.5 rounded-lg shadow-2xs">
                      <BookOpen className="w-5 h-5 text-[#932120]" />
                    </div>
                    <span className="font-extrabold text-lg tracking-wide">MoonLab</span>
                  </Link>
                </div>

                <div className="flex items-center gap-2.5 sm:gap-3.5">
                  <button
                    type="button"
                    onClick={openCommandPalette}
                    aria-label="Mở bảng tìm nhanh (Ctrl+K)"
                    className="inline-flex items-center gap-2 h-9 px-2.5 sm:px-3.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Tìm nhanh...</span>
                    <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded bg-black/20 text-[10px] font-mono font-bold text-red-100">
                      Ctrl K
                    </kbd>
                  </button>

                  <span className="text-xs font-semibold text-red-100/90 hidden xl:block">Student Portal</span>
                  <HeaderStreakPill />
                  <NotificationBell />
                  <Link
                    href="/profile"
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-xs font-bold text-white border border-white/30 transition-colors"
                    title={user?.full_name || user?.email || "Hồ sơ cá nhân"}
                  >
                    {initials}
                  </Link>
                </div>
              </div>
            </div>
          </header>
        )}

        <MobileDrawer
          open={mobileMenuOpen}
          onOpenChange={setMobileMenuOpen}
          direction="left"
          title="MoonLab IELTS"
          description="Điều hướng Cổng Học viên"
        >
          {renderSidebarNav(true)}
        </MobileDrawer>

        <div className={`flex-1 flex w-full mx-auto ${isWorkspace ? "p-0 overflow-hidden" : "sm:px-6 lg:px-8"}`}>
          {!isWorkspace && (
            <aside className="w-56 xl:w-64 py-6 hidden lg:block pr-5 xl:pr-8 border-r border-[var(--ux-line)] shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
              {renderSidebarNav(false)}
            </aside>
          )}

          <main className={`flex-1 min-w-0 flex flex-col w-full ${isWorkspace ? "p-0 max-w-full overflow-hidden" : "py-6 lg:py-8 px-4 sm:px-0 lg:pl-6 xl:pl-8"}`}>
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
