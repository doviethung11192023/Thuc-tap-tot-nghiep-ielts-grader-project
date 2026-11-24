"use client";

import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, Lock } from 'lucide-react';

interface ProfilePasswordFormProps {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  isUpdating: boolean;
  onCurrentChange: (v: string) => void;
  onNewChange: (v: string) => void;
  onConfirmChange: (v: string) => void;
  onSubmit: () => Promise<boolean> | void;
}

export function ProfilePasswordForm({
  currentPassword,
  newPassword,
  confirmPassword,
  isUpdating,
  onCurrentChange,
  onNewChange,
  onConfirmChange,
  onSubmit,
}: ProfilePasswordFormProps) {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onSubmit();
    if (ok) {
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-zinc-200 bg-zinc-50">
        <h3 className="font-bold text-zinc-800 text-sm">Đổi mật khẩu</h3>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        <div>
          <label htmlFor="profile-current-password" className="block text-sm font-medium text-zinc-700 mb-1">
            Mật khẩu hiện tại
          </label>
          <div className="relative">
            <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              id="profile-current-password"
              name="current_password"
              type={showCurrent ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => onCurrentChange(e.target.value)}
              className="w-full pl-10 pr-10 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120] transition-colors"
            />
            <button
              type="button"
              aria-label={showCurrent ? 'Ẩn mật khẩu hiện tại' : 'Hiện mật khẩu hiện tại'}
              onClick={() => setShowCurrent((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 focus:outline-none cursor-pointer"
            >
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="profile-new-password" className="block text-sm font-medium text-zinc-700 mb-1">
              Mật khẩu mới
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                id="profile-new-password"
                name="new_password"
                type={showNew ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Mật khẩu mới"
                value={newPassword}
                onChange={(e) => onNewChange(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120] transition-colors"
              />
              <button
                type="button"
                aria-label={showNew ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 focus:outline-none cursor-pointer"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="profile-confirm-password" className="block text-sm font-medium text-zinc-700 mb-1">
              Xác nhận mật khẩu
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                id="profile-confirm-password"
                name="confirm_password"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPassword}
                onChange={(e) => onConfirmChange(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120] transition-colors"
              />
              <button
                type="button"
                aria-label={showConfirm ? 'Ẩn xác nhận mật khẩu' : 'Hiện xác nhận mật khẩu'}
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 focus:outline-none cursor-pointer"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isUpdating}
            className="border-2 border-zinc-200 text-zinc-700 px-5 py-2 rounded-lg font-bold hover:bg-zinc-50 hover:border-zinc-300 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
          >
            {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>Cập nhật mật khẩu</span>
          </button>
        </div>
      </form>
    </div>
  );
}
