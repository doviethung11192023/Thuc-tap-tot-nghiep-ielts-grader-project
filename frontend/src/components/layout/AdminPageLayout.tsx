"use client";

import React from 'react';
import Link from 'next/link';
import { 
  BookOpen, 
  Users, 
  Library, 
  Activity, 
  BarChart, 
  LogOut, 
  ShieldAlert, 
  Loader2, 
  ArrowRight,
  User as UserIcon 
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export function AdminPageLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/');

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
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
  if (user.role !== 'admin') {
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
              {user.role === 'expert' ? 'Chuyên gia (Expert)' : user.role === 'student' ? 'Học viên (Student)' : user.role}
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
          {user.role === 'expert' ? (
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

  // 4. Authorized Admin Portal Layout
  const initials = (user.full_name || user.email || 'AD')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-zinc-100 font-sans flex">
      {/* Red Sidebar */}
      <aside className="w-64 bg-[#932120] text-red-100 flex flex-col h-screen sticky top-0 border-r border-[#7a1a19] shadow-xl">
        <div className="p-6 flex items-center gap-3 border-b border-white/10">
          <div className="bg-white/20 p-1.5 rounded-md flex-shrink-0">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-white tracking-wider text-sm leading-tight">
              PTIT IELTS
            </div>
            <div className="text-[10px] text-red-200 uppercase tracking-widest font-bold mt-0.5">Admin Portal</div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <Link href="/admin/statistics" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${isActive('/admin/statistics') ? 'bg-white/20 text-white font-bold shadow-sm' : 'hover:bg-white/10 hover:text-white text-red-100'}`}>
            <BarChart className={`w-5 h-5 transition-colors ${isActive('/admin/statistics') ? 'text-white' : 'text-red-200 group-hover:text-white'}`} />
            <span className="font-medium text-sm">Thống kê</span>
          </Link>
          <Link href="/admin/topics" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${isActive('/admin/topics') ? 'bg-white/20 text-white font-bold shadow-sm' : 'hover:bg-white/10 hover:text-white text-red-100'}`}>
            <Library className={`w-5 h-5 transition-colors ${isActive('/admin/topics') ? 'text-white' : 'text-red-200 group-hover:text-white'}`} />
            <span className="font-medium text-sm">Quản lý Đề thi</span>
          </Link>
          <Link href="/admin/users" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${isActive('/admin/users') ? 'bg-white/20 text-white font-bold shadow-sm' : 'hover:bg-white/10 hover:text-white text-red-100'}`}>
            <Users className={`w-5 h-5 transition-colors ${isActive('/admin/users') ? 'text-white' : 'text-red-200 group-hover:text-white'}`} />
            <span className="font-medium text-sm">Quản lý Học viên</span>
          </Link>
          <Link href="/admin/logs" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${isActive('/admin/logs') ? 'bg-white/20 text-white font-bold shadow-sm' : 'hover:bg-white/10 hover:text-white text-red-100'}`}>
            <Activity className={`w-5 h-5 transition-colors ${isActive('/admin/logs') ? 'text-white' : 'text-red-200 group-hover:text-white'}`} />
            <span className="font-medium text-sm">Hệ thống Logs</span>
          </Link>
          
          <div className="my-4 border-t border-white/10 pt-4">
            <Link href="/history" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white text-[#932120] hover:bg-zinc-100 transition-colors shadow-sm group">
              <BookOpen className="w-5 h-5 text-[#932120]" />
              <span className="font-bold text-sm">Trải nghiệm Học viên</span>
            </Link>
          </div>
        </nav>

        <div className="p-4 border-t border-white/10">
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 hover:text-white text-red-100 transition-colors group"
          >
            <LogOut className="w-5 h-5 text-red-200 group-hover:text-white" />
            <span className="font-medium text-sm">Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-zinc-200 px-8 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-500">Hệ thống quản trị nền tảng IELTS Writing</h2>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-bold text-zinc-800">{user.full_name || 'Quản trị viên'}</div>
              <div className="text-xs text-zinc-500">{user.email}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#932120]/10 text-[#932120] flex items-center justify-center font-bold border border-[#932120]/20">
              {initials}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
