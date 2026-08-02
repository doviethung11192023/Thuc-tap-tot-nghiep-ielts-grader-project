"use client";

import React from 'react';
import Link from 'next/link';
import { BookOpen, LayoutDashboard, Library, User, LogOut } from 'lucide-react';
import { AuthGuard } from '@/components/guards/AuthGuard';
import { useAuth } from '@/hooks/useAuth';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useGradingNotifications } from '@/hooks/useGradingNotifications';
import { usePathname } from 'next/navigation';

export function StudentPageLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  useGradingNotifications();

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');

  return (
    <AuthGuard>
      <div className="min-h-screen bg-zinc-50 font-sans flex flex-col">
      {/* Top Navigation */}
      <header className="bg-[#932120] text-white shadow-md sticky top-0 z-50">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-white p-1.5 rounded-md">
                <BookOpen className="w-6 h-6 text-[#932120]" />
              </div>
              <span className="font-bold text-lg tracking-wider hidden sm:block">
                HỌC VIỆN CÔNG NGHỆ BƯU CHÍNH VIỄN THÔNG
              </span>
              <span className="font-bold text-lg tracking-wider sm:hidden">
                PTIT
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium hidden md:block">Student Portal</span>
              <NotificationBell />
              <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center text-sm font-bold cursor-pointer hover:bg-white/40 transition-colors">
                <User className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex w-full mx-auto sm:px-6 lg:px-8">
        {/* Sidebar */}
        <aside className="w-64 py-8 hidden md:block pr-8 border-r border-zinc-200">
          <nav className="space-y-2">
            {user?.role === 'admin' && (
              <div className="mb-6">
                <Link href="/admin/statistics" className="flex items-center gap-3 px-4 py-3 text-[#932120] bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors font-bold shadow-sm">
                  <LayoutDashboard className="w-5 h-5" />
                  Về trang Quản trị
                </Link>
              </div>
            )}
            <Link href="/dashboard" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${isActive('/dashboard') ? 'bg-[#932120] text-white shadow-md' : 'text-zinc-700 hover:bg-zinc-100'}`}>
              <LayoutDashboard className={`w-5 h-5 ${isActive('/dashboard') ? 'text-red-200' : 'text-zinc-400'}`} />
              Dashboard
            </Link>
            <Link href="/topics" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${isActive('/topics') ? 'bg-[#932120] text-white shadow-md' : 'text-zinc-700 hover:bg-zinc-100'}`}>
              <Library className={`w-5 h-5 ${isActive('/topics') ? 'text-red-200' : 'text-zinc-400'}`} />
              Ngân hàng đề thi
            </Link>
            <Link href="/history" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${isActive('/history') ? 'bg-[#932120] text-white shadow-md' : 'text-zinc-700 hover:bg-zinc-100'}`}>
              <BookOpen className={`w-5 h-5 ${isActive('/history') ? 'text-red-200' : 'text-zinc-400'}`} />
              Lịch sử làm bài
            </Link>
            <Link href="/profile" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${isActive('/profile') ? 'bg-[#932120] text-white shadow-md' : 'text-zinc-700 hover:bg-zinc-100'}`}>
              <User className={`w-5 h-5 ${isActive('/profile') ? 'text-red-200' : 'text-zinc-400'}`} />
              Hồ sơ cá nhân
            </Link>
          </nav>
          <div className="mt-8 pt-8 border-t border-zinc-200">
            <Link href="/login" className="flex items-center gap-3 px-4 py-3 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium">
              <LogOut className="w-5 h-5" />
              Đăng xuất
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 py-8 px-4 sm:px-0 md:pl-8">
          {children}
        </main>
      </div>
      </div>
    </AuthGuard>
  );
}
