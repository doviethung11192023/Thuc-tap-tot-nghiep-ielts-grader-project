"use client";

import React from 'react';
import Link from 'next/link';
import { BookOpen, LayoutDashboard, Library, User, LogOut } from 'lucide-react';
import { AuthGuard } from '@/components/guards/AuthGuard';
import { useAuth } from '@/hooks/useAuth';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useGradingNotifications } from '@/hooks/useGradingNotifications';
import { usePathname, useRouter } from 'next/navigation';

export function StudentPageLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  useGradingNotifications();

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');
  
  // --- [MÃ MỚI BỞI AGENT] ---
  const isWorkspace = 
    pathname?.includes('/test-practice/reading/') || 
    pathname?.includes('/test-practice/listening/') || 
    pathname?.includes('/test-practice/writing/') || 
    pathname?.includes('/test-practice/speaking/') ||
    pathname?.startsWith('/results/');
  // ---------------------------

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  const initials = (user?.full_name || user?.email || 'U').substring(0, 2).toUpperCase();

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
              <Link 
                href="/profile"
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-xs font-bold text-white border border-white/30 transition-colors"
                title={user?.full_name || user?.email || 'Hồ sơ cá nhân'}
              >
                {initials}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className={`flex-1 flex w-full mx-auto ${isWorkspace ? 'p-1.5 sm:p-2 overflow-hidden' : 'sm:px-6 lg:px-8'}`}>
        {/* Sidebar */}
        {/* --- [MÃ GỐC BỊ THAY THẾ] ---
        <aside className="w-64 py-8 hidden md:block pr-8 border-r border-zinc-200">
        --------------------------- */}
        {/* --- [MÃ MỚI BỞI AGENT] --- */}
        {!isWorkspace && (
          <aside className="w-64 py-8 hidden md:block pr-8 border-r border-zinc-200 shrink-0">
        {/* --------------------------- */}

          <nav className="space-y-2">
            {user?.role === 'admin' && (
              <div className="mb-6">
                <Link href="/admin/statistics" className="flex items-center gap-3 px-4 py-3 text-[#932120] bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors font-bold shadow-sm">
                  <LayoutDashboard className="w-5 h-5" />
                  Về trang Quản trị
                </Link>
              </div>
            )}
            {user?.role === 'expert' && (
              <div className="mb-6">
                <Link href="/expert/profile" className="flex items-center gap-3 px-4 py-3 text-purple-800 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors font-bold shadow-sm">
                  <BookOpen className="w-5 h-5 text-purple-700" />
                  Cổng Chuyên gia
                </Link>
              </div>
            )}
            <Link href="/dashboard" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${isActive('/dashboard') ? 'bg-[#932120] text-white shadow-md' : 'text-zinc-700 hover:bg-zinc-100'}`}>
              <LayoutDashboard className={`w-5 h-5 ${isActive('/dashboard') ? 'text-red-200' : 'text-zinc-400'}`} />
              Dashboard
            </Link>
            {/* --- [MÃ MỚI BỞI AGENT: Thêm link cho 2 trang mới] --- */}
            <Link href="/learning-profile" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${isActive('/learning-profile') ? 'bg-[#932120] text-white shadow-md' : 'text-zinc-700 hover:bg-zinc-100'}`}>
              <LayoutDashboard className={`w-5 h-5 ${isActive('/learning-profile') ? 'text-red-200' : 'text-zinc-400'}`} />
              Learning Profile
            </Link>
            <Link href="/test-practice" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${isActive('/test-practice') ? 'bg-[#932120] text-white shadow-md' : 'text-zinc-700 hover:bg-zinc-100'}`}>
              <Library className={`w-5 h-5 ${isActive('/test-practice') ? 'text-red-200' : 'text-zinc-400'}`} />
              Test Practice
            </Link>
            {/* --------------------------- */}
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
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium text-left"
            >
              <LogOut className="w-5 h-5" />
              Đăng xuất
            </button>
          </div>
        </aside>
        )}
        {/* --- [MÃ MỚI BỞI AGENT: Đóng ngoặc điều kiện aside] --- */}
        {/* --------------------------- */}

        {/* Main Content */}
        {/* --- [MÃ GỐC BỊ THAY THẾ] ---
        <main className="flex-1 py-8 px-4 sm:px-0 md:pl-8">
        --------------------------- */}
        {/* --- [MÃ MỚI BỞI AGENT] --- */}
        <main className={`flex-1 flex flex-col ${isWorkspace ? 'p-0 w-full max-w-full overflow-hidden' : 'py-8 px-4 sm:px-0 md:pl-8'}`}>
        {/* --------------------------- */}
          {children}
        </main>
      </div>
      </div>
    </AuthGuard>
  );
}
