import React from 'react';
import Link from 'next/link';
import { BookOpen, Users, Library, Activity, BarChart, LogOut } from 'lucide-react';

export function AdminPageLayout({ children }: { children: React.ReactNode }) {
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
          <Link href="/admin/statistics" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors group">
            <BarChart className="w-5 h-5 text-red-200 group-hover:text-white transition-colors" />
            <span className="font-medium text-sm">Thống kê</span>
          </Link>
          <Link href="/admin/topics" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors group">
            <Library className="w-5 h-5 text-red-200 group-hover:text-white transition-colors" />
            <span className="font-medium text-sm">Quản lý Đề thi</span>
          </Link>
          <Link href="/admin/users" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors group">
            <Users className="w-5 h-5 text-red-200 group-hover:text-white transition-colors" />
            <span className="font-medium text-sm">Quản lý Học viên</span>
          </Link>
          <Link href="/admin/logs" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors group">
            <Activity className="w-5 h-5 text-red-200 group-hover:text-white transition-colors" />
            <span className="font-medium text-sm">Hệ thống Logs</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-white/10">
          <Link href="/login" className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors group">
            <LogOut className="w-5 h-5 text-red-200 group-hover:text-white" />
            <span className="font-medium text-sm">Đăng xuất</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-zinc-200 px-8 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-500">Hệ thống quản trị nền tảng IELTS Writing</h2>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-bold text-zinc-800">Admin PTIT</div>
              <div className="text-xs text-zinc-500">Super Administrator</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-600 font-bold border border-zinc-200">
              AD
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
