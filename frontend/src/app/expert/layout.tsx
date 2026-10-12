"use client";

import React from 'react';
import Link from 'next/link';
import { BookOpen, GraduationCap, User as UserIcon, LogOut, ArrowLeft, ShieldAlert, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function ExpertLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#932120]" />
          <span className="text-sm font-medium text-zinc-500">Đang xác thực quyền Chuyên gia...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 text-[#932120]">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900">Yêu cầu đăng nhập Chuyên gia</h1>
        <p className="text-zinc-600 mt-2 max-w-md text-sm">
          Bạn cần đăng nhập bằng tài khoản Chuyên gia (Expert) để truy cập cổng này.
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

  if (user.role !== 'expert' && user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4 text-[#932120] shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900">403 Forbidden - Quyền truy cập bị từ chối</h1>
        <p className="text-zinc-600 mt-2 max-w-md text-sm">
          Khu vực này chỉ dành riêng cho <strong>Chuyên gia IELTS (Expert)</strong>. Tài khoản hiện tại của bạn không có quyền truy cập.
        </p>
        
        <div className="mt-4 p-4 bg-white rounded-xl border border-zinc-200 text-left text-xs space-y-2 w-full max-w-md shadow-sm">
          <div className="flex justify-between items-center py-1 border-b border-zinc-100">
            <span className="text-zinc-500">Email đang đăng nhập:</span>
            <span className="font-semibold text-zinc-900">{user.email}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-zinc-500">Vai trò hiện tại:</span>
            <span className="px-2 py-0.5 rounded font-bold uppercase text-[10px] bg-amber-100 text-amber-800">
              {user.role}
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button 
            onClick={handleLogout}
            className="px-5 py-2.5 bg-[#932120] text-white rounded-lg text-sm font-bold hover:bg-[#7a1a19] transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <LogOut className="w-4 h-4" /> Đăng xuất để đổi tài khoản
          </button>
          <Link 
            href="/history" 
            className="px-5 py-2.5 bg-zinc-200 text-zinc-800 rounded-lg text-sm font-bold hover:bg-zinc-300 transition-colors flex items-center justify-center gap-2"
          >
            Về Cổng Học viên <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const initials = (user.full_name || user.email || 'EX')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-zinc-50 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-[#932120] text-white shadow-md sticky top-0 z-50 border-b border-[#7a1a19]">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-1.5 rounded-md">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="font-bold text-base tracking-wider block leading-tight">
                  CỔNG CHUYÊN GIA CHẤM BÀI
                </span>
                <span className="text-[10px] text-red-200 uppercase tracking-widest font-semibold">
                  IELTS Expert Portal
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-white">{user.full_name || user.email}</div>
                <div className="text-[10px] text-red-200">{user.email}</div>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white border border-white/30">
                {initials}
              </div>
              <button
                onClick={handleLogout}
                className="text-xs font-semibold bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors"
                title="Đăng xuất"
              >
                <LogOut className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Đăng xuất</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex w-full mx-auto sm:px-6 lg:px-8 py-8">
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
