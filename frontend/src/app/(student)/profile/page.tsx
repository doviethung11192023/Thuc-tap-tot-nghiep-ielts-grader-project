"use client";

import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, Camera, Award, BookOpen, Clock, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  
  const [newName, setNewName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Visibility toggles
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [stats, setStats] = useState({
    totalEssays: 0,
    highestOverall: 0,
    latestSubmit: '-'
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Initialize newName when user is loaded
  useEffect(() => {
    if (user) {
      setNewName(user.full_name || '');
      fetchStats(user.id);
    }
  }, [user]);

  async function fetchStats(userId: string) {
    try {
      setLoadingStats(true);
      const { data: essays, error } = await supabase
        .from('essays')
        .select('*, evaluation_results(overall_band)')
        .eq('user_id', userId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      if (!essays || essays.length === 0) {
        setStats({
          totalEssays: 0,
          highestOverall: 0,
          latestSubmit: '-'
        });
        return;
      }

      let maxBand = 0;
      essays.forEach(essay => {
        // Supposing evaluation_results could be an array based on the join, though usually 1:1 or 1:many
        const results = essay.evaluation_results as any;
        if (results) {
          const arr = Array.isArray(results) ? results : [results];
          arr.forEach((r: any) => {
            if (r.overall_band > maxBand) maxBand = r.overall_band;
          });
        }
      });

      const latestDate = new Date(essays[0].submitted_at).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      setStats({
        totalEssays: essays.length,
        highestOverall: maxBand,
        latestSubmit: latestDate
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }

  const handleUpdateName = async () => {
    if (!user) return;
    if (!newName.trim()) {
      toast.error('Vui lòng nhập họ và tên');
      return;
    }
    
    setIsUpdatingName(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ full_name: newName.trim() })
        .eq('id', user.id);

      if (error) throw error;
      toast.success('Cập nhật tên thành công!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Có lỗi xảy ra khi cập nhật tên');
    } finally {
      setIsUpdatingName(false);
    }
  };

  const validatePassword = () => {
    if (!currentPassword) {
      toast.error('Vui lòng nhập mật khẩu hiện tại');
      return false;
    }
    if (!newPassword) {
      toast.error('Vui lòng nhập mật khẩu mới');
      return false;
    }
    if (newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return false;
    }
    if (newPassword === currentPassword) {
      toast.error('Mật khẩu mới không được trùng với mật khẩu cũ');
      return false;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Xác nhận mật khẩu không khớp');
      return false;
    }
    return true;
  };

  const handleUpdatePassword = async () => {
    if (!validatePassword()) return;

    setIsUpdatingPassword(true);
    try {
      // Supabase auth.updateUser only requires new password if session is active
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;
      toast.success('Đổi mật khẩu thành công!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Có lỗi xảy ra khi đổi mật khẩu');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#932120]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500">Vui lòng đăng nhập để xem thông tin</p>
      </div>
    );
  }

  const initial = user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U';

  return (
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
                  {initial}
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </div>
              <h2 className="text-lg font-bold text-zinc-900">{user.full_name || 'Học viên'}</h2>
              <p className="text-sm text-zinc-500">{user.email}</p>
              
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
                {loadingStats ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-zinc-600 text-sm">
                        <Award className="w-4 h-4 text-amber-500" />
                        Overall cao nhất
                      </div>
                      <span className="font-black text-lg text-[#932120]">{stats.highestOverall > 0 ? stats.highestOverall.toFixed(1) : '-'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-zinc-600 text-sm">
                        <BookOpen className="w-4 h-4 text-blue-500" />
                        Tổng bài đã viết
                      </div>
                      <span className="font-bold text-zinc-900">{stats.totalEssays}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-zinc-600 text-sm">
                        <Clock className="w-4 h-4 text-green-500" />
                        Lần nộp gần nhất
                      </div>
                      <span className="font-medium text-xs text-zinc-500">{stats.latestSubmit}</span>
                    </div>
                  </>
                )}
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
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
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
                      value={user.email || ''}
                      disabled
                      className="w-full pl-10 pr-4 py-2 border border-zinc-200 bg-zinc-100 text-zinc-500 rounded-lg text-sm cursor-not-allowed"
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mt-1.5">Email không thể thay đổi do liên kết với tài khoản đăng nhập.</p>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={handleUpdateName}
                    disabled={isUpdatingName}
                    className="bg-[#932120] text-white px-5 py-2.5 rounded-lg font-bold shadow-sm hover:bg-[#7a1a19] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isUpdatingName ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
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
                      type={showCurrent ? "text" : "password"} 
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120] transition-colors"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 focus:outline-none"
                    >
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
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
                        type={showNew ? "text" : "password"}
                        placeholder="Mật khẩu mới"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120] transition-colors"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 focus:outline-none"
                      >
                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      Xác nhận mật khẩu
                    </label>
                    <div className="relative">
                      <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input 
                        type={showConfirm ? "text" : "password"}
                        placeholder="Nhập lại mật khẩu mới"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full pl-10 pr-10 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120] transition-colors"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 focus:outline-none"
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={handleUpdatePassword}
                    disabled={isUpdatingPassword}
                    className="border-2 border-zinc-200 text-zinc-700 px-5 py-2 rounded-lg font-bold hover:bg-zinc-50 hover:border-zinc-300 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isUpdatingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Cập nhật mật khẩu
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
  );
}
