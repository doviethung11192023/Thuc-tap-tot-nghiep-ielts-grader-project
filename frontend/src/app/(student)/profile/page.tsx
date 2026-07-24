import React from 'react';
import { StudentPageLayout } from '@/components/layout/StudentPageLayout';
import { User, Mail, Lock, Camera, Award, BookOpen, Clock } from 'lucide-react';

export default function ProfilePage() {
  return (
    <StudentPageLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Hồ sơ cá nhân</h1>
          <p className="text-zinc-500 mt-1">Quản lý thông tin tài khoản và xem tổng quan thành tích của bạn</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Stats & Avatar */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6 flex flex-col items-center text-center">
              <div className="relative group cursor-pointer mb-4">
                <div className="w-24 h-24 bg-zinc-100 rounded-full border-4 border-white shadow-md flex items-center justify-center text-3xl font-bold text-[#932120]">
                  N
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>
              <h2 className="text-lg font-bold text-zinc-900">Nguyễn Văn A</h2>
              <p className="text-sm text-zinc-500">nva@student.ptit.edu.vn</p>
              
              <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-[#932120]/10 text-[#932120] text-xs font-bold rounded-full">
                <span className="w-2 h-2 rounded-full bg-[#932120]"></span>
                Học viên Active
              </div>
            </div>

            {/* Achievement Summary */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-zinc-200 bg-zinc-50">
                <h3 className="font-bold text-zinc-800 text-sm">Tổng quan Thành tích</h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-zinc-600 text-sm">
                    <Award className="w-4 h-4 text-amber-500" />
                    Overall cao nhất
                  </div>
                  <span className="font-black text-lg text-[#932120]">7.5</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-zinc-600 text-sm">
                    <BookOpen className="w-4 h-4 text-blue-500" />
                    Tổng bài đã viết
                  </div>
                  <span className="font-bold text-zinc-900">12</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-zinc-600 text-sm">
                    <Clock className="w-4 h-4 text-green-500" />
                    Lần nộp gần nhất
                  </div>
                  <span className="font-medium text-xs text-zinc-500">21/07/2026</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Settings Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-zinc-200 bg-zinc-50">
                <h3 className="font-bold text-zinc-800 text-sm">Thông tin cơ bản</h3>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Họ và tên
                  </label>
                  <div className="relative">
                    <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input 
                      type="text" 
                      defaultValue="Nguyễn Văn A"
                      className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120] transition-colors"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Địa chỉ Email
                  </label>
                  <div className="relative">
                    <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input 
                      type="email" 
                      defaultValue="nva@student.ptit.edu.vn"
                      disabled
                      className="w-full pl-10 pr-4 py-2 border border-zinc-200 bg-zinc-100 text-zinc-500 rounded-lg text-sm cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mt-1.5">Email không thể thay đổi do liên kết với tài khoản đăng nhập.</p>
                </div>

                <div className="pt-2">
                  <button className="bg-[#932120] text-white px-5 py-2.5 rounded-lg font-bold shadow-sm hover:bg-[#7a1a19] transition-colors text-sm">
                    Lưu thay đổi
                  </button>
                </div>
              </div>
            </div>

            {/* Change Password */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-zinc-200 bg-zinc-50">
                <h3 className="font-bold text-zinc-800 text-sm">Đổi mật khẩu</h3>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Mật khẩu hiện tại
                  </label>
                  <div className="relative">
                    <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input 
                      type="password" 
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120] transition-colors"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      Mật khẩu mới
                    </label>
                    <div className="relative">
                      <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input 
                        type="password" 
                        placeholder="Mật khẩu mới"
                        className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120] transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      Xác nhận mật khẩu
                    </label>
                    <div className="relative">
                      <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input 
                        type="password" 
                        placeholder="Nhập lại mật khẩu mới"
                        className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120] transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button className="border-2 border-zinc-200 text-zinc-700 px-5 py-2 rounded-lg font-bold hover:bg-zinc-50 hover:border-zinc-300 transition-colors text-sm">
                    Cập nhật mật khẩu
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </StudentPageLayout>
  );
}
